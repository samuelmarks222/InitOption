import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/integrations/api/client";
import { Tables } from "@/integrations/supabase/types";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { requestMobileMoneyWithdrawal } from "@/lib/mobileMoney";
import { requestCryptoWithdrawal } from "@/lib/withdrawals";
import { NavigationSidebar, WorkspaceModule } from "@/components/navigation/NavigationSidebar";
import TradingHeader from "@/components/trading/TradingHeader";
import { AccountType } from "@/components/trading/AccountModals";
import { DEFAULT_DEMO_BALANCE, readDemoBalanceStorage, writeDemoBalanceStorage } from "@/lib/onboarding";

type CryptoMethod = Tables<"crypto_payment_methods">;
type DepositRecord = Tables<"deposit_requests">;
type WithdrawalRecord = Tables<"withdrawals">;

export interface EligibleWithdrawalMethod {
  id: string;
  label: string;
  methodType: "mpesa" | "crypto";
  symbol?: string;
  network?: string;
}

const FAQ_COL_1 = [
  { id: 1, question: "How to withdraw money from the account?", answer: "Specify the amount, choose one of your deposit methods, enter the destination details, and click Confirm." },
  { id: 2, question: "How long does it take to withdraw funds?", answer: "Withdrawal requests are processed promptly. Automated M-Pesa and crypto payouts complete in 15-60 minutes." },
  { id: 3, question: "What is the minimum withdrawal amount?", answer: "The minimum withdrawal amount is $10.00." },
  { id: 4, question: "Is there any fee for depositing or withdrawing funds from the account?", answer: "No, our platform charges zero commission or fees for deposits and withdrawals." },
  { id: 5, question: "Do I need to provide any documents to make a withdrawal?", answer: "Standard withdrawals do not require extra documents unless identity verification is requested." },
];

const FAQ_COL_2 = [
  { id: 6, question: "What is account verification?", answer: "Account verification ensures security and confirms identity before large payouts." },
  { id: 7, question: "How to understand that I need to go through account verification?", answer: "You will receive an in-app notice if identity verification documents are required." },
  { id: 8, question: "How long does the verification process take?", answer: "Verification is completed within 1 to 2 hours of document submission." },
  { id: 9, question: "How do I know that I successfully passed verification?", answer: "A green Verified badge will appear on your profile once completed." },
];

const STATUS_COLORS: Record<string, string> = { pending: "bg-yellow-500", completed: "bg-green-500", approved: "bg-green-500", failed: "bg-red-500", rejected: "bg-red-500", waiting: "bg-slate-400" };
const STATUS_LABEL: Record<string, string> = { pending: "Waiting confirmation", completed: "Completed", approved: "Completed", failed: "Failed", rejected: "Failed", waiting: "Waiting" };

const Withdraw = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceModule>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [accountType, setAccountType] = useState<AccountType>("live");
  const [demoBalance, setDemoBalance] = useState(() => user?.id ? readDemoBalanceStorage(user.id) : DEFAULT_DEMO_BALANCE);

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
  const [userWithdrawals, setUserWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [cryptoMethods, setCryptoMethods] = useState<CryptoMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");

  const liveBalance = getEffectiveLiveBalance(profile);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const loadUserData = async () => {
      const [depositsRes, withdrawalsRes, cryptoRes] = await Promise.all([
        api.from("deposit_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        api.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        api.from("crypto_payment_methods").select("*").eq("status", "active").order("coin_name"),
      ]);
      if (cancelled) return;
      if (depositsRes.data) setUserDeposits(depositsRes.data);
      if (withdrawalsRes.data) setUserWithdrawals(withdrawalsRes.data);
      if (cryptoRes.data) setCryptoMethods(cryptoRes.data);
    };
    void loadUserData();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => { if (user?.id) setDemoBalance(readDemoBalanceStorage(user.id)); }, [user?.id]);

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
    if (map.size === 0) return [{ id: "mpesa", label: "M-pesa", methodType: "mpesa" }, { id: "crypto:USDT (TRC-20)", label: "USDT (TRC-20)", methodType: "crypto", symbol: "USDT" }];
    return Array.from(map.values());
  }, [userDeposits]);

  useEffect(() => { if (eligibleMethods.length > 0 && !selectedMethodId) setSelectedMethodId(eligibleMethods[0].id); }, [eligibleMethods, selectedMethodId]);

  const selectedEligibleMethod = useMemo(() => eligibleMethods.find((m) => m.id === selectedMethodId) ?? eligibleMethods[0], [eligibleMethods, selectedMethodId]);

  const refreshWithdrawals = async () => {
    if (!user?.id) return;
    const res = await api.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    if (res.data) setUserWithdrawals(res.data);
  };

  const handleConfirmWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 10) { toast({ title: "Minimum withdrawal is $10.00", variant: "destructive" }); return; }
    if (amountNum > liveBalance) { toast({ title: "Insufficient funds in your account balance", variant: "destructive" }); return; }
    if (selectedEligibleMethod?.methodType === "mpesa" && !phone.trim()) { toast({ title: "Please enter your M-Pesa phone number", variant: "destructive" }); return; }
    if (selectedEligibleMethod?.methodType === "crypto" && !walletAddress.trim()) { toast({ title: "Please enter your wallet address", variant: "destructive" }); return; }
    setLoading(true);
    try {
      if (selectedEligibleMethod?.methodType === "mpesa") {
        const res = await requestMobileMoneyWithdrawal({ amount: amountNum, phoneNumber: phone.trim() });
        await refreshProfile();
        toast({ title: "Withdrawal request submitted!", description: `$${amountNum.toFixed(2)} (${res.amount_kes} KES) to ${res.masked_phone_number} is pending.` });
      } else {
        const matchingCrypto = cryptoMethods.find((c) => c.symbol.toUpperCase() === (selectedEligibleMethod?.symbol || "USDT").toUpperCase()) ?? cryptoMethods[0];
        await requestCryptoWithdrawal({ amount: amountNum, destination: walletAddress.trim(), cryptoCurrency: matchingCrypto?.symbol || "USDT", cryptoNetwork: matchingCrypto?.network || "TRC-20", cryptoMemo: cryptoMemo.trim() || undefined });
        await refreshProfile();
        toast({ title: "Crypto withdrawal submitted!", description: `$${amountNum.toFixed(2)} is pending.` });
      }
      setAmount("10");
      await refreshWithdrawals();
    } catch (err) {
      toast({ title: "Withdrawal request failed", description: err instanceof Error ? err.message : "An error occurred.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const p = (n: number) => String(n).padStart(2, "0");
      return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    } catch { return iso; }
  };

  const FLabel = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="relative mt-1">
      <span className="absolute -top-2.5 left-3 z-10 bg-[#1c2230] px-1.5 text-[11px] font-bold text-[#6c7a91]">{label}</span>
      {children}
    </div>
  );

  const inputCls = "h-11 w-full rounded-[4px] border border-[#323d53] bg-[#1d2535] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF] transition-colors";

  return (
    <div className="flex h-screen flex-col overflow-hidden text-white" style={{ background: "var(--trading-workspace-bg, #131722)" }}>
      <TradingHeader
        balance={liveBalance}
        demoBalance={demoBalance}
        accountType={accountType}
        onSwitchAccount={setAccountType}
        openTabs={[]}
        onRemoveTab={() => {}}
        onAddAssetClick={() => navigate("/trade")}
        onOpenDeposit={() => navigate("/deposit")}
        onOpenWithdrawal={() => {}}
        onOpenProfile={() => navigate("/settings")}
        onUpdateDemoBalance={(v) => { setDemoBalance(v); if (user?.id) writeDemoBalanceStorage(user.id, v); }}
        onResetDemoBalance={() => { setDemoBalance(DEFAULT_DEMO_BALANCE); if (user?.id) writeDemoBalanceStorage(user.id, DEFAULT_DEMO_BALANCE); }}
        onOpenSettings={() => navigate("/settings")}
        onOpenHistory={() => {}}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="hidden shrink-0 transition-[width] duration-300 ease-out lg:block">
          <NavigationSidebar
            activeWorkspace={activeWorkspace}
            onSelectWorkspace={setActiveWorkspace}
            collapsed={!leftPanelOpen}
            onToggleCollapsed={() => setLeftPanelOpen((v) => !v)}
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 bg-[#1c2230]">
          <div className="border-b border-[#263043] bg-[#1a2130] px-6">
            <div className="flex items-center gap-0 text-[13px] font-bold text-[#8d99ae]">
              {["Withdrawal","Payments","Trades","My Account","Market","Tournaments","Analytics"].map((tab) => (
                <span key={tab} className={`cursor-pointer border-b-2 px-4 py-3 transition-colors hover:text-white ${tab === "Withdrawal" ? "border-white text-white" : "border-transparent hover:border-white/30"}`}>{tab}</span>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-10">
            <form onSubmit={handleConfirmWithdrawal} className="grid gap-10 lg:grid-cols-[160px_minmax(0,380px)_1fr]">
              <div className="space-y-6 pt-1">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8d99ae]">Account:</h3>
                <div className="space-y-5">
                  <div>
                    <p className="text-[11px] font-bold text-[#6c7a91]">In the account:</p>
                    <p className="mt-1 text-xl font-extrabold text-white">{liveBalance.toFixed(2)} $</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#6c7a91]">Available for withdrawal:</p>
                    <p className="mt-1 text-xl font-extrabold text-white">{liveBalance.toFixed(2)} $</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8d99ae]">Withdrawal:</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FLabel label="Amount">
                    <div className="flex">
                      <input type="number" min={10} value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 w-full rounded-l-[4px] border border-r-0 border-[#323d53] bg-[#1d2535] px-3 text-sm font-bold text-white outline-none focus:border-[#0084FF] transition-colors" />
                      <span className="flex h-11 items-center rounded-r-[4px] border border-l-0 border-[#323d53] bg-[#1d2535] px-3 text-xs font-bold text-[#6c7a91]">USD</span>
                    </div>
                  </FLabel>
                  <FLabel label="Payment method">
                    <select value={selectedMethodId} onChange={(e) => setSelectedMethodId(e.target.value)} className={inputCls + " appearance-none"}>
                      {eligibleMethods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </FLabel>
                </div>

                {selectedEligibleMethod?.methodType === "mpesa" ? (
                  <div className="space-y-4">
                    <FLabel label="First name"><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} /></FLabel>
                    <FLabel label="Last name"><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} /></FLabel>
                    <FLabel label="Bank">
                      <select value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputCls + " appearance-none"}>
                        <option value="SAFARICOM">SAFARICOM</option>
                        <option value="AIRTEL">AIRTEL MONEY</option>
                      </select>
                    </FLabel>
                    <FLabel label="Phone"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="254719320764" className={inputCls} /></FLabel>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FLabel label="Wallet address"><input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="Enter wallet address" className={inputCls} /></FLabel>
                    <FLabel label="Memo (optional)"><input type="text" value={cryptoMemo} onChange={(e) => setCryptoMemo(e.target.value)} placeholder="Destination memo / tag if required" className={inputCls} /></FLabel>
                  </div>
                )}

                <button type="submit" disabled={loading} className="flex h-10 min-w-[140px] items-center justify-center gap-2 rounded bg-[#0084FF] px-6 text-xs font-bold text-white shadow hover:bg-[#0070df] active:scale-95 disabled:opacity-50 transition-all">
                  {loading ? "Confirming..." : <>Confirm <ArrowRight size={14} /></>}
                </button>
              </div>

              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8d99ae]">FAQ:</h3>
                  <span className="flex items-center gap-1 cursor-pointer text-[11px] font-bold text-[#0084FF] hover:underline">Check out full FAQ <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0084FF] text-[9px] text-white">&gt;</span></span>
                </div>
                <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 text-xs">
                  {[FAQ_COL_1, FAQ_COL_2].map((col, ci) => (
                    <div key={ci} className="space-y-3">
                      {col.map((item) => (
                        <div key={item.id}>
                          <button type="button" onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)} className="flex items-start gap-1.5 text-left text-xs font-bold text-gray-300 hover:text-white transition-colors">
                            <span className="text-gray-500 shrink-0">v</span>
                            <span>{item.question}</span>
                          </button>
                          {expandedFaq === item.id && <p className="mt-1 pl-4 text-[11px] font-normal leading-relaxed text-gray-400">{item.answer}</p>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </form>

            <div className="space-y-4 border-t border-dashed border-[#2d374d] pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-300">Some of your latest requests:</h3>
                <span className="flex items-center gap-1 cursor-pointer text-[11px] font-bold text-[#0084FF] hover:underline">All financial history <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0084FF] text-[9px] text-white">&gt;</span></span>
              </div>
              <div className="space-y-0 text-xs font-bold">
                {userWithdrawals.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-[#6c7a91]">No withdrawal requests yet.</p>
                ) : (
                  userWithdrawals.slice(0, 10).map((w, i) => {
                    const status = (w.status || "pending").toLowerCase();
                    const dotColor = STATUS_COLORS[status] ?? "bg-slate-400";
                    const statusLabel = STATUS_LABEL[status] ?? status;
                    const isFailed = status === "failed" || status === "rejected";
                    return (
                      <div key={w.id} className={`flex items-center justify-between py-2.5 ${i < userWithdrawals.length - 1 ? "border-b border-[#252e40]" : ""} text-gray-400`}>
                        <div className="flex items-center gap-6 min-w-0">
                          <span className="font-mono text-gray-300 shrink-0">{String(w.id).slice(-9)}</span>
                          <span className="shrink-0">{formatDate(w.created_at)}</span>
                          <span className={`flex items-center gap-1.5 shrink-0 ${isFailed ? "text-red-400" : "text-gray-300"}`}>
                            <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />{statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-10 shrink-0">
                          <span className="text-gray-300">{w.method ?? "-"}</span>
                          <span className="font-mono text-[#0fa055]">+{Number(w.amount ?? 0).toFixed(2)} $</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Withdraw;
