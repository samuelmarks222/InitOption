import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle,
  Clock3,
  Filter,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { adminUpdateDepositStatus, DepositDecision } from "@/lib/deposits";
import {
  adminUpdateWithdrawalStatus,
  MobileMoneyWithdrawalDecision,
  reviewMobileMoneyWithdrawal,
  WithdrawalDecision,
} from "@/lib/withdrawals";

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

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-500/10 text-green-400",
  completed: "bg-green-500/10 text-green-400",
  failed: "bg-red-500/10 text-red-400",
  pending: "bg-[#ff9a3d]/10 text-[#ffc27a]",
  processing: "bg-[#0fa053]/10 text-[#9be1bc]",
  rejected: "bg-red-500/10 text-red-400",
};
const FINANCE_REQUEST_LIMIT = 300;

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getUserName = (profile: ProfileLookup | undefined, userId: string) =>
  profile?.display_name || profile?.username || `User ${userId.slice(0, 8).toUpperCase()}`;

const getUserHandle = (profile: ProfileLookup | undefined, userId: string) =>
  profile?.username || userId.slice(0, 8).toUpperCase();

const EmptyState = ({
  description,
  title,
}: {
  description: string;
  title: string;
}) => (
  <div className="rounded-2xl border p-8 text-center shadow-lg" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--admin-surface)" }}>
      <Clock3 className="h-5 w-5 text-slate-300" />
    </div>
    <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-300">{description}</p>
  </div>
);

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

    const [depositsResponse, withdrawalsResponse, cryptoMethodsResponse, platformSettingsResponse] = await Promise.all([
      supabase.from("deposit_requests").select("*").order("created_at", { ascending: false }).limit(FINANCE_REQUEST_LIMIT),
      supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }).limit(FINANCE_REQUEST_LIMIT),
      supabase.from("crypto_payment_methods").select("id, attribution_mode, symbol, network"),
      supabase.from("platform_settings").select("id, mpesa_withdrawal_approval_threshold_kes").limit(1).maybeSingle(),
    ]);

    if (depositsResponse.error) {
      toast({
        title: "Deposits unavailable",
        description: depositsResponse.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (withdrawalsResponse.error) {
      toast({
        title: "Withdrawals unavailable",
        description: withdrawalsResponse.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (cryptoMethodsResponse.error) {
      toast({
        title: "Crypto metadata unavailable",
        description: cryptoMethodsResponse.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const userIds = Array.from(
      new Set([
        ...(depositsResponse.data ?? []).map((request) => request.user_id),
        ...(withdrawalsResponse.data ?? []).map((request) => request.user_id),
      ]),
    );
    const profilesResponse =
      userIds.length > 0
        ? await supabase.from("profiles").select("id, username, display_name").in("id", userIds)
        : { data: [], error: null };

    if (profilesResponse.error) {
      toast({
        title: "Profiles unavailable",
        description: profilesResponse.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (platformSettingsResponse.error) {
      toast({
        title: "Threshold settings unavailable",
        description: platformSettingsResponse.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const profilesById = new Map<string, ProfileLookup>(
      (profilesResponse.data ?? []).map((profile) => [profile.id, profile]),
    );
    const cryptoMethodsById = new Map<string, CryptoMethodLookup>(
      (cryptoMethodsResponse.data ?? []).map((method) => [method.id, method]),
    );

    const nextDeposits = (depositsResponse.data ?? []).map((request) => {
      const profile = profilesById.get(request.user_id);
      const cryptoMethod = request.payment_method_id ? cryptoMethodsById.get(request.payment_method_id) : undefined;
      return {
        automationMode: cryptoMethod?.attribution_mode ?? null,
        cryptoLabel: cryptoMethod ? `${cryptoMethod.symbol} (${cryptoMethod.network})` : null,
        providerLabel: request.provider_name ? `${request.provider_name}${request.provider_status ? ` - ${request.provider_status}` : ""}` : null,
        ...request,
        userHandle: getUserHandle(profile, request.user_id),
        userName: getUserName(profile, request.user_id),
      };
    });

    const latestMpesaDepositPhoneByUser = new Map<string, string>();

    for (const request of depositsResponse.data ?? []) {
      if (latestMpesaDepositPhoneByUser.has(request.user_id)) {
        continue;
      }

      const depositPhone =
        request.provider_phone_number && (request.provider_name === "sasapay" || request.method === "M-PESA Mobile Money")
          ? request.provider_phone_number
          : null;

      if (depositPhone) {
        latestMpesaDepositPhoneByUser.set(request.user_id, depositPhone);
      }
    }

    const nextWithdrawals = (withdrawalsResponse.data ?? []).map((request) => {
      const profile = profilesById.get(request.user_id);
      const providerLabel =
        request.provider_name === "sasapay"
          ? request.status === "approved"
            ? "Manual payout ready"
            : request.status === "completed"
              ? "Manual payout completed"
              : request.status === "failed"
                ? "Manual payout failed"
                : request.status === "pending"
                  ? "Waiting for finance review"
                  : request.provider_status
          : request.provider_name
            ? `${request.provider_name}${request.provider_status ? ` - ${request.provider_status}` : ""}`
            : null;

      return {
        ...request,
        payoutPhone: request.provider_phone_number || request.destination || null,
        providerLabel,
        referenceMpesaPhone: latestMpesaDepositPhoneByUser.get(request.user_id) ?? null,
        userHandle: getUserHandle(profile, request.user_id),
        userName: getUserName(profile, request.user_id),
      };
    });

    const platformSettingsRow = (platformSettingsResponse.data ?? null) as PlatformSettingsLookup | null;

    setDeposits(nextDeposits);
    setMpesaApprovalThresholdKes(Number(platformSettingsRow?.mpesa_withdrawal_approval_threshold_kes ?? 10000));
    setPlatformSettingsId(platformSettingsRow?.id ?? null);
    setWithdrawals(nextWithdrawals);
    setLoading(false);
  };

  useEffect(() => {
    void loadFinanceData();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-finance-review")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, () => {
        void loadFinanceData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => {
        void loadFinanceData();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredDeposits = useMemo(() => {
    if (!normalizedSearch) return deposits;

    return deposits.filter((request) =>
      [
        request.id,
        request.userName,
        request.userHandle,
        request.method,
        request.provider_name,
        request.provider_phone_number,
        request.provider_status,
        request.status,
        request.automationMode,
        request.cryptoLabel,
        request.tx_hash,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [deposits, normalizedSearch]);

  const filteredWithdrawals = useMemo(() => {
    if (!normalizedSearch) return withdrawals;

    return withdrawals.filter((request) =>
      [
        request.id,
        request.userName,
        request.userHandle,
        request.method,
        request.destination,
        request.payoutPhone,
        request.provider_name,
        request.provider_phone_number,
        request.provider_status,
        request.referenceMpesaPhone,
        request.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [normalizedSearch, withdrawals]);

  const pendingDeposits = useMemo(
    () => filteredDeposits.filter((request) => request.status === "pending"),
    [filteredDeposits],
  );
  const processedDeposits = useMemo(
    () => filteredDeposits.filter((request) => request.status !== "pending"),
    [filteredDeposits],
  );
  const actionableWithdrawals = useMemo(
    () =>
      filteredWithdrawals.filter((request) =>
        request.provider_name === "sasapay"
          ? request.status === "pending" || request.status === "approved" || request.status === "processing"
          : request.status === "pending",
      ),
    [filteredWithdrawals],
  );
  const processedWithdrawals = useMemo(
    () =>
      filteredWithdrawals.filter((request) =>
        request.provider_name === "sasapay"
          ? request.status !== "pending" && request.status !== "approved" && request.status !== "processing"
          : request.status !== "pending",
      ),
    [filteredWithdrawals],
  );

  const handleDepositDecision = async (requestId: string, status: DepositDecision) => {
    setProcessingDepositId(requestId);

    try {
      await adminUpdateDepositStatus({ requestId, status });
      toast({
        title: `Deposit ${status}`,
        description:
          status === "approved"
            ? "The deposit was credited after manual confirmation."
            : "The deposit request was rejected and nothing was added to the user balance.",
      });
      await loadFinanceData();
    } catch (error) {
      toast({
        title: "Deposit update failed",
        description: error instanceof Error ? error.message : "Something went wrong while updating the deposit request.",
        variant: "destructive",
      });
    } finally {
      setProcessingDepositId(null);
    }
  };

  const handleWithdrawalDecision = async ({
    providerName,
    requestId,
    status,
  }: {
    providerName?: string | null;
    requestId: string;
    status: WithdrawalDecision | MobileMoneyWithdrawalDecision;
  }) => {
    setProcessingWithdrawalId(requestId);

    try {
      let adminNote: string | null = null;

      if (providerName === "sasapay") {
        const promptLabel =
          status === "approved"
            ? "approval"
            : status === "rejected"
              ? "rejection"
              : status === "completed"
                ? "completion"
                : "failure";
        const promptedNote = window.prompt(
          `Add an optional ${promptLabel} note for this M-PESA withdrawal. Leave blank to continue without one.`,
          "",
        );

        if (promptedNote === null) {
          setProcessingWithdrawalId(null);
          return;
        }

        adminNote = promptedNote.trim() || null;
      }

      if (providerName === "sasapay") {
        await reviewMobileMoneyWithdrawal({ adminNote, requestId, status });
      } else {
        await adminUpdateWithdrawalStatus({ adminNote, requestId, status: status as WithdrawalDecision });
      }
      toast({
        title: `Withdrawal ${status}`,
        description:
          providerName === "sasapay"
            ? status === "approved"
              ? "The request is approved and now waits for manual payout from the merchant dashboard."
              : status === "completed"
                ? "The request is marked as paid and the reserved amount has been settled."
                : status === "failed"
                  ? "The request is marked as failed and the reserved amount is available again."
                  : "The request was rejected and the reserved amount is available again."
            : status === "approved"
              ? "The payout request is now marked as approved."
              : "The request was rejected and the user's balance was refunded.",
      });
      await loadFinanceData();
    } catch (error) {
      toast({
        title: "Withdrawal update failed",
        description: error instanceof Error ? error.message : "Something went wrong while updating the withdrawal request.",
        variant: "destructive",
      });
    } finally {
      setProcessingWithdrawalId(null);
    }
  };

  const handleSaveThreshold = async () => {
    setSavingThreshold(true);

    try {
      const nextValue = Math.max(0, Number(mpesaApprovalThresholdKes) || 0);

      if (platformSettingsId) {
        const { error } = await supabase
          .from("platform_settings")
          .update({
            mpesa_withdrawal_approval_threshold_kes: nextValue,
            updated_at: new Date().toISOString(),
          })
          .eq("id", platformSettingsId);

        if (error) {
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("platform_settings")
          .insert({
            mpesa_withdrawal_approval_threshold_kes: nextValue,
          })
          .select("id, mpesa_withdrawal_approval_threshold_kes")
          .single();

        if (error) {
          throw error;
        }

        setPlatformSettingsId(data.id);
        setMpesaApprovalThresholdKes(Number(data.mpesa_withdrawal_approval_threshold_kes ?? nextValue));
      }

      toast({
        title: "Threshold updated",
        description: `M-PESA withdrawals above KES ${nextValue.toLocaleString()} will now require approval.`,
      });
    } catch (error) {
      toast({
        title: "Threshold update failed",
        description: error instanceof Error ? error.message : "Something went wrong while saving the threshold.",
        variant: "destructive",
      });
    } finally {
      setSavingThreshold(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Financial Transactions</h2>
          <p className="mt-1 text-sm text-[#a7bfd8]">
            Review finance activity, approve M-PESA withdrawals, and mark manual payouts as completed or failed after the finance team sends them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadFinanceData()}
          disabled={loading}
          className="admin-button-secondary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-70"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] p-5 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-lg font-bold text-white">M-PESA Approval Settings</h3>
            <p className="mt-1 text-sm leading-6 text-[#a7bfd8]">
              Withdrawals above this KES amount stay pending until a finance admin reviews them. Lower amounts move straight into the finance desk as manual payouts ready to be sent.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-[220px]">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Approval Threshold (KES)
              </span>
              <input
                type="number"
                min="0"
                value={mpesaApprovalThresholdKes}
                onChange={(event) => setMpesaApprovalThresholdKes(Number(event.target.value))}
                className="w-full rounded-xl border border-[#2a2f42] bg-[#0e1017] px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#0fa053]"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleSaveThreshold()}
              disabled={savingThreshold}
              className="admin-button-primary rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
            >
              {savingThreshold ? "Saving..." : "Save Threshold"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#2a2f42] bg-[#1a1e2b] p-1 w-fit">
        <button
          onClick={() => setActiveTab("deposits")}
          className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold transition-colors ${
            activeTab === "deposits" ? "bg-[#0fa053] text-white shadow-lg shadow-[#0fa053]/20" : "text-[#a7bfd8] hover:text-white"
          }`}
        >
          <ArrowDownToLine size={16} /> Pending Deposits
          <span className="ml-1 rounded-full bg-[#ff9a3d] px-1.5 py-0.5 text-[10px] text-[#0e1017]">
            {deposits.filter((request) => request.status === "pending").length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("withdrawals")}
          className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold transition-colors ${
            activeTab === "withdrawals" ? "bg-[#ff9a3d] text-[#0e1017] shadow-lg shadow-[#ff9a3d]/20" : "text-[#a7bfd8] hover:text-white"
          }`}
        >
          <ArrowUpFromLine size={16} /> Withdrawal Desk
          <span className="ml-1 rounded-full bg-[#ff9a3d] px-1.5 py-0.5 text-[10px] text-[#0e1017]">
            {
              withdrawals.filter((request) =>
                request.provider_name === "sasapay"
                  ? request.status === "pending" || request.status === "approved" || request.status === "processing"
                  : request.status === "pending",
              ).length
            }
          </span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold transition-colors ${
            activeTab === "history" ? "bg-[#1a1e2b] text-[#ffc27a] shadow-lg shadow-[#ff9a3d]/10" : "text-[#a7bfd8] hover:text-white"
          }`}
        >
          <Filter size={16} /> Processed History
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ffc27a]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search request ID, user, method or status..."
          className="w-full rounded-xl border border-[#2a2f42] bg-[#0e1017] py-2.5 pl-9 pr-4 text-sm text-white outline-none transition-colors focus:border-[#0fa053]"
        />
      </div>

      {activeTab === "deposits" && (
        <>
          {loading ? (
            <EmptyState
              title="Loading deposit requests"
              description="Fetching the latest pending deposit requests from your database."
            />
          ) : pendingDeposits.length === 0 ? (
            <EmptyState
              title="No pending deposit requests"
              description="New pending deposit requests will appear here after traders submit them from the deposit flow."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] shadow-lg">
              <div className="border-b border-[#2a2f42] bg-[#1a1e2b] p-4">
                <h3 className="font-bold text-white">Deposit Requests</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-sm text-slate-200">
                  <thead className="border-b border-[#2a2f42] bg-[#1a1e2b] text-xs uppercase text-slate-300">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Request ID</th>
                      <th className="px-6 py-3 font-semibold">User</th>
                      <th className="px-6 py-3 font-semibold">Amount</th>
                      <th className="px-6 py-3 font-semibold">Method</th>
                      <th className="px-6 py-3 font-semibold">Promo</th>
                      <th className="px-6 py-3 font-semibold">Submitted</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pendingDeposits.map((request) => {
                      const isBusy = processingDepositId === request.id;
                      const isAutoMonitored =
                        (request.automationMode && request.automationMode !== "static") || request.provider_name === "sasapay";

                      return (
                        <tr key={request.id} className="hover:bg-white/[0.02]">
                          <td className="px-6 py-4 font-mono text-slate-300">{request.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{request.userName}</div>
                            <div className="text-xs text-slate-400">@{request.userHandle}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono font-bold text-green-300">${Number(request.amount).toFixed(2)}</div>
                            {request.tx_hash ? (
                              <div className="mt-1 max-w-[200px] truncate text-[11px] text-slate-400">TX: {request.tx_hash}</div>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 text-slate-200">
                            <div>{request.method}</div>
                            {isAutoMonitored ? (
                              <div className="mt-1 text-[11px] text-[#0fa053]">
                                Auto-monitored {request.cryptoLabel ? `• ${request.cryptoLabel}` : ""}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {Number(request.promo_bonus) > 0 ? `+${Number(request.promo_bonus).toFixed(2)}` : "-"}
                          </td>
                          <td className="px-6 py-4 text-slate-300">{formatDateTime(request.created_at)}</td>
                          <td className="px-6 py-4">
                            {isAutoMonitored ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!window.confirm("Cancel this deposit request?")) return;
                                    void handleDepositDecision(request.id, "rejected");
                                  }}
                                  disabled={isBusy}
                                  className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                                >
                                  <XCircle size={14} />
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!window.confirm("Force approve this auto-monitored deposit now?")) return;
                                    void handleDepositDecision(request.id, "approved");
                                  }}
                                  disabled={isBusy}
                                  className="flex items-center gap-1 rounded-lg border border-[#0fa053]/40 bg-[#0fa053]/10 px-3 py-1.5 text-xs font-bold uppercase text-[#8be0af] transition-colors hover:bg-[#0fa053]/20 disabled:opacity-60"
                                >
                                  <CheckCircle size={14} />
                                  Force Approve
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => void handleDepositDecision(request.id, "approved")}
                                  disabled={isBusy}
                                  className="flex items-center gap-1 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-bold uppercase text-green-400 transition-colors hover:bg-green-500 hover:text-white disabled:opacity-60"
                                >
                                  <CheckCircle size={14} />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDepositDecision(request.id, "rejected")}
                                  disabled={isBusy}
                                  className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-60"
                                >
                                  <XCircle size={14} />
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "withdrawals" && (
        <>
          {loading ? (
            <EmptyState
              title="Loading withdrawal requests"
              description="Fetching the latest pending requests from your database."
            />
          ) : actionableWithdrawals.length === 0 ? (
            <EmptyState
              title="No open withdrawal requests"
              description="New M-PESA manual payout requests will appear here as soon as users submit them from the live account."
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] p-4 text-sm leading-6 text-slate-200 shadow-lg">
                Finance sees the payout method, the requested payout number, and the most recent M-PESA deposit number for the same user.
                Set the approval threshold to <span className="font-bold text-white">0 KES</span> if every M-PESA withdrawal
                should wait for manual review before it is sent from the merchant dashboard.
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {actionableWithdrawals.map((request) => {
                  const isBusy = processingWithdrawalId === request.id;
                  const isSasaPay = request.provider_name === "sasapay";
                  const isManualReady = isSasaPay && request.status === "approved";
                  const isWaitingReview = isSasaPay && request.status === "pending";
                  const isLegacyProcessing = isSasaPay && request.status === "processing";

                  return (
                    <div key={request.id} className="overflow-hidden rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] shadow-lg">
                      <div className="border-b border-[#2a2f42] bg-[#1a1e2b] p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Request</div>
                            <div className="mt-2 font-mono text-sm text-slate-200">{request.id.slice(0, 8).toUpperCase()}</div>
                            <div className="mt-3 text-xl font-bold text-white">{request.userName}</div>
                            <div className="text-sm text-slate-400">@{request.userHandle}</div>
                          </div>

                          <div className="flex flex-col gap-3 lg:items-end">
                            <div className="font-mono text-2xl font-bold text-[#8be0af]">${Number(request.amount).toFixed(2)}</div>
                            <span
                              className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                STATUS_STYLES[request.status] ?? "bg-white/10 text-slate-200"
                              }`}
                            >
                              {request.status === "processing" ? (
                                <Clock3 size={12} />
                              ) : request.status === "approved" || request.status === "completed" ? (
                                <CheckCircle size={12} />
                              ) : (
                                <XCircle size={12} />
                              )}
                              {request.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 p-4">
                        {request.providerLabel ? (
                          <div className="rounded-xl border border-[#0fa053]/15 bg-[#0fa053]/10 px-4 py-3 text-sm text-[#d8f6e5]">
                            {request.providerLabel}
                          </div>
                        ) : null}

                        {isManualReady ? (
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-200">
                            This payout is approved and waiting for finance to send it manually from the SasaPay merchant dashboard.
                          </div>
                        ) : null}

                        {isLegacyProcessing ? (
                          <div className="rounded-xl border border-[#0fa053]/20 bg-[#0fa053]/10 px-4 py-3 text-sm leading-6 text-[#d8f6e5]">
                            This request is still tied to the older provider callback flow and is waiting for provider confirmation.
                          </div>
                        ) : null}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-[#2a2f42] bg-[#0f141c] p-4">
                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Method</div>
                            <div className="mt-2 text-base font-semibold text-white">{request.method}</div>
                          </div>

                          <div className="rounded-xl border border-[#2a2f42] bg-[#0f141c] p-4">
                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Submitted</div>
                            <div className="mt-2 text-base font-semibold text-white">{formatDateTime(request.created_at)}</div>
                          </div>

                          <div className="rounded-xl border border-[#2a2f42] bg-[#0f141c] p-4">
                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Payout Number</div>
                            <div className="mt-2 break-all text-base font-semibold text-white">{request.payoutPhone ?? request.destination}</div>
                          </div>

                          <div className="rounded-xl border border-[#2a2f42] bg-[#0f141c] p-4">
                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Last Deposit Number</div>
                            <div className="mt-2 break-all text-base font-semibold text-white">{request.referenceMpesaPhone ?? "-"}</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 border-t border-[#2a2f42] pt-4">
                          {isWaitingReview ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleWithdrawalDecision({
                                    providerName: request.provider_name,
                                    requestId: request.id,
                                    status: "approved",
                                  })
                                }
                                disabled={isBusy}
                                className="flex items-center gap-1 rounded-lg bg-green-500/10 px-4 py-2 text-xs font-bold uppercase text-green-400 transition-colors hover:bg-green-500 hover:text-white disabled:opacity-60"
                              >
                                <CheckCircle size={14} />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleWithdrawalDecision({
                                    providerName: request.provider_name,
                                    requestId: request.id,
                                    status: "rejected",
                                  })
                                }
                                disabled={isBusy}
                                className="flex items-center gap-1 rounded-lg bg-red-500/10 px-4 py-2 text-xs font-bold uppercase text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-60"
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </>
                          ) : isManualReady ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleWithdrawalDecision({
                                    providerName: request.provider_name,
                                    requestId: request.id,
                                    status: "completed",
                                  })
                                }
                                disabled={isBusy}
                                className="flex items-center gap-1 rounded-lg bg-green-500/10 px-4 py-2 text-xs font-bold uppercase text-green-400 transition-colors hover:bg-green-500 hover:text-white disabled:opacity-60"
                              >
                                <CheckCircle size={14} />
                                Mark Paid
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleWithdrawalDecision({
                                    providerName: request.provider_name,
                                    requestId: request.id,
                                    status: "failed",
                                  })
                                }
                                disabled={isBusy}
                                className="flex items-center gap-1 rounded-lg bg-red-500/10 px-4 py-2 text-xs font-bold uppercase text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-60"
                              >
                                <XCircle size={14} />
                                Mark Failed
                              </button>
                            </>
                          ) : !isLegacyProcessing ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleWithdrawalDecision({
                                    providerName: request.provider_name,
                                    requestId: request.id,
                                    status: "approved",
                                  })
                                }
                                disabled={isBusy}
                                className="flex items-center gap-1 rounded-lg bg-green-500/10 px-4 py-2 text-xs font-bold uppercase text-green-400 transition-colors hover:bg-green-500 hover:text-white disabled:opacity-60"
                              >
                                <CheckCircle size={14} />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleWithdrawalDecision({
                                    providerName: request.provider_name,
                                    requestId: request.id,
                                    status: "rejected",
                                  })
                                }
                                disabled={isBusy}
                                className="flex items-center gap-1 rounded-lg bg-red-500/10 px-4 py-2 text-xs font-bold uppercase text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-60"
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-hidden rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] shadow-lg">
              <div className="border-b border-[#2a2f42] bg-[#1a1e2b] p-4">
                <h3 className="font-bold text-white">Withdrawal Requests</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1220px] text-left text-sm text-slate-200">
                  <thead className="border-b border-[#2a2f42] bg-[#1a1e2b] text-xs uppercase text-slate-300">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Request ID</th>
                      <th className="px-6 py-3 font-semibold">User</th>
                      <th className="px-6 py-3 font-semibold">Amount</th>
                      <th className="px-6 py-3 font-semibold">Method</th>
                      <th className="px-6 py-3 font-semibold">Payout Number</th>
                      <th className="px-6 py-3 font-semibold">Last Deposit Number</th>
                      <th className="px-6 py-3 font-semibold">Submitted</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {actionableWithdrawals.map((request) => {
                      const isBusy = processingWithdrawalId === request.id;
                      const isSasaPay = request.provider_name === "sasapay";
                      const isManualReady = isSasaPay && request.status === "approved";
                      const isWaitingReview = isSasaPay && request.status === "pending";
                      const isLegacyProcessing = isSasaPay && request.status === "processing";

                      return (
                        <tr key={request.id} className="hover:bg-white/[0.02]">
                          <td className="px-6 py-4 font-mono text-slate-300">{request.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{request.userName}</div>
                            <div className="text-xs text-slate-400">@{request.userHandle}</div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-[#8be0af]">${Number(request.amount).toFixed(2)}</td>
                          <td className="px-6 py-4 text-slate-200">
                            <div>{request.method}</div>
                            {request.providerLabel ? (
                              <div className="mt-1 text-[11px] text-[#0fa053]">{request.providerLabel}</div>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            <div className="max-w-[220px] break-all">{request.payoutPhone ?? request.destination}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            <div className="max-w-[220px] break-all">{request.referenceMpesaPhone ?? "-"}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-300">{formatDateTime(request.created_at)}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                STATUS_STYLES[request.status] ?? "bg-white/10 text-slate-200"
                              }`}
                            >
                              {request.status === "processing" ? (
                                <Clock3 size={12} />
                              ) : request.status === "approved" || request.status === "completed" ? (
                                <CheckCircle size={12} />
                              ) : (
                                <XCircle size={12} />
                              )}
                              {request.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isWaitingReview ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleWithdrawalDecision({
                                      providerName: request.provider_name,
                                      requestId: request.id,
                                      status: "approved",
                                    })
                                  }
                                  disabled={isBusy}
                                  className="flex items-center gap-1 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-bold uppercase text-green-400 transition-colors hover:bg-green-500 hover:text-white disabled:opacity-60"
                                >
                                  <CheckCircle size={14} />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleWithdrawalDecision({
                                      providerName: request.provider_name,
                                      requestId: request.id,
                                      status: "rejected",
                                    })
                                  }
                                  disabled={isBusy}
                                  className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-60"
                                >
                                  <XCircle size={14} />
                                  Reject
                                </button>
                              </div>
                            ) : isManualReady ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleWithdrawalDecision({
                                      providerName: request.provider_name,
                                      requestId: request.id,
                                      status: "completed",
                                    })
                                  }
                                  disabled={isBusy}
                                  className="flex items-center gap-1 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-bold uppercase text-green-400 transition-colors hover:bg-green-500 hover:text-white disabled:opacity-60"
                                >
                                  <CheckCircle size={14} />
                                  Mark Paid
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleWithdrawalDecision({
                                      providerName: request.provider_name,
                                      requestId: request.id,
                                      status: "failed",
                                    })
                                  }
                                  disabled={isBusy}
                                  className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-60"
                                >
                                  <XCircle size={14} />
                                  Mark Failed
                                </button>
                              </div>
                            ) : isLegacyProcessing ? (
                              <div className="text-right text-[11px] leading-5 text-[#0fa053]">
                                Legacy payout request.
                                <br />
                                Waiting for provider callback.
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleWithdrawalDecision({
                                      providerName: request.provider_name,
                                      requestId: request.id,
                                      status: "approved",
                                    })
                                  }
                                  disabled={isBusy}
                                  className="flex items-center gap-1 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-bold uppercase text-green-400 transition-colors hover:bg-green-500 hover:text-white disabled:opacity-60"
                                >
                                  <CheckCircle size={14} />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleWithdrawalDecision({
                                      providerName: request.provider_name,
                                      requestId: request.id,
                                      status: "rejected",
                                    })
                                  }
                                  disabled={isBusy}
                                  className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-60"
                                >
                                  <XCircle size={14} />
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          )}
        </>
      )}

      {activeTab === "history" && (
        <>
          {loading ? (
            <EmptyState
              title="Loading processed history"
              description="Fetching approved and rejected deposit and withdrawal decisions from your database."
            />
          ) : processedDeposits.length === 0 && processedWithdrawals.length === 0 ? (
            <EmptyState
              title="No processed history yet"
              description="Approved and rejected finance decisions will appear here once admins begin reviewing requests."
            />
          ) : (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] shadow-lg">
                <div className="border-b border-[#2a2f42] bg-[#1a1e2b] p-4">
                  <h3 className="font-bold text-white">Deposit History</h3>
                </div>
                {processedDeposits.length === 0 ? (
                  <div className="p-6 text-sm text-slate-300">No processed deposits yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1040px] text-left text-sm text-slate-200">
                      <thead className="border-b border-[#2a2f42] bg-[#1a1e2b] text-xs uppercase text-slate-300">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Request ID</th>
                          <th className="px-6 py-3 font-semibold">User</th>
                          <th className="px-6 py-3 font-semibold">Amount</th>
                          <th className="px-6 py-3 font-semibold">Credited</th>
                          <th className="px-6 py-3 font-semibold">Method</th>
                          <th className="px-6 py-3 font-semibold">Processed</th>
                          <th className="px-6 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {processedDeposits.map((request) => (
                          <tr key={request.id} className="hover:bg-white/[0.02]">
                            <td className="px-6 py-4 font-mono text-slate-300">{request.id.slice(0, 8).toUpperCase()}</td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-white">{request.userName}</div>
                              <div className="text-xs text-slate-400">@{request.userHandle}</div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-white">${Number(request.amount).toFixed(2)}</td>
                            <td className="px-6 py-4 font-mono text-green-300">
                              {request.credited_amount == null ? "-" : `$${Number(request.credited_amount).toFixed(2)}`}
                            </td>
                            <td className="px-6 py-4 text-slate-300">{request.method}</td>
                            <td className="px-6 py-4 text-slate-300">{formatDateTime(request.processed_at)}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                  STATUS_STYLES[request.status] ?? "bg-white/10 text-slate-200"
                                }`}
                              >
                                {request.status === "processing" ? (
                                  <Clock3 size={12} />
                                ) : request.status === "approved" || request.status === "completed" ? (
                                  <CheckCircle size={12} />
                                ) : (
                                  <XCircle size={12} />
                                )}
                                {request.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] shadow-lg">
                <div className="border-b border-[#2a2f42] bg-[#1a1e2b] p-4">
                  <h3 className="font-bold text-white">Withdrawal History</h3>
                </div>
                {processedWithdrawals.length === 0 ? (
                  <div className="p-6 text-sm text-slate-300">No processed withdrawals yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm text-slate-200">
                      <thead className="border-b border-[#2a2f42] bg-[#1a1e2b] text-xs uppercase text-slate-300">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Request ID</th>
                          <th className="px-6 py-3 font-semibold">User</th>
                          <th className="px-6 py-3 font-semibold">Amount</th>
                          <th className="px-6 py-3 font-semibold">Method</th>
                          <th className="px-6 py-3 font-semibold">Processed</th>
                          <th className="px-6 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {processedWithdrawals.map((request) => (
                          <tr key={request.id} className="hover:bg-white/[0.02]">
                            <td className="px-6 py-4 font-mono text-slate-300">{request.id.slice(0, 8).toUpperCase()}</td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-white">{request.userName}</div>
                              <div className="text-xs text-slate-400">@{request.userHandle}</div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-white">${Number(request.amount).toFixed(2)}</td>
                            <td className="px-6 py-4 text-slate-300">{request.method}</td>
                            <td className="px-6 py-4 text-slate-300">{formatDateTime(request.processed_at)}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                  STATUS_STYLES[request.status] ?? "bg-white/10 text-slate-200"
                                }`}
                              >
                                {request.status === "processing" ? (
                                  <Clock3 size={12} />
                                ) : request.status === "approved" || request.status === "completed" ? (
                                  <CheckCircle size={12} />
                                ) : (
                                  <XCircle size={12} />
                                )}
                                {request.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Finance;




