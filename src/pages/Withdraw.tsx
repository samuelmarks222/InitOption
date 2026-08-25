import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/integrations/api/client";
import { Tables } from "@/integrations/supabase/types";
import { ArrowRight, ChevronDown, ChevronRight, Lock, ShieldAlert, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { requestMobileMoneyWithdrawal } from "@/lib/mobileMoney";
import { MPESA_METHOD_LABEL } from "@/lib/mobileMoneyShared";
import { requestWithdrawal, requestCryptoWithdrawal } from "@/lib/withdrawals";

type CryptoMethod = Tables<"crypto_payment_methods">;
type DepositRecord = Tables<"deposit_requests">;

export interface EligibleWithdrawalMethod {
  id: string;
  label: string;
  methodType: "mpesa" | "crypto";
  symbol?: string;
  network?: string;
}

const FAQ_ITEMS = [
  {
    question: "How to withdraw money from the account?",
    answer:
      "To withdraw money, specify the withdrawal amount and select one of your previously used deposit methods. Enter the required payout destination details and click Confirm.",
  },
  {
    question: "How long does it take to withdraw funds?",
    answer:
      "Withdrawal requests are processed promptly by our finance team. Automated mobile money (M-Pesa) and crypto payouts typically complete within 15 to 60 minutes.",
  },
  {
    question: "What is the minimum withdrawal amount?",
    answer: "The minimum withdrawal amount is $10.00 (or equivalent in your currency).",
  },
  {
    question: "Is there any fee for depositing or withdrawing funds from the account?",
    answer: "No, our platform charges zero commission or fees for deposits and withdrawals.",
  },
  {
    question: "Do I need to provide any documents to make a withdrawal?",
    answer: "Standard withdrawals do not require extra documents unless security verification is triggered by your account level.",
  },
  {
    question: "What is account verification?",
    answer: "Account verification ensures security and prevents unauthorized transactions by confirming user identity.",
  },
  {
    question: "How to understand that I need to go through account verification?",
    answer: "You will receive a notification in your dashboard if account verification documents are required.",
  },
  {
    question: "How long does the verification process take?",
    answer: "Identity verification is typically completed within 1 to 2 hours of submitting your documents.",
  },
  {
    question: "How do I know that I successfully passed verification?",
    answer: "A green Verified badge will appear on your account profile once verification is complete.",
  },
];

const Withdraw = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { formatMoney } = useCurrency();
  const navigate = useNavigate();

  const [amount, setAmount] = useState<string>("10");
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState(() => profile?.full_name?.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(() => profile?.full_name?.split(" ").slice(1).join(" ") ?? "");
  const [bankName, setBankName] = useState("SAFARICOM");
  const [phone, setPhone] = useState(() => profile?.phone_number ?? "");
  const [walletAddress, setWalletAddress] = useState("");
  const [cryptoMemo, setCryptoMemo] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [userDeposits, setUserDeposits] = useState<DepositRecord[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<Tables<"withdrawals">[]>([]);
  const [cryptoMethods, setCryptoMethods] = useState<CryptoMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");

  // Effective live balance
  const liveBalance = getEffectiveLiveBalance(profile);

  // ── Load user's deposit history to determine eligible withdrawal methods ──
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const loadUserData = async () => {
      const [depositsRes, withdrawalsRes, cryptoRes] = await Promise.all([
        api.from("deposit_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        api.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        api.from("crypto_payment_methods").select("*").eq("status", "active").order("coin_name"),
      ]);

      if (cancelled) return;

      if (depositsRes.data) {
        setUserDeposits(depositsRes.data);
      }
      if (withdrawalsRes.data) {
        setUserWithdrawals(withdrawalsRes.data);
      }
      if (cryptoRes.data) {
        setCryptoMethods(cryptoRes.data);
      }
    };

    void loadUserData();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Derive eligible withdrawal methods strictly from previous deposit history
  const eligibleMethods = useMemo<EligibleWithdrawalMethod[]>(() => {
    const map = new Map<string, EligibleWithdrawalMethod>();

    // Scan user's deposits (approved, pending, or completed)
    userDeposits.forEach((dep) => {
      const methodStr = (dep.method || "").toUpperCase();
      if (methodStr.includes("MPESA") || methodStr.includes("M-PESA") || methodStr.includes("MOBILE MONEY")) {
        map.set("mpesa", { id: "mpesa", label: "M-Pesa", methodType: "mpesa" });
      } else if (methodStr.includes("AIRTEL")) {
        map.set("airtel", { id: "airtel", label: "Airtel Money", methodType: "mpesa" });
      } else if (methodStr.includes("CRYPTO") || methodStr.includes("USDT") || methodStr.includes("BTC") || methodStr.includes("ETH")) {
        const cleanLabel = dep.method ? dep.method.replace(/^CRYPTO\s*/i, "") : "Cryptocurrency";
        const id = `crypto:${cleanLabel}`;
        map.set(id, { id, label: cleanLabel, methodType: "crypto", symbol: cleanLabel.split(" ")[0] });
      }
    });

    // Fallback if user has no deposit history yet
    if (map.size === 0) {
      return [
        { id: "mpesa", label: "M-Pesa", methodType: "mpesa" },
        { id: "crypto:USDT (TRC-20)", label: "USDT (TRC-20)", methodType: "crypto", symbol: "USDT" },
      ];
    }

    return Array.from(map.values());
  }, [userDeposits]);

  // Set default selected method
  useEffect(() => {
    if (eligibleMethods.length > 0 && !selectedMethodId) {
      setSelectedMethodId(eligibleMethods[0].id);
    }
  }, [eligibleMethods, selectedMethodId]);

  const selectedEligibleMethod = useMemo(
    () => eligibleMethods.find((m) => m.id === selectedMethodId) ?? eligibleMethods[0],
    [eligibleMethods, selectedMethodId],
  );

  const hasDepositHistory = userDeposits.length > 0;

  const handleConfirmWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 10) {
      toast({ title: "Minimum withdrawal is $10.00", variant: "destructive" });
      return;
    }

    if (amountNum > liveBalance) {
      toast({ title: "Insufficient funds in your account balance", variant: "destructive" });
      return;
    }

    if (selectedEligibleMethod?.methodType === "mpesa") {
      if (!phone.trim()) {
        toast({ title: "Please enter your M-Pesa phone number", variant: "destructive" });
        return;
      }
    } else {
      if (!walletAddress.trim()) {
        toast({ title: "Please enter your wallet address", variant: "destructive" });
        return;
      }
    }

    setLoading(true);

    try {
      if (selectedEligibleMethod?.methodType === "mpesa") {
        const res = await requestMobileMoneyWithdrawal({
          amount: amountNum,
          phoneNumber: phone.trim(),
        });
        await refreshProfile();
        toast({
          title: "Withdrawal request submitted! 📲",
          description: `Your payout of $${amountNum.toFixed(2)} (${res.amount_kes} KES) to ${res.masked_phone_number} is pending.`,
        });
      } else {
        const matchingCrypto = cryptoMethods.find(
          (c) => c.symbol.toUpperCase() === (selectedEligibleMethod?.symbol || "USDT").toUpperCase(),
        ) ?? cryptoMethods[0];

        await requestCryptoWithdrawal({
          amount: amountNum,
          destination: walletAddress.trim(),
          cryptoCurrency: matchingCrypto?.symbol || "USDT",
          cryptoNetwork: matchingCrypto?.network || "TRC-20",
          cryptoMemo: cryptoMemo.trim() || undefined,
        });
        await refreshProfile();
        toast({
          title: "Crypto withdrawal submitted! 🪙",
          description: `Your payout of $${amountNum.toFixed(2)} to ${walletAddress.slice(0, 10)}... is pending.`,
        });
      }

      setAmount("10");
    } catch (err) {
      toast({
        title: "Withdrawal request failed",
        description: err instanceof Error ? err.message : "An error occurred while submitting your withdrawal request.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#161c28] text-white font-sans">
      {/* Top Header Navigation Tabs Sub-Bar */}
      <div className="border-b border-[#263043] bg-[#1a2130]">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold">
            <Link
              to="/withdraw"
              className="border-b-2 border-[#0084FF] bg-[#222b3d] px-4 py-3 text-white transition"
            >
              Withdrawal
            </Link>
            <Link to="/trade" className="px-4 py-3 text-gray-400 hover:text-white transition">
              Payments
            </Link>
            <Link to="/trade" className="px-4 py-3 text-gray-400 hover:text-white transition">
              Trades
            </Link>
            <Link to="/trade" className="px-4 py-3 text-gray-400 hover:text-white transition">
              My Account
            </Link>
            <Link to="/trade" className="px-4 py-3 text-gray-400 hover:text-white transition">
              Market
            </Link>
            <Link to="/trade" className="px-4 py-3 text-gray-400 hover:text-white transition">
              Tournaments
            </Link>
            <Link to="/trade" className="px-4 py-3 text-gray-400 hover:text-white transition">
              Analytics
            </Link>
          </div>

          <button
            onClick={() => navigate("/trade")}
            className="text-xs font-bold text-gray-400 hover:text-white transition"
          >
            Back to Trade ✕
          </button>
        </div>
      </div>

      {/* Main 3-Column Content Layout */}
      <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
        {!hasDepositHistory && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-200">
            <Lock className="h-5 w-5 shrink-0 text-amber-400" />
            <span>
              <strong>Deposit History Notice:</strong> Payout methods are restricted to payment channels you have previously used for deposits. Please make a deposit first to unlock additional withdrawal options.
            </span>
          </div>
        )}

        <form onSubmit={handleConfirmWithdrawal} className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)_340px]">
          {/* Column 1: Account Info */}
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Account:</h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400">In the account:</p>
                <p className="text-2xl font-black text-white">{formatMoney(liveBalance)}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400">Available for withdrawal:</p>
                <p className="text-2xl font-black text-white">{formatMoney(liveBalance)}</p>
              </div>
            </div>
          </div>

          {/* Column 2: Withdrawal Form */}
          <div className="space-y-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Withdrawal:</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Amount Input */}
              <div className="relative">
                <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">
                  Amount
                </span>
                <input
                  type="number"
                  min={10}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 w-full rounded-[4px] border border-[#2b3548] bg-transparent px-4 pr-12 text-base font-bold text-white outline-none focus:border-[#0084FF]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                  USD
                </span>
              </div>

              {/* Payment Method Selector (Restricted to Deposit History) */}
              <div className="relative">
                <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">
                  Payment method
                </span>
                <select
                  value={selectedMethodId}
                  onChange={(e) => setSelectedMethodId(e.target.value)}
                  className="h-12 w-full rounded-[4px] border border-[#2b3548] bg-[#161c28] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                >
                  {eligibleMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payout Destination Fields */}
            {selectedEligibleMethod?.methodType === "mpesa" ? (
              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">
                    First name
                  </span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-12 w-full rounded-[4px] border border-[#2b3548] bg-transparent px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                  />
                </div>

                <div className="relative">
                  <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">
                    Last name
                  </span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-12 w-full rounded-[4px] border border-[#2b3548] bg-transparent px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                  />
                </div>

                <div className="relative">
                  <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">
                    Bank
                  </span>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="h-12 w-full rounded-[4px] border border-[#2b3548] bg-[#161c28] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                  >
                    <option value="SAFARICOM">SAFARICOM</option>
                    <option value="AIRTEL">AIRTEL MONEY</option>
                  </select>
                </div>

                <div className="relative">
                  <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">
                    Phone
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="2547XXXXXXXX"
                    className="h-12 w-full rounded-[4px] border border-[#2b3548] bg-transparent px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">
                    Wallet address
                  </span>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="Enter wallet address"
                    className="h-12 w-full rounded-[4px] border border-[#2b3548] bg-transparent px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                  />
                </div>

                <div className="relative">
                  <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">
                    Memo (optional)
                  </span>
                  <input
                    type="text"
                    value={cryptoMemo}
                    onChange={(e) => setCryptoMemo(e.target.value)}
                    placeholder="Destination memo / tag if required"
                    className="h-12 w-full rounded-[4px] border border-[#2b3548] bg-transparent px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                  />
                </div>
              </div>
            )}

            {/* Confirm Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-[160px] items-center justify-center gap-2 rounded-[4px] bg-[#0084FF] px-6 text-sm font-black text-white shadow-lg shadow-[#0084FF]/25 transition hover:bg-[#0070df] active:scale-95 disabled:opacity-50"
            >
              {loading ? "Confirming..." : "Confirm"} <ArrowRight size={16} />
            </button>
          </div>

          {/* Column 3: FAQ Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">FAQ:</h3>
              <a
                href="#faq"
                className="text-xs font-bold text-[#0084FF] hover:underline"
              >
                Check out full FAQ &gt;
              </a>
            </div>

            <div className="space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded border border-[#242d3d] bg-[#1a2130] transition hover:border-[#323d52]"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="flex w-full items-center justify-between p-3 text-left text-xs font-bold text-gray-300"
                  >
                    <span>˅ {item.question}</span>
                  </button>
                  {expandedFaq === idx && (
                    <div className="border-t border-[#242d3d] p-3 text-xs leading-relaxed text-gray-400">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Bottom Section: Some of your latest requests */}
        <div className="mt-12 space-y-4 border-t border-dashed border-[#2b3548] pt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white">Some of your latest requests:</h3>
            <span className="text-xs font-bold text-[#0084FF] cursor-pointer hover:underline">
              All financial history &gt;
            </span>
          </div>

          {userDeposits.length === 0 && userWithdrawals.length === 0 ? (
            <div className="rounded-lg border border-[#263043] bg-[#1a2130] p-6 text-center text-xs font-bold text-gray-400">
              No recent financial requests found.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#263043] bg-[#1a2130]">
              <div className="divide-y divide-[#242d3d]">
                {/* Show recent deposits & withdrawals */}
                {[...userDeposits, ...userWithdrawals]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 5)
                  .map((item) => {
                    const isDeposit = "method" in item;
                    const dateStr = new Date(item.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });

                    const statusBadge =
                      item.status === "approved" || item.status === "completed" ? (
                        <span className="flex items-center gap-1 text-[#0fa055] font-bold text-xs">
                          <CheckCircle2 size={13} /> Approved
                        </span>
                      ) : item.status === "failed" || item.status === "rejected" ? (
                        <span className="flex items-center gap-1 text-red-400 font-bold text-xs">
                          <XCircle size={13} /> Failed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 font-bold text-xs">
                          <Clock size={13} /> Waiting confirmation
                        </span>
                      );

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-6 py-4 text-xs font-bold"
                      >
                        <div className="flex items-center gap-6">
                          <span className="font-mono text-gray-400">{item.id.slice(0, 10)}</span>
                          <span className="text-gray-400">{dateStr}</span>
                          <div>{statusBadge}</div>
                        </div>

                        <div className="flex items-center gap-8">
                          <span className="text-white">
                            {isDeposit ? (item as DepositRecord).method : "Withdrawal"}
                          </span>
                          <span className="font-mono text-[#0fa055] text-sm">
                            +{Number(item.amount ?? 0).toFixed(2)} $
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Withdraw;
