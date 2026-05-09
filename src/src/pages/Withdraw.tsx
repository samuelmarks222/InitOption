import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bitcoin, Building2, Minus, Plus } from "lucide-react";
import { MpesaIcon } from "@/components/ui/MpesaIcon";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { formatCurrencyAmount } from "@/lib/currency";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { requestMobileMoneyWithdrawal } from "@/lib/mobileMoney";
import { convertUsdToKesAmount, MPESA_METHOD_LABEL } from "@/lib/mobileMoneyShared";
import { requestWithdrawal } from "@/lib/withdrawals";

type CryptoMethod = Tables<"crypto_payment_methods">;
type WithdrawalMethod = "mpesa" | "bank" | "crypto";

const Withdraw = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<WithdrawalMethod>("mpesa");
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [cryptoMethods, setCryptoMethods] = useState<CryptoMethod[]>([]);
  const [selectedCryptoId, setSelectedCryptoId] = useState("");

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

  const minimumWithdrawalAmount = 10;
  const amountValue = Number(amount) || 0;
  const amountKes = convertUsdToKesAmount(amountValue);
  const selectedCrypto = useMemo(
    () => cryptoMethods.find((crypto) => crypto.id === selectedCryptoId) ?? null,
    [cryptoMethods, selectedCryptoId],
  );

  const availableBalance = getEffectiveLiveBalance(profile);
  const reservedWithdrawalBalance = Number(profile?.reserved_withdrawal_balance ?? 0);
  const destination = method === "mpesa" ? mpesaPhoneNumber.trim() : address.trim();

  const methodCopy =
    method === "mpesa"
      ? "Choose M-PESA, enter the amount and phone number, then submit the payout request for finance review and manual sending."
      : method === "bank"
        ? "Choose bank transfer, enter the amount and destination details, then submit your request."
        : !selectedCrypto
          ? "Choose cryptocurrency, enter the amount, then select the payout coin and wallet address."
          : "Choose cryptocurrency, enter the amount, confirm the payout coin, and provide the destination wallet address.";

  const handleAdjustAmount = (direction: -1 | 1) => {
    const stepAmount = amountValue >= 300 ? 50 : amountValue >= 150 ? 25 : 10;
    const baseAmount = amountValue > 0 ? amountValue : minimumWithdrawalAmount;
    const nextAmount = Math.max(minimumWithdrawalAmount, baseAmount + stepAmount * direction);
    setAmount(nextAmount);
  };

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

    if (amountValue > availableBalance) {
      toast({
        title: "Insufficient funds",
        description: `Your balance is $${availableBalance.toFixed(2)}.`,
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
          phoneNumber: mpesaPhoneNumber,
        });

        await refreshProfile();
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

      await requestWithdrawal({
        amount: amountValue,
        destination,
        method: withdrawalMethod,
      });

      await refreshProfile();
      setAmount("");
      setAddress("");
      toast({
        title: "Withdrawal submitted",
        description: `$${amountValue.toFixed(2)} is now being prepared.`,
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
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,#1e2330_0%,#1e2330_42%,#1c1f2d_100%)] p-3 text-white sm:p-4 md:p-8">
      <div className="mx-auto mt-4 w-full max-w-[1220px] space-y-5 sm:mt-6 sm:space-y-6 md:mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <SiteLogo to="/" subtitle="Payout access" />
          <Link to="/trade" className="flex w-fit items-center gap-2 text-[#9ab7c9] transition-colors hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            Back to Trading
          </Link>
        </div>

        <Card className="overflow-hidden border border-[#1e2330] bg-[#1c1f2d] shadow-[0_24px_80px_rgba(0,0,0,0.36)]">
          <CardHeader className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(30,35,48,0.96)_0%,rgba(28,31,45,0.98)_100%)] px-4 py-5 sm:px-5 sm:py-6 md:px-8">
            <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#8eb3bf]">Payout desk</div>
            <CardTitle className="mt-2 text-2xl text-white sm:text-3xl md:text-4xl">Withdraw Funds</CardTitle>
            <CardDescription className="mt-2 max-w-[780px] text-sm leading-6 text-[#9dc2c8]">
              Choose the payout method, enter the amount, confirm the destination details, and submit your request.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-4 py-5 sm:px-5 sm:py-6 md:px-8 md:py-8">
            <form onSubmit={handleWithdraw} className="grid gap-6 xl:grid-cols-[340px,minmax(0,1fr)]">
              <div className="space-y-6">
                <div className="rounded-[22px] border border-[#1e2330] bg-[#1e2330] p-5 text-sm leading-6 text-slate-200">
                  {methodCopy}
                </div>

                <div className="rounded-[22px] border border-white/8 bg-[#1e2330] p-5">
                  <label className="text-[12px] font-black uppercase tracking-[0.18em] text-[#8eb3bf]">Select withdrawal method</label>
                  <div className="mt-4 grid gap-3">
                    <button
                      type="button"
                      onClick={() => setMethod("mpesa")}
                      className={`flex flex-col items-start gap-3 rounded-[18px] border p-4 text-left transition sm:flex-row sm:items-center sm:gap-4 ${
                        method === "mpesa"
                          ? "border-[#0fa053]/60 bg-[#1e2330] shadow-[0_12px_26px_rgba(15,160,83,0.2)]"
                          : "border-white/10 bg-[#1e2330] hover:border-white/20"
                      }`}
                    >
                      <MpesaIcon className="h-9 w-[84px] shrink-0 sm:h-10 sm:w-[92px]" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold leading-tight text-white sm:text-[15px]">M-PESA Mobile Money</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#9dc2c8]">Send to phone number</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMethod("bank")}
                      className={`flex flex-col items-start gap-3 rounded-[18px] border p-4 text-left transition sm:flex-row sm:items-center sm:gap-4 ${
                        method === "bank"
                          ? "border-[#1e2330] bg-[#1e2330] shadow-[0_12px_26px_rgba(35,110,223,0.16)]"
                          : "border-white/10 bg-[#1e2330] hover:border-white/20"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1e2330] text-slate-200">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold leading-tight text-white sm:text-[15px]">Bank Transfer</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#9dc2c8]">Send to account details</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMethod("crypto")}
                      className={`flex flex-col items-start gap-3 rounded-[18px] border p-4 text-left transition sm:flex-row sm:items-center sm:gap-4 ${
                        method === "crypto"
                          ? "border-[#f5a524]/60 bg-[#3b2a0f] shadow-[0_12px_26px_rgba(245,165,36,0.12)]"
                          : "border-white/10 bg-[#1e2330] hover:border-white/20"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1e2330] text-slate-200">
                        <Bitcoin className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold leading-tight text-white sm:text-[15px]">Cryptocurrency</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#9dc2c8]">Send to wallet address</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-[#1e2330] p-5">
                  <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#8eb3bf]">Account snapshot</div>
                  <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-sm text-[#9dc2c8]">Available Balance</div>
                      <div className="mt-2 break-all text-3xl font-bold text-white">${availableBalance.toFixed(2)}</div>
                      {reservedWithdrawalBalance > 0 ? (
                        <div className="mt-2 text-xs text-[#9dc2c8]">
                          ${reservedWithdrawalBalance.toFixed(2)} currently reserved for pending M-PESA withdrawals.
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-full bg-[#0fa053]/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0fa053]">
                      Live account
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-[#1e2330] p-5 text-sm leading-6 text-[#cde3ea]">
                  Minimum withdrawal is $10.00. M-PESA withdrawals stay reserved until finance approves and completes the manual payout, or rejects the request.
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-white">Amount (USD)</label>
                  <div className="rounded-[22px] border border-border bg-[#1e2330] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.18)]">
                    <div className="flex flex-col gap-4 rounded-[16px] bg-[#1e2330] p-4 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="shrink-0 text-[18px] font-black text-[#0fa053] sm:text-[22px]">USD</span>
                        <input
                          type="number"
                          step="1"
                          value={amount}
                          onChange={(event) => handleAmountChange(event.target.value)}
                          placeholder={`Enter amount (Min $${minimumWithdrawalAmount})`}
                          className="min-w-0 w-full bg-transparent text-[22px] font-bold text-white outline-none placeholder:text-slate-500 sm:text-[26px]"
                        />
                      </div>

                      <div className="min-w-0 text-left lg:min-w-[124px] lg:text-right">
                        <div className="text-sm font-bold text-[#0fa053]">
                          {method === "mpesa" ? formatCurrencyAmount(amountKes, "KES") : `${amountValue.toFixed(2)} $`}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-[#a7bdd9]">
                          {method === "mpesa" ? "Estimated payout" : "Requested payout"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start lg:self-auto">
                        <button
                          type="button"
                          onClick={() => handleAdjustAmount(-1)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustAmount(1)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 rounded-[16px] bg-[#1e2330] px-4 py-3 text-sm text-[#a7bdd9] sm:flex-row sm:items-center sm:justify-between">
                      <span>Available balance</span>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="break-all font-semibold text-white">${availableBalance.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => setAmount(Number(availableBalance.toFixed(2)))}
                          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/15"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {method === "crypto" && (
                  <div className="rounded-[22px] border border-white/8 bg-[#1e2330] p-5">
                    <div className="text-sm font-semibold text-white">Select withdrawal cryptocurrency</div>
                    {cryptoMethods.length === 0 ? (
                      <div className="mt-4 rounded-[16px] border border-[#1e2330] bg-[#1e2330] px-4 py-4 text-sm text-slate-200">
                        Cryptocurrency withdrawals are temporarily unavailable right now.
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {cryptoMethods.map((crypto) => (
                          <button
                            key={crypto.id}
                            type="button"
                            onClick={() => setSelectedCryptoId(crypto.id)}
                            className={`flex items-center gap-3 rounded-[16px] border px-4 py-4 text-left transition ${
                              selectedCryptoId === crypto.id
                                ? "border-[#f5a524]/60 bg-[#3b2a0f] text-white shadow-[0_12px_24px_rgba(245,165,36,0.12)]"
                                : "border-white/10 bg-[#1e2330] text-white hover:border-white/20"
                            }`}
                          >
                            <img
                              src={`https://assets.coincap.io/assets/icons/${crypto.symbol.toLowerCase().replace("usdt", "tether")}@2x.png`}
                              className="h-7 w-7 rounded-full bg-white p-[1px]"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                              alt=""
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold">{crypto.symbol.toUpperCase()}</div>
                              <div className="truncate text-[10px] uppercase tracking-[0.14em] text-[#9dc2c8]">
                                {crypto.network}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {method === "mpesa" ? (
                  <div className="rounded-[22px] border border-white/8 bg-[#1e2330] p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <MpesaIcon className="h-8 w-[74px] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">M-PESA number</div>
                        <div className="text-xs text-[#9dc2c8]">Enter the phone number that should receive this payout.</div>
                      </div>
                    </div>
                    <input
                      type="tel"
                      value={mpesaPhoneNumber}
                      onChange={(event) => setMpesaPhoneNumber(event.target.value)}
                      placeholder="e.g. 0712345678 or 254712345678"
                      className="mt-4 w-full rounded-[16px] border border-white/10 bg-[#1e2330] px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-[#0fa053]/60"
                    />
                    <div className="mt-4 rounded-[16px] border border-white/8 bg-[#1e2330] p-4">
                      <div className="flex flex-col gap-2 text-sm text-[#9dc2c8] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <span>Estimated M-PESA payout</span>
                        <span className="break-all font-semibold text-white">{formatCurrencyAmount(amountKes, "KES")}</span>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-[#9dc2c8]">
                        The payout is sent to this number in the KES equivalent of the USD amount entered above.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-white/8 bg-[#1e2330] p-5">
                    <div className="text-sm font-semibold text-white">
                      {method === "bank" ? "Bank destination" : "Wallet destination"}
                    </div>
                    <div className="mt-1 text-xs text-[#9dc2c8]">
                      {method === "bank"
                        ? "Enter the account details that should receive the transfer."
                        : "Enter the wallet address that should receive the payout."}
                    </div>
                    <input
                      type="text"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder={method === "bank" ? "Enter bank account details" : "Enter wallet address"}
                      className="mt-4 w-full rounded-[16px] border border-white/10 bg-[#1e2330] px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-[#0fa053]/60"
                    />
                  </div>
                )}

                <div className="rounded-[22px] border border-white/8 bg-[#1e2330] px-5 py-4">
                  <div className="text-sm font-medium text-white">Payout summary</div>
                  <div className="text-xs text-[#9dc2c8]">
                    {method === "mpesa"
                      ? `${amountValue.toFixed(2)} $ requested, approximately ${formatCurrencyAmount(amountKes, "KES")} to M-PESA`
                      : `${amountValue.toFixed(2)} $ requested to the selected destination`}
                  </div>
                  <div className="mt-3 text-2xl font-bold text-white">{amountValue.toFixed(2)} $</div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-[#1e2330] p-5">
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      !amount ||
                      amountValue < minimumWithdrawalAmount ||
                      (method === "mpesa" ? !mpesaPhoneNumber.trim() : !address.trim()) ||
                      (method === "crypto" && !selectedCrypto)
                    }
                    className="w-full px-4 py-5 text-base gradient-primary sm:py-6 sm:text-lg"
                  >
                    {loading
                      ? method === "mpesa"
                        ? "Sending payout..."
                        : "Submitting withdrawal..."
                      : method === "mpesa"
                        ? "Withdraw to M-PESA"
                        : "Submit Withdrawal"}
                  </Button>
                  <p className="mt-4 text-center text-xs leading-5 text-[#9dc2c8]">
                    {method === "mpesa"
                      ? "Make sure the M-PESA number is correct before you continue."
                      : "Make sure the destination details are correct before you continue."}
                  </p>
                  <p className="mt-2 text-center text-xs leading-5 text-[#9dc2c8]">
                    If your account has active bonus conditions, required turnover must be completed before withdrawal.
                  </p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Withdraw;
