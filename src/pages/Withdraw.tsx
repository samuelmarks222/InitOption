import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bitcoin, Building2, ChevronDown, Gift } from "lucide-react";
import { MpesaIcon } from "@/components/ui/MpesaIcon";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { formatCurrencyAmount } from "@/lib/currency";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { requestMobileMoneyWithdrawal } from "@/lib/mobileMoney";
import { convertUsdToKesWithdrawalAmount, MPESA_METHOD_LABEL } from "@/lib/mobileMoneyShared";
import { requestWithdrawal } from "@/lib/withdrawals";

type CryptoMethod = Tables<"crypto_payment_methods">;
type WithdrawalMethod = "mpesa" | "bank" | "crypto";
type BonusTurnoverStatus = {
  bonusTotal: number;
  completedTurnover: number;
  isLoading: boolean;
  remainingTurnover: number;
  requiredTurnover: number;
};

const BONUS_TURNOVER_MULTIPLIER = 10;

const EMPTY_BONUS_STATUS: BonusTurnoverStatus = {
  bonusTotal: 0,
  completedTurnover: 0,
  isLoading: false,
  remainingTurnover: 0,
  requiredTurnover: 0,
};

const Withdraw = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<WithdrawalMethod>("mpesa");
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [cryptoMethods, setCryptoMethods] = useState<CryptoMethod[]>([]);
  const [selectedCryptoId, setSelectedCryptoId] = useState("");
  const [bonusStatus, setBonusStatus] = useState<BonusTurnoverStatus>(EMPTY_BONUS_STATUS);
  const [withdrawWithoutBonus, setWithdrawWithoutBonus] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchCrypto = async () => {
      const { data, error } = await supabase
        .from("crypto_payment_methods")
        .select("*")
        .eq("status", "active")
        .order("coin_name");

      if (cancelled || error) {
        return;
      }

      const methods = (data ?? []) as CryptoMethod[];
      setCryptoMethods(methods);
      setSelectedCryptoId((current) =>
        current && methods.some((entry) => entry.id === current) ? current : methods[0]?.id ?? "",
      );
    };

    void fetchCrypto();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchBonusStatus = async () => {
      if (!user?.id) {
        setBonusStatus(EMPTY_BONUS_STATUS);
        return;
      }

      setBonusStatus((current) => ({ ...current, isLoading: true }));

      const [depositsResponse, tradesResponse] = await Promise.all([
        supabase
          .from("deposit_requests")
          .select("welcome_bonus,deposit_bonus,promo_bonus")
          .eq("user_id", user.id)
          .eq("status", "approved"),
        supabase
          .from("trades")
          .select("amount")
          .eq("user_id", user.id)
          .in("status", ["won", "lost", "expired"])
          .is("tournament_participant_id", null),
      ]);

      if (cancelled) {
        return;
      }

      if (depositsResponse.error || tradesResponse.error) {
        console.error("Failed to load withdrawal bonus status", depositsResponse.error || tradesResponse.error);
        setBonusStatus(EMPTY_BONUS_STATUS);
        return;
      }

      const bonusTotal = (depositsResponse.data ?? []).reduce(
        (sum, deposit) =>
          sum +
          Number(deposit.welcome_bonus ?? 0) +
          Number(deposit.deposit_bonus ?? 0) +
          Number(deposit.promo_bonus ?? 0),
        0,
      );
      const completedTurnover = (tradesResponse.data ?? []).reduce((sum, trade) => sum + Number(trade.amount ?? 0), 0);
      const requiredTurnover = Math.round(bonusTotal * BONUS_TURNOVER_MULTIPLIER * 100) / 100;

      setBonusStatus({
        bonusTotal,
        completedTurnover,
        isLoading: false,
        remainingTurnover: Math.max(0, requiredTurnover - completedTurnover),
        requiredTurnover,
      });
    };

    void fetchBonusStatus();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const minimumWithdrawalAmount = 10;
  const amountValue = Number(amount) || 0;
  const amountKes = convertUsdToKesWithdrawalAmount(amountValue);
  const selectedCrypto = useMemo(
    () => cryptoMethods.find((crypto) => crypto.id === selectedCryptoId) ?? null,
    [cryptoMethods, selectedCryptoId],
  );

  const availableBalance = getEffectiveLiveBalance(profile);
  const reservedWithdrawalBalance = Number(profile?.reserved_withdrawal_balance ?? 0);
  const hasBonus = bonusStatus.bonusTotal > 0;
  const bonusTurnoverComplete = hasBonus && bonusStatus.remainingTurnover <= 0;
  const bonusBlocksWithdrawal = hasBonus && !bonusTurnoverComplete;
  const effectiveWithdrawalBalance =
    bonusBlocksWithdrawal && withdrawWithoutBonus
      ? Math.max(0, availableBalance - bonusStatus.bonusTotal)
      : availableBalance;
  const bonusProgress =
    bonusStatus.requiredTurnover > 0
      ? Math.min(100, Math.max(0, (bonusStatus.completedTurnover / bonusStatus.requiredTurnover) * 100))
      : 100;
  const destination = method === "mpesa" ? mpesaPhoneNumber.trim() : address.trim();

  useEffect(() => {
    if (!bonusBlocksWithdrawal) {
      setWithdrawWithoutBonus(false);
    }
  }, [bonusBlocksWithdrawal]);

  const handleAmountChange = (value: string) => {
    if (value === "") {
      setAmount("");
      return;
    }

    const nextAmount = Number(value);
    if (!Number.isFinite(nextAmount)) {
      return;
    }

    setAmount(nextAmount);
  };

  const handleWithdraw = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !profile || !amount || Number(amount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    if (amountValue < minimumWithdrawalAmount) {
      toast({
        title: "Withdrawal amount too low",
        description: `Minimum withdrawal is $${minimumWithdrawalAmount.toFixed(2)}.`,
        variant: "destructive",
      });
      return;
    }

    if (method === "crypto" && !selectedCrypto) {
      toast({ title: "Choose a crypto payout method", variant: "destructive" });
      return;
    }

    if (method === "mpesa" && !mpesaPhoneNumber.trim()) {
      toast({ title: "Enter your M-PESA number", variant: "destructive" });
      return;
    }

    if (method !== "mpesa" && !address.trim()) {
      toast({ title: "Please enter withdrawal destination", variant: "destructive" });
      return;
    }

    if (bonusBlocksWithdrawal && !withdrawWithoutBonus) {
      toast({
        title: "Bonus turnover is still active",
        description: "Complete the turnover first, or choose Withdraw without bonus to remove the bonus and continue.",
        variant: "destructive",
      });
      return;
    }

    if (amountValue > effectiveWithdrawalBalance) {
      toast({
        title: "Insufficient funds",
        description:
          bonusBlocksWithdrawal && withdrawWithoutBonus
            ? `After removing the active bonus, you can withdraw up to $${effectiveWithdrawalBalance.toFixed(2)}.`
            : `Your balance is $${availableBalance.toFixed(2)}.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const withdrawalMethod =
      method === "mpesa"
        ? MPESA_METHOD_LABEL
        : method === "crypto"
          ? `${selectedCrypto?.symbol.toUpperCase()} (${selectedCrypto?.network.toUpperCase()}) Wallet`
          : "Bank Transfer";

    try {
      if (method === "mpesa") {
        const payoutResponse = await requestMobileMoneyWithdrawal({
          amount: amountValue,
          forfeitBonus: withdrawWithoutBonus,
          phoneNumber: mpesaPhoneNumber,
        });

        await refreshProfile();
        if (withdrawWithoutBonus) {
          setBonusStatus(EMPTY_BONUS_STATUS);
          setWithdrawWithoutBonus(false);
        }
        setAmount("");
        toast({
          title:
            payoutResponse.status === "pending"
              ? "Withdrawal awaiting approval"
              : payoutResponse.status === "approved"
                ? "Withdrawal ready for finance payout"
                : "Withdrawal request received",
          description:
            payoutResponse.detail ||
            (payoutResponse.status === "pending"
              ? `${formatCurrencyAmount(payoutResponse.amount_kes, "KES")} is reserved for ${payoutResponse.masked_phone_number} until approval.`
              : `${formatCurrencyAmount(payoutResponse.amount_kes, "KES")} is reserved for ${payoutResponse.masked_phone_number} while finance sends it manually.`),
        });
        return;
      }

      const withdrawalResponse = await requestWithdrawal({
        amount: amountValue,
        destination,
        forfeitBonus: withdrawWithoutBonus,
        method: withdrawalMethod,
      });

      await refreshProfile();
      if (withdrawWithoutBonus) {
        setBonusStatus(EMPTY_BONUS_STATUS);
        setWithdrawWithoutBonus(false);
      }
      setAmount("");
      setAddress("");
      toast({
        title: "Withdrawal submitted",
        description:
          Number(withdrawalResponse.forfeited_bonus_amount ?? 0) > 0
            ? `$${amountValue.toFixed(2)} is now being prepared. Active bonus of $${Number(withdrawalResponse.forfeited_bonus_amount).toFixed(2)} was removed.`
            : `$${amountValue.toFixed(2)} is now being prepared.`,
      });
    } catch (error: unknown) {
      toast({
        title: "Withdrawal failed",
        description: error instanceof Error ? error.message : "Something went wrong while submitting the withdrawal.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#171f2b] text-white">
      <div className="border-b border-white/10 bg-[#192230]/92">
        <div className="mx-auto flex min-h-[68px] w-full max-w-[1360px] items-center justify-between gap-4 px-5 sm:px-8">
          <SiteLogo to="/" variant="dark" imageClassName="h-9 sm:h-10" />
          <Link to="/trade" className="flex shrink-0 items-center gap-2 text-sm text-white/90 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Trading
          </Link>
        </div>
      </div>

      <form onSubmit={handleWithdraw} className="mx-auto grid w-full max-w-[900px] gap-10 px-5 py-10 sm:px-6 md:grid-cols-[minmax(0,466px)_368px] md:items-start md:py-14">
        <main className="min-w-0">
          <h1 className="text-[34px] font-bold leading-tight text-white sm:text-[38px]">Withdraw Funds</h1>
          <p className="mt-3 text-base leading-6 text-white/62">Withdraw funds for the application and, withdraw funds.</p>

          <section className="mt-11">
            <div className="text-lg font-bold text-white">Select Withdrawal Method</div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setMethod("mpesa")}
                className={`flex min-h-[96px] flex-col items-center justify-center rounded-lg border bg-white px-4 text-center text-[#111827] shadow-[0_12px_22px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 ${
                  method === "mpesa" ? "border-[#1ec677] ring-2 ring-[#1ec677]/45" : "border-white/70"
                }`}
              >
                <MpesaIcon className="h-8 w-[92px]" />
                <span className="mt-2 text-base font-bold">Mobile Money</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod("bank")}
                className={`flex min-h-[96px] flex-col items-center justify-center rounded-lg border bg-white px-4 text-center text-[#111827] shadow-[0_12px_22px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 ${
                  method === "bank" ? "border-[#2f82ff] ring-2 ring-[#2f82ff]/35" : "border-white/70"
                }`}
              >
                <Building2 className="h-9 w-9 text-[#475569]" />
                <span className="mt-2 text-base font-bold">Bank Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod("crypto")}
                className={`flex min-h-[96px] flex-col items-center justify-center rounded-lg border bg-white px-4 text-center text-[#111827] shadow-[0_12px_22px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 ${
                  method === "crypto" ? "border-[#f1a526] ring-2 ring-[#f1a526]/35" : "border-white/70"
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ee9f26] text-white">
                  <Bitcoin className="h-6 w-6" />
                </span>
                <span className="mt-2 text-base font-bold">Cryptocurrency</span>
              </button>
            </div>
          </section>

          <section className="mt-10">
            <label className="text-lg font-bold text-white">Enter Amount (USD)</label>
            <div className="mt-3 flex min-h-[48px] overflow-hidden rounded-lg bg-white shadow-[0_14px_28px_rgba(0,0,0,0.12)]">
              <input
                type="number"
                step="1"
                value={amount}
                onChange={(event) => handleAmountChange(event.target.value)}
                placeholder=""
                className="min-w-0 flex-1 bg-transparent px-4 text-base font-semibold text-[#111827] outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setAmount(Number(effectiveWithdrawalBalance.toFixed(2)))}
                className="m-2 rounded-md bg-[#eef0f4] px-3 text-sm font-bold text-[#111827] transition hover:bg-[#e2e5eb]"
              >
                MAX
              </button>
            </div>
            <p className="mt-3 text-sm text-white/68">
              Available balance: <span className="font-bold text-white">{effectiveWithdrawalBalance.toFixed(2)} USD</span>
            </p>
            {reservedWithdrawalBalance > 0 ? (
              <p className="mt-1 text-xs text-white/52">${reservedWithdrawalBalance.toFixed(2)} is reserved for pending M-PESA withdrawals.</p>
            ) : null}
          </section>

          <section className="mt-10">
            <label className="text-lg font-bold text-white">Select Account/Address</label>
            {method === "mpesa" ? (
              <div className="mt-3 flex min-h-[48px] overflow-hidden rounded-lg bg-white text-[#111827] shadow-[0_14px_28px_rgba(0,0,0,0.12)]">
                <div className="flex shrink-0 items-center border-r border-slate-200 px-4 text-lg text-[#424854]">M-PESA</div>
                <input
                  type="tel"
                  value={mpesaPhoneNumber}
                  onChange={(event) => setMpesaPhoneNumber(event.target.value)}
                  placeholder="Select Account/Address"
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-[#7b7f87]"
                />
              </div>
            ) : (
              <div className="mt-3 flex min-h-[48px] overflow-hidden rounded-lg bg-white text-[#111827] shadow-[0_14px_28px_rgba(0,0,0,0.12)]">
                <div className="flex shrink-0 items-center border-r border-slate-200 px-4 text-lg text-[#424854]">
                  {method === "bank" ? "BANK" : selectedCrypto?.symbol.toUpperCase() ?? "CRYPTO"}
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder={method === "bank" ? "Enter bank account details" : "Enter wallet address"}
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-[#7b7f87]"
                />
              </div>
            )}

            {method === "crypto" ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/7 p-3">
                {cryptoMethods.length === 0 ? (
                  <div className="text-sm text-white/72">Cryptocurrency withdrawals are temporarily unavailable right now.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {cryptoMethods.map((crypto) => (
                      <button
                        key={crypto.id}
                        type="button"
                        onClick={() => setSelectedCryptoId(crypto.id)}
                        className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                          selectedCryptoId === crypto.id
                            ? "border-[#f1a526] bg-[#f1a526]/18 text-white"
                            : "border-white/12 bg-white/8 text-white/82 hover:border-white/28"
                        }`}
                      >
                        <span className="block truncate font-bold">{crypto.symbol.toUpperCase()}</span>
                        <span className="block truncate text-[11px] uppercase text-white/56">{crypto.network}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </section>
        </main>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-lg bg-white p-5 text-[#0f1117] shadow-[0_16px_34px_rgba(0,0,0,0.16)]">
            <h2 className="text-lg font-bold">Payout Summary</h2>
            <div className="mt-5 space-y-3 text-base">
              <div className="flex items-center justify-between gap-4">
                <span>Requested Amount:</span>
                <span className="font-bold">{amountValue.toFixed(2)} $</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Estimated Fees:</span>
                <span className="font-bold">0.00 $</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Estimated Payout in KES:</span>
                <span className="font-bold">{method === "mpesa" ? formatCurrencyAmount(amountKes, "KES") : "0.00 KES"}</span>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-2xl font-bold">Total Payout:</span>
                <span className="text-2xl font-bold">{amountValue.toFixed(2)} $</span>
              </div>
            </div>
          </section>

          <section className="rounded-lg bg-white p-4 text-[#0f1117] shadow-[0_16px_34px_rgba(0,0,0,0.16)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Bonus Turnover Status</h2>
              <ChevronDown className="h-5 w-5 rotate-180" />
            </div>
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              <span>Requested Amount: {amountValue.toFixed(2)} $</span>
              <span>Estimated Fees: 0.00 $</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e7e9ef]">
              <div className="h-full rounded-full bg-[#2f72f6]" style={{ width: `${bonusProgress}%` }} />
            </div>

            {hasBonus ? (
              <div className="mt-4 space-y-3 text-xs leading-5 text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 font-bold text-slate-800">
                    <Gift className="h-4 w-4 text-[#f1a526]" />
                    {bonusTurnoverComplete ? "Turnover complete" : "Turnover active"}
                  </span>
                  <span>{bonusStatus.isLoading ? "Checking..." : `${bonusProgress.toFixed(0)}%`}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
                  <div>Active bonus: <strong>${bonusStatus.bonusTotal.toFixed(2)}</strong></div>
                  <div>Required volume: <strong>${bonusStatus.requiredTurnover.toFixed(2)}</strong></div>
                  <div>Remaining: <strong>${bonusStatus.remainingTurnover.toFixed(2)}</strong></div>
                </div>
                {bonusBlocksWithdrawal ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-slate-700">
                    <input
                      type="checkbox"
                      checked={withdrawWithoutBonus}
                      onChange={(event) => setWithdrawWithoutBonus(event.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#2f72f6]"
                    />
                    <span>
                      Withdraw without bonus. Your max withdrawable balance becomes{" "}
                      <strong>${Math.max(0, availableBalance - bonusStatus.bonusTotal).toFixed(2)}</strong>.
                    </span>
                  </label>
                ) : null}
              </div>
            ) : null}
          </section>

          <Button
            type="submit"
            disabled={
              loading ||
              !amount ||
              amountValue < minimumWithdrawalAmount ||
              (bonusBlocksWithdrawal && !withdrawWithoutBonus) ||
              amountValue > effectiveWithdrawalBalance ||
              (method === "mpesa" ? !mpesaPhoneNumber.trim() : !address.trim()) ||
              (method === "crypto" && !selectedCrypto)
            }
            className="h-12 w-full rounded-lg bg-[#2f72f6] text-lg font-bold text-white shadow-[0_18px_36px_rgba(47,114,246,0.35)] transition hover:bg-[#3980ff] disabled:cursor-not-allowed disabled:bg-[#2f72f6] disabled:text-white/85 disabled:opacity-100"
          >
            {loading ? (method === "mpesa" ? "Sending payout..." : "Submitting withdrawal...") : method === "mpesa" ? "Withdraw to M-PESA" : "Submit Withdrawal"}
          </Button>

          <p className="mx-auto max-w-[320px] text-center text-xs leading-5 text-white/62">
            <Link to="/terms" className="underline underline-offset-2 hover:text-white">Terms and Conditions</Link> are priority considerations to terms and condition-in matterity.
          </p>
        </aside>
      </form>
    </div>
  );
};

export default Withdraw;
