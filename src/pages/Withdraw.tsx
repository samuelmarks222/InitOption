import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/integrations/api/client";
import { Tables } from "@/integrations/supabase/types";
import {
  ArrowRight,
  ChevronDown,
  Lock,
  Plus,
  HelpCircle,
  BarChart2,
  User,
  Trophy,
  Target,
  Volume2,
  Settings as SettingsIcon,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { requestMobileMoneyWithdrawal } from "@/lib/mobileMoney";
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

const FAQ_COL_1 = [
  {
    id: 1,
    question: "How to withdraw money from the account?",
    answer: "Specify the amount, choose one of your deposit methods, enter the destination details, and click Confirm.",
  },
  {
    id: 2,
    question: "How long does it take to withdraw funds?",
    answer: "Withdrawal requests are processed promptly. Automated M-Pesa and crypto payouts complete in 15–60 minutes.",
  },
  {
    id: 3,
    question: "What is the minimum withdrawal amount?",
    answer: "The minimum withdrawal amount is $10.00.",
  },
  {
    id: 4,
    question: "Is there any fee for depositing or withdrawing funds from the account?",
    answer: "No, our platform charges zero commission or fees for deposits and withdrawals.",
  },
  {
    id: 5,
    question: "Do I need to provide any documents to make a withdrawal?",
    answer: "Standard withdrawals do not require extra documents unless identity verification is requested.",
  },
];

const FAQ_COL_2 = [
  {
    id: 6,
    question: "What is account verification?",
    answer: "Account verification ensures security and confirms identity before large payouts.",
  },
  {
    id: 7,
    question: "How to understand that I need to go through account verification?",
    answer: "You will receive an in-app notice if identity verification documents are required.",
  },
  {
    id: 8,
    question: "How long does the verification process take?",
    answer: "Verification is completed within 1 to 2 hours of document submission.",
  },
  {
    id: 9,
    question: "How do I know that I successfully passed verification?",
    answer: "A green Verified badge will appear on your profile once completed.",
  },
];

const Withdraw = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { formatMoney } = useCurrency();
  const navigate = useNavigate();

  const [amount, setAmount] = useState<string>("10");
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState(() => profile?.full_name?.split(" ")[0] ?? "Gilton");
  const [lastName, setLastName] = useState(() => profile?.full_name?.split(" ").slice(1).join(" ") ?? "Ondera");
  const [bankName, setBankName] = useState("SAFARICOM");
  const [phone, setPhone] = useState(() => profile?.phone_number ?? "254719320764");
  const [walletAddress, setWalletAddress] = useState("");
  const [cryptoMemo, setCryptoMemo] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [userDeposits, setUserDeposits] = useState<DepositRecord[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<Tables<"withdrawals">[]>([]);
  const [cryptoMethods, setCryptoMethods] = useState<CryptoMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");

  const liveBalance = getEffectiveLiveBalance(profile);

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

      if (depositsRes.data) setUserDeposits(depositsRes.data);
      if (withdrawalsRes.data) setUserWithdrawals(withdrawalsRes.data);
      if (cryptoRes.data) setCryptoMethods(cryptoRes.data);
    };

    void loadUserData();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Restrict withdrawal options strictly to deposit history
  const eligibleMethods = useMemo<EligibleWithdrawalMethod[]>(() => {
    const map = new Map<string, EligibleWithdrawalMethod>();

    userDeposits.forEach((dep) => {
      const methodStr = (dep.method || "").toUpperCase();
      if (methodStr.includes("MPESA") || methodStr.includes("M-PESA") || methodStr.includes("MOBILE MONEY")) {
        map.set("mpesa", { id: "mpesa", label: "M-pesa", methodType: "mpesa" });
      } else if (methodStr.includes("AIRTEL")) {
        map.set("airtel", { id: "airtel", label: "Airtel Money", methodType: "mpesa" });
      } else if (methodStr.includes("CRYPTO") || methodStr.includes("USDT") || methodStr.includes("BTC") || methodStr.includes("ETH")) {
        const cleanLabel = dep.method ? dep.method.replace(/^CRYPTO\s*/i, "") : "USDT (TRC-20)";
        const id = `crypto:${cleanLabel}`;
        map.set(id, { id, label: cleanLabel, methodType: "crypto", symbol: cleanLabel.split(" ")[0] });
      }
    });

    if (map.size === 0) {
      return [
        { id: "mpesa", label: "M-pesa", methodType: "mpesa" },
        { id: "crypto:USDT (TRC-20)", label: "USDT (TRC-20)", methodType: "crypto", symbol: "USDT" },
      ];
    }

    return Array.from(map.values());
  }, [userDeposits]);

  useEffect(() => {
    if (eligibleMethods.length > 0 && !selectedMethodId) {
      setSelectedMethodId(eligibleMethods[0].id);
    }
  }, [eligibleMethods, selectedMethodId]);

  const selectedEligibleMethod = useMemo(
    () => eligibleMethods.find((m) => m.id === selectedMethodId) ?? eligibleMethods[0],
    [eligibleMethods, selectedMethodId],
  );

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

    if (selectedEligibleMethod?.methodType === "mpesa" && !phone.trim()) {
      toast({ title: "Please enter your M-Pesa phone number", variant: "destructive" });
      return;
    }

    if (selectedEligibleMethod?.methodType === "crypto" && !walletAddress.trim()) {
      toast({ title: "Please enter your wallet address", variant: "destructive" });
      return;
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
          description: `Your payout of $${amountNum.toFixed(2)} is pending.`,
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
    <div className="flex min-h-screen bg-[#1c2230] text-white font-sans overflow-x-hidden">
      {/* Far Left Vertical Icon Sidebar */}
      <aside className="w-14 shrink-0 bg-[#161c28] border-r border-[#263043] flex flex-col items-center justify-between py-4 text-[#8a99ad]">
        <div className="flex flex-col items-center gap-6">
          <Menu className="h-5 w-5 cursor-pointer hover:text-white transition" />
          <BarChart2 className="h-5 w-5 cursor-pointer hover:text-white transition" />
          <User className="h-5 w-5 cursor-pointer hover:text-white transition" />
          <div className="relative">
            <Trophy className="h-5 w-5 cursor-pointer hover:text-white transition" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0084FF] text-[9px] font-bold text-white">
              3
            </span>
          </div>
          <div className="relative">
            <Target className="h-5 w-5 cursor-pointer hover:text-white transition" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0084FF] text-[9px] font-bold text-white">
              6
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-5">
          <Volume2 className="h-5 w-5 cursor-pointer hover:text-white transition" />
          <SettingsIcon className="h-5 w-5 cursor-pointer hover:text-white transition" />
          <button className="flex items-center gap-1.5 rounded-full bg-[#0fa055] px-3 py-1.5 text-[11px] font-bold text-white shadow hover:bg-[#0d8a49]">
            <HelpCircle size={13} /> Help
          </button>
        </div>
      </aside>

      {/* Main Container Right of Leftmost Sidebar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navbar */}
        <header className="h-14 border-b border-[#263043] bg-[#1a2130] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <SiteLogo to="/trade" variant="dark" imageClassName="h-7" />
            <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              Web Trading Platform
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Account selector */}
            <div className="flex items-center gap-2 rounded bg-[#252e40] px-3 py-1.5 text-xs font-bold text-white cursor-pointer border border-[#323e54]">
              <span className="text-emerald-400 text-[10px]">▶</span>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider">Live Account</span>
                <span>${liveBalance.toFixed(2)}</span>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </div>

            <button
              onClick={() => navigate("/deposit")}
              className="flex h-9 items-center gap-1.5 rounded bg-[#0fa055] px-4 text-xs font-bold text-white hover:bg-[#0d8a49] shadow-md shadow-[#0fa055]/20"
            >
              <Plus size={14} strokeWidth={3} /> Deposit
            </button>

            <button
              onClick={() => navigate("/withdraw")}
              className="flex h-9 items-center rounded bg-[#2b3448] px-4 text-xs font-bold text-white hover:bg-[#343e56]"
            >
              Withdrawal
            </button>
          </div>
        </header>

        {/* Top Subnav Bar */}
        <div className="px-8 pt-4">
          <div className="inline-flex items-center rounded-[6px] bg-[#222a3a] p-1 text-xs font-bold text-gray-400">
            <span className="rounded-[4px] bg-[#333f57] px-4 py-2 text-white">Withdrawal</span>
            <span className="px-4 py-2 hover:text-white cursor-pointer">Payments</span>
            <span className="px-4 py-2 hover:text-white cursor-pointer">Trades</span>
            <span className="px-4 py-2 hover:text-white cursor-pointer">My Account</span>
            <span className="px-4 py-2 hover:text-white cursor-pointer">Market</span>
            <span className="px-4 py-2 hover:text-white cursor-pointer">Tournaments</span>
            <span className="px-4 py-2 hover:text-white cursor-pointer">Analytics</span>
          </div>
        </div>

        {/* Main Body Layout */}
        <main className="flex-1 p-8 space-y-12 overflow-y-auto">
          {/* 3 Columns Grid */}
          <form onSubmit={handleConfirmWithdrawal} className="grid gap-10 lg:grid-cols-[180px_minmax(0,340px)_1fr]">
            {/* Column 1: Account Info */}
            <div className="space-y-6 pt-1">
              <h3 className="text-xs font-bold text-[#8d99ae]">Account:</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold text-[#6c7a91]">In the account:</p>
                  <p className="text-lg font-extrabold text-white">{liveBalance.toFixed(2)} $</p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-[#6c7a91]">Available for withdrawal:</p>
                  <p className="text-lg font-extrabold text-white">{liveBalance.toFixed(2)} $</p>
                </div>
              </div>
            </div>

            {/* Column 2: Withdrawal Form */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#8d99ae]">Withdrawal:</h3>

              {/* Amount & Payment method in top row */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <span className="absolute -top-2.5 left-3 z-10 bg-[#1c2230] px-1.5 text-[11px] font-bold text-[#6c7a91]">
                    Amount
                  </span>
                  <input
                    type="number"
                    min={10}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-11 w-full rounded-[4px] border border-[#323d53] bg-[#1d2535] px-3 pr-12 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6c7a91]">
                    USD
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute -top-2.5 left-3 z-10 bg-[#1c2230] px-1.5 text-[11px] font-bold text-[#6c7a91]">
                    Payment method
                  </span>
                  <select
                    value={selectedMethodId}
                    onChange={(e) => setSelectedMethodId(e.target.value)}
                    className="h-11 w-full rounded-[4px] border border-[#323d53] bg-[#1d2535] px-3 text-xs font-bold text-white outline-none focus:border-[#0084FF]"
                  >
                    {eligibleMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stacked Destination Inputs */}
              {selectedEligibleMethod?.methodType === "mpesa" ? (
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute -top-2.5 left-3 z-10 bg-[#1c2230] px-1.5 text-[11px] font-bold text-[#6c7a91]">
                      First name
                    </span>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-11 w-full rounded-[4px] border border-[#323d53] bg-[#1d2535] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute -top-2.5 left-3 z-10 bg-[#1c2230] px-1.5 text-[11px] font-bold text-[#6c7a91]">
                      Last name
                    </span>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 w-full rounded-[4px] border border-[#323d53] bg-[#1d2535] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute -top-2.5 left-3 z-10 bg-[#1c2230] px-1.5 text-[11px] font-bold text-[#6c7a91]">
                      Bank
                    </span>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="h-11 w-full rounded-[4px] border border-[#323d53] bg-[#1d2535] px-4 text-xs font-bold text-white outline-none focus:border-[#0084FF]"
                    >
                      <option value="SAFARICOM">SAFARICOM</option>
                      <option value="AIRTEL">AIRTEL MONEY</option>
                    </select>
                  </div>

                  <div className="relative">
                    <span className="absolute -top-2.5 left-3 z-10 bg-[#1c2230] px-1.5 text-[11px] font-bold text-[#6c7a91]">
                      Phone
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="254719320764"
                      className="h-11 w-full rounded-[4px] border border-[#323d53] bg-[#1d2535] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute -top-2.5 left-3 z-10 bg-[#1c2230] px-1.5 text-[11px] font-bold text-[#6c7a91]">
                      Wallet address
                    </span>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Enter wallet address"
                      className="h-11 w-full rounded-[4px] border border-[#323d53] bg-[#1d2535] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute -top-2.5 left-3 z-10 bg-[#1c2230] px-1.5 text-[11px] font-bold text-[#6c7a91]">
                      Memo (optional)
                    </span>
                    <input
                      type="text"
                      value={cryptoMemo}
                      onChange={(e) => setCryptoMemo(e.target.value)}
                      placeholder="Destination memo / tag if required"
                      className="h-11 w-full rounded-[4px] border border-[#323d53] bg-[#1d2535] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                    />
                  </div>
                </div>
              )}

              {/* Confirm Blue Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex h-10 min-w-[140px] items-center justify-center gap-2 rounded bg-[#0084FF] px-6 text-xs font-bold text-white shadow hover:bg-[#0070df] active:scale-95 disabled:opacity-50"
              >
                {loading ? "Confirming..." : "Confirm"} <ArrowRight size={14} />
              </button>
            </div>

            {/* Column 3: FAQ Section */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#8d99ae]">FAQ:</h3>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#0084FF] cursor-pointer hover:underline">
                  Check out full FAQ <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0084FF] text-[9px] text-white">&gt;</span>
                </span>
              </div>

              {/* 2-Column FAQ Layout */}
              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 text-xs font-bold text-gray-300">
                <div className="space-y-3">
                  {FAQ_COL_1.map((item) => (
                    <div key={item.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                        className="flex items-start gap-1.5 text-left text-xs font-bold text-gray-300 hover:text-white transition"
                      >
                        <span className="text-gray-500">˅</span>
                        <span>{item.question}</span>
                      </button>
                      {expandedFaq === item.id && (
                        <p className="mt-1 pl-4 text-[11px] font-normal leading-relaxed text-gray-400">
                          {item.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {FAQ_COL_2.map((item) => (
                    <div key={item.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                        className="flex items-start gap-1.5 text-left text-xs font-bold text-gray-300 hover:text-white transition"
                      >
                        <span className="text-gray-500">˅</span>
                        <span>{item.question}</span>
                      </button>
                      {expandedFaq === item.id && (
                        <p className="mt-1 pl-4 text-[11px] font-normal leading-relaxed text-gray-400">
                          {item.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </form>

          {/* Bottom Section: Some of your latest requests */}
          <div className="space-y-4 border-t border-dashed border-[#2d374d] pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-300">Some of your latest requests:</h3>
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#0084FF] cursor-pointer hover:underline">
                All financial history <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0084FF] text-[9px] text-white">&gt;</span>
              </span>
            </div>

            <div className="space-y-2 text-xs font-bold">
              {/* Sample or real history matching screenshot format */}
              <div className="flex items-center justify-between py-2 border-b border-[#252e40] text-gray-400">
                <div className="flex items-center gap-8">
                  <span className="font-mono text-gray-300">128420243</span>
                  <span>25.08.2026 00:58:40</span>
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <span className="h-2 w-2 rounded-full bg-slate-400" /> Waiting confirmation
                  </span>
                </div>
                <div className="flex items-center gap-12">
                  <span className="text-gray-300">M-pesa</span>
                  <span className="font-mono text-[#0fa055]">+100.00 $</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-[#252e40] text-gray-400">
                <div className="flex items-center gap-8">
                  <span className="font-mono text-gray-300">127990226</span>
                  <span>20.08.2026 06:20:02</span>
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Failed
                  </span>
                </div>
                <div className="flex items-center gap-12">
                  <span className="text-gray-300">M-pesa</span>
                  <span className="font-mono text-[#0fa055]">+100.00 $</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 text-gray-400">
                <div className="flex items-center gap-8">
                  <span className="font-mono text-gray-300">127990195</span>
                  <span>20.08.2026 06:19:41</span>
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Failed
                  </span>
                </div>
                <div className="flex items-center gap-12">
                  <span className="text-gray-300">USDT (TRC-20)</span>
                  <span className="font-mono text-[#0fa055]">+100.00 $</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Withdraw;
