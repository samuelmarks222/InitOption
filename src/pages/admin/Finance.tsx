import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowUpFromLine, CheckCircle, Clock3, Filter, RefreshCw, Search, XCircle, DollarSign,
} from "lucide-react";
import { realtime } from "@/integrations/pusher/realtime";
import { api } from "@/integrations/api/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { adminUpdateDepositStatus, DepositDecision } from "@/lib/deposits";
import {
  adminUpdateWithdrawalStatus, MobileMoneyWithdrawalDecision, reviewMobileMoneyWithdrawal, WithdrawalDecision,
} from "@/lib/withdrawals";
import { getAppwriteIdToken } from "@/integrations/appwrite/authService";

type FinanceTab = "deposits" | "withdrawals" | "history";
type DepositRequest = Tables<"deposit_requests">;
type PlatformSettingsLookup = Pick<Tables<"platform_settings">, "id" | "mpesa_withdrawal_approval_threshold_kes">;
type WithdrawalRequest = Tables<"withdrawal_requests">;
type ProfileLookup = Pick<Tables<"profiles">, "id" | "username" | "display_name">;
type CryptoMethodLookup = Pick<Tables<"crypto_payment_methods">, "attribution_mode" | "id" | "network" | "symbol">;

type DepositWithUser = DepositRequest & {
  automationMode: string | null;
  cryptoLabel: string | null;
  providerLabel: string | null;
  userHandle: string;
  userName: string;
};

type WithdrawalWithUser = WithdrawalRequest & {
  payoutPhone: string | null;
  providerLabel: string | null;
  referenceMpesaPhone: string | null;
  userHandle: string;
  userName: string;
};

const BORDER = "#202B3A";
const STATUS_BADGES: Record<string, { bg: string; icon: string; label: string; text: string }> = {
  approved: { bg: "bg-[#00C98D]/15", text: "text-[#00C98D]", icon: "🟢", label: "Approved" },
  completed: { bg: "bg-[#00C98D]/15", text: "text-[#00C98D]", icon: "🟢", label: "Completed" },
  failed: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", icon: "🔴", label: "Failed" },
  pending: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", icon: "🟡", label: "Pending" },
  processing: { bg: "bg-[#3B82F6]/15", text: "text-[#3B82F6]", icon: "🔵", label: "Processing" },
  rejected: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", icon: "🔴", label: "Rejected" },
};

const FINANCE_REQUEST_LIMIT = 300;

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
};

const getUserName = (profile: ProfileLookup | undefined, userId: string) =>
  profile?.display_name || profile?.username || `User ${userId.slice(0, 8).toUpperCase()}`;

const getUserHandle = (profile: ProfileLookup | undefined, userId: string) =>
  profile?.username || userId.slice(0, 8).toUpperCase();

const Finance = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>("deposits");
  const [searchTerm, setSearchTerm] = useState("");
  const [deposits, setDeposits] = useState<DepositWithUser[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [mpesaApprovalThresholdKes, setMpesaApprovalThresholdKes] = useState(10000);
  const [platformSettingsId, setPlatformSettingsId] = useState<string | null>(null);
  const [processingDepositId, setProcessingDepositId] = useState<string | null>(null);
  const [processingWithdrawalId, setProcessingWithdrawalId] = useState<string | null>(null);
  const [savingThreshold, setSavingThreshold] = useState(false);

  const loadFinanceData = async () => {
    setLoading(true);
    const [depositsRes, withdrawalsRes, cryptoMethodsRes, platformSettingsRes] = await Promise.all([
      api.from("deposit_requests").select("*").order("created_at", { ascending: false }).limit(FINANCE_REQUEST_LIMIT),
      api.from("withdrawal_requests").select("*").order("created_at", { ascending: false }).limit(FINANCE_REQUEST_LIMIT),
      api.from("crypto_payment_methods").select("id, attribution_mode, symbol, network"),
      api.from("platform_settings").select("id, mpesa_withdrawal_approval_threshold_kes").limit(1).maybeSingle(),
    ]);

    const userIds = Array.from(new Set([
      ...(depositsRes.data ?? []).map((r) => r.user_id),
      ...(withdrawalsRes.data ?? []).map((r) => r.user_id),
    ]));

    const profilesRes = userIds.length > 0 ? await api.from("profiles").select("id, username, display_name").in("id", userIds) : { data: [] };
    const profilesById = new Map<string, ProfileLookup>((profilesRes.data ?? []).map((p) => [p.id, p]));
    const cryptoMethodsById = new Map<string, CryptoMethodLookup>((cryptoMethodsRes.data ?? []).map((m) => [m.id, m]));

    const nextDeposits = (depositsRes.data ?? []).map((req) => {
      const profile = profilesById.get(req.user_id);
      const cryptoMethod = req.payment_method_id ? cryptoMethodsById.get(req.payment_method_id) : undefined;
      return {
        automationMode: cryptoMethod?.attribution_mode ?? null,
        cryptoLabel: cryptoMethod ? `${cryptoMethod.symbol} (${cryptoMethod.network})` : null,
        providerLabel: req.provider_name ? `${req.provider_name}${req.provider_status ? ` - ${req.provider_status}` : ""}` : null,
        ...req,
        userHandle: getUserHandle(profile, req.user_id),
        userName: getUserName(profile, req.user_id),
      };
    });

    const latestMpesaPhoneMap = new Map<string, string>();
    for (const req of depositsRes.data ?? []) {
      if (!latestMpesaPhoneMap.has(req.user_id) && req.provider_phone_number) {
        latestMpesaPhoneMap.set(req.user_id, req.provider_phone_number);
      }
    }

    const nextWithdrawals = (withdrawalsRes.data ?? []).map((req) => {
      const profile = profilesById.get(req.user_id);
      return {
        ...req,
        payoutPhone: req.provider_phone_number || req.destination || null,
        providerLabel: req.provider_name ? `${req.provider_name}${req.provider_status ? ` - ${req.provider_status}` : ""}` : null,
        referenceMpesaPhone: latestMpesaPhoneMap.get(req.user_id) ?? null,
        userHandle: getUserHandle(profile, req.user_id),
        userName: getUserName(profile, req.user_id),
      };
    });

    const settingsRow = platformSettingsRes.data as PlatformSettingsLookup | null;
    setDeposits(nextDeposits);
    setWithdrawals(nextWithdrawals);
    setMpesaApprovalThresholdKes(Number(settingsRow?.mpesa_withdrawal_approval_threshold_kes ?? 10000));
    setPlatformSettingsId(settingsRow?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void loadFinanceData();
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredDeposits = useMemo(() => {
    if (!normalizedSearch) return deposits;
    return deposits.filter((r) => [r.id, r.userName, r.userHandle, r.method, r.provider_name, r.status].some((v) => String(v ?? "").toLowerCase().includes(normalizedSearch)));
  }, [deposits, normalizedSearch]);

  const filteredWithdrawals = useMemo(() => {
    if (!normalizedSearch) return withdrawals;
    return withdrawals.filter((r) => [r.id, r.userName, r.userHandle, r.method, r.destination, r.status].some((v) => String(v ?? "").toLowerCase().includes(normalizedSearch)));
  }, [normalizedSearch, withdrawals]);

  const pendingDeposits = useMemo(() => filteredDeposits.filter((r) => r.status === "pending"), [filteredDeposits]);
  const actionableWithdrawals = useMemo(() => filteredWithdrawals.filter((r) => r.status === "pending" || r.status === "approved" || r.status === "processing"), [filteredWithdrawals]);

  const handleDepositDecision = async (requestId: string, status: DepositDecision) => {
    setProcessingDepositId(requestId);
    try {
      await adminUpdateDepositStatus({ requestId, status });
      toast({ title: `Deposit ${status}` });
      await loadFinanceData();
    } catch (err) {
      toast({ title: "Deposit update failed", variant: "destructive" });
    } finally {
      setProcessingDepositId(null);
    }
  };

  const handleWithdrawalDecision = async ({ providerName, requestId, status }: { providerName?: string | null; requestId: string; status: WithdrawalDecision | MobileMoneyWithdrawalDecision }) => {
    setProcessingWithdrawalId(requestId);
    try {
      if (providerName === "plisio") {
        const accessToken = await getAppwriteIdToken();
        const res = await fetch("/api/crypto/admin-withdrawal", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, action: status === "approved" ? "approve" : "reject" }),
        });
        if (!res.ok) throw new Error("Crypto payout failed");
      } else if (providerName === "sasapay") {
        await reviewMobileMoneyWithdrawal({ requestId, status });
      } else {
        await adminUpdateWithdrawalStatus({ requestId, status: status as WithdrawalDecision });
      }
      toast({ title: `Withdrawal ${status}` });
      await loadFinanceData();
    } catch (err) {
      toast({ title: "Withdrawal update failed", variant: "destructive" });
    } finally {
      setProcessingWithdrawalId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
        <div>
          <h2 className="text-xl font-black text-white">FINANCIAL OPERATIONS CONSOLE</h2>
          <p className="text-xs text-[#8D9AAF]">Real-time deposits queue, withdrawal authorization, and gateway logs.</p>
        </div>
        <button
          onClick={() => void loadFinanceData()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-[#202B3A] bg-[#0D1420] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-[#00C98D]" : ""} /> Refresh Desk
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="grid grid-cols-2 divide-x divide-y divide-[#202B3A] sm:grid-cols-4 sm:divide-y-0">
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Pending Deposits</p>
            <p className="mt-0.5 text-xl font-black font-mono text-[#F59E0B]">{pendingDeposits.length}</p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Pending Withdrawals</p>
            <p className="mt-0.5 text-xl font-black font-mono text-[#F59E0B]">{actionableWithdrawals.length}</p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Completed Deposits</p>
            <p className="mt-0.5 text-xl font-black font-mono text-[#00C98D]">
              {deposits.filter((r) => r.status === "completed").length}
            </p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Completed Payouts</p>
            <p className="mt-0.5 text-xl font-black font-mono text-[#00C98D]">
              {withdrawals.filter((r) => r.status === "completed").length}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-[#0D1420] p-3" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-1 rounded-md border border-[#202B3A] bg-[#080D16] p-1">
          <button
            onClick={() => setActiveTab("deposits")}
            className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
              activeTab === "deposits" ? "bg-[#00C98D] text-black" : "text-[#8D9AAF] hover:text-white"
            }`}
          >
            Deposits Queue ({pendingDeposits.length})
          </button>
          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
              activeTab === "withdrawals" ? "bg-[#00C98D] text-black" : "text-[#8D9AAF] hover:text-white"
            }`}
          >
            Withdrawals Queue ({actionableWithdrawals.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
              activeTab === "history" ? "bg-[#00C98D] text-black" : "text-[#8D9AAF] hover:text-white"
            }`}
          >
            History Ledger
          </button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search reference, user, method..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 rounded-lg border bg-[#080D16] pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-500 focus:border-[#00C98D]"
            style={{ borderColor: BORDER }}
          />
        </div>
      </div>

      {/* Main Dense Table (NO CARDS) */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: BORDER }}>
                <th className="px-4 py-3">TIME</th>
                <th className="px-4 py-3">REF ID</th>
                <th className="px-4 py-3">USER</th>
                <th className="px-4 py-3">METHOD</th>
                <th className="px-4 py-3">AMOUNT</th>
                <th className="px-4 py-3">DESTINATION / PHONE</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202B3A]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">Loading financial records...</td>
                </tr>
              ) : activeTab === "deposits" ? (
                pendingDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No pending deposit requests in queue.</td>
                  </tr>
                ) : (
                  pendingDeposits.map((d) => {
                    const badge = STATUS_BADGES[d.status] ?? STATUS_BADGES.pending;
                    return (
                      <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[#8D9AAF]">{formatDateTime(d.created_at)}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-400 font-semibold">#{d.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-2.5 font-semibold text-white truncate max-w-[120px]">{d.userName}</td>
                        <td className="px-4 py-2.5 font-semibold text-white">{d.method}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-[#00C98D]">${Number(d.amount).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-400">{d.provider_phone_number || d.tx_hash?.slice(0, 10) || "Direct"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                            {badge.icon} {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => void handleDepositDecision(d.id, "approved")}
                              disabled={processingDepositId === d.id}
                              className="rounded border border-[#00C98D]/30 bg-[#00C98D]/10 px-2 py-1 text-[11px] font-bold text-[#00C98D] hover:bg-[#00C98D] hover:text-black transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => void handleDepositDecision(d.id, "rejected")}
                              disabled={processingDepositId === d.id}
                              className="rounded border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-1 text-[11px] font-bold text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )
              ) : activeTab === "withdrawals" ? (
                actionableWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No withdrawal requests awaiting approval.</td>
                  </tr>
                ) : (
                  actionableWithdrawals.map((w) => {
                    const badge = STATUS_BADGES[w.status] ?? STATUS_BADGES.pending;
                    const isCrypto = w.provider_name === "plisio" || w.method.toLowerCase().includes("crypto");
                    return (
                      <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[#8D9AAF]">{formatDateTime(w.created_at)}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-400 font-semibold">#{w.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-2.5 font-semibold text-white truncate max-w-[120px]">{w.userName}</td>
                        <td className="px-4 py-2.5 font-semibold text-white">{w.method}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-[#F59E0B]">${Number(w.amount).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-300">{w.payoutPhone || w.destination || "-"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                            {badge.icon} {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => void handleWithdrawalDecision({ providerName: w.provider_name, requestId: w.id, status: "approved" })}
                              disabled={processingWithdrawalId === w.id}
                              className="rounded border border-[#00C98D]/30 bg-[#00C98D]/10 px-2.5 py-1 text-[11px] font-bold text-[#00C98D] hover:bg-[#00C98D] hover:text-black transition-colors"
                            >
                              {isCrypto ? "Approve & Pay" : "Approve & Send"}
                            </button>
                            <button
                              onClick={() => void handleWithdrawalDecision({ providerName: w.provider_name, requestId: w.id, status: "rejected" })}
                              disabled={processingWithdrawalId === w.id}
                              className="rounded border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-1 text-[11px] font-bold text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )
              ) : (
                /* History Tab */
                [...filteredDeposits.filter((r) => r.status !== "pending"), ...filteredWithdrawals.filter((r) => r.status !== "pending")].length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No processed history entries found.</td>
                  </tr>
                ) : (
                  [...filteredDeposits.filter((r) => r.status !== "pending"), ...filteredWithdrawals.filter((r) => r.status !== "pending")].map((h: any) => {
                    const badge = STATUS_BADGES[h.status] ?? STATUS_BADGES.completed;
                    return (
                      <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[#8D9AAF]">{formatDateTime(h.created_at)}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-400 font-semibold">#{h.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-2.5 font-semibold text-white">{h.userName}</td>
                        <td className="px-4 py-2.5 font-semibold text-white">{h.method}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-white">${Number(h.amount).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-400">{h.provider_phone_number || h.destination || "-"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                            {badge.icon} {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-500">Processed</td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Finance;
