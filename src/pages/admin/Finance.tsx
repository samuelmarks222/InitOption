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
import { adminUpdateWithdrawalStatus, WithdrawalDecision } from "@/lib/withdrawals";

type FinanceTab = "deposits" | "withdrawals" | "history";
type DepositRequest = Tables<"deposit_requests">;
type WithdrawalRequest = Tables<"withdrawal_requests">;
type ProfileLookup = Pick<Tables<"profiles">, "id" | "username" | "display_name">;

type DepositWithUser = DepositRequest & {
  userHandle: string;
  userName: string;
};

type WithdrawalWithUser = WithdrawalRequest & {
  userHandle: string;
  userName: string;
};

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-500/10 text-green-400",
  pending: "bg-orange-500/10 text-orange-300",
  rejected: "bg-red-500/10 text-red-400",
};

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
  <div className="rounded-2xl border border-white/5 bg-[#11161d] p-8 text-center shadow-lg">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
      <Clock3 className="h-5 w-5 text-gray-400" />
    </div>
    <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-400">{description}</p>
  </div>
);

const Finance = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>("deposits");
  const [searchTerm, setSearchTerm] = useState("");
  const [deposits, setDeposits] = useState<DepositWithUser[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingDepositId, setProcessingDepositId] = useState<string | null>(null);
  const [processingWithdrawalId, setProcessingWithdrawalId] = useState<string | null>(null);

  const loadFinanceData = async () => {
    setLoading(true);

    const [depositsResponse, withdrawalsResponse, profilesResponse] = await Promise.all([
      supabase.from("deposit_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, username, display_name"),
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

    if (profilesResponse.error) {
      toast({
        title: "Profiles unavailable",
        description: profilesResponse.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const profilesById = new Map<string, ProfileLookup>(
      (profilesResponse.data ?? []).map((profile) => [profile.id, profile]),
    );

    const nextDeposits = (depositsResponse.data ?? []).map((request) => {
      const profile = profilesById.get(request.user_id);
      return {
        ...request,
        userHandle: getUserHandle(profile, request.user_id),
        userName: getUserName(profile, request.user_id),
      };
    });

    const nextWithdrawals = (withdrawalsResponse.data ?? []).map((request) => {
      const profile = profilesById.get(request.user_id);
      return {
        ...request,
        userHandle: getUserHandle(profile, request.user_id),
        userName: getUserName(profile, request.user_id),
      };
    });

    setDeposits(nextDeposits);
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
        request.status,
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
  const pendingWithdrawals = useMemo(
    () => filteredWithdrawals.filter((request) => request.status === "pending"),
    [filteredWithdrawals],
  );
  const processedWithdrawals = useMemo(
    () => filteredWithdrawals.filter((request) => request.status !== "pending"),
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

  const handleWithdrawalDecision = async (requestId: string, status: WithdrawalDecision) => {
    setProcessingWithdrawalId(requestId);

    try {
      await adminUpdateWithdrawalStatus({ requestId, status });
      toast({
        title: `Withdrawal ${status}`,
        description:
          status === "approved"
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Financial Transactions</h2>
          <p className="mt-1 text-sm text-gray-400">
            Review pending deposits and withdrawals. Automatic blockchain detection is not wired yet, so deposits stay pending until a finance admin approves them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadFinanceData()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1A1F26] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-70"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#11161d] p-1 w-fit">
        <button
          onClick={() => setActiveTab("deposits")}
          className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold transition-colors ${
            activeTab === "deposits" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
          }`}
        >
          <ArrowDownToLine size={16} /> Pending Deposits
          <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] text-white">
            {deposits.filter((request) => request.status === "pending").length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("withdrawals")}
          className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold transition-colors ${
            activeTab === "withdrawals" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
          }`}
        >
          <ArrowUpFromLine size={16} /> Pending Withdrawals
          <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] text-white">
            {withdrawals.filter((request) => request.status === "pending").length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold transition-colors ${
            activeTab === "history" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
          }`}
        >
          <Filter size={16} /> Processed History
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search request ID, user, method or status..."
          className="w-full rounded-xl border border-white/10 bg-[#0b0e14] py-2.5 pl-9 pr-4 text-sm text-white outline-none transition-colors focus:border-blue-500"
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
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#11161d] shadow-lg">
              <div className="border-b border-white/5 bg-[#1A1F26] p-4">
                <h3 className="font-bold text-white">Deposit Requests</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-sm text-gray-300">
                  <thead className="border-b border-white/5 bg-[#11161d] text-xs uppercase text-gray-400">
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

                      return (
                        <tr key={request.id} className="hover:bg-white/[0.02]">
                          <td className="px-6 py-4 font-mono text-gray-400">{request.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{request.userName}</div>
                            <div className="text-xs text-gray-500">@{request.userHandle}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono font-bold text-green-300">${Number(request.amount).toFixed(2)}</div>
                            {request.tx_hash ? (
                              <div className="mt-1 max-w-[200px] truncate text-[11px] text-gray-500">TX: {request.tx_hash}</div>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 text-gray-300">{request.method}</td>
                          <td className="px-6 py-4 text-gray-400">
                            {Number(request.promo_bonus) > 0 ? `+${Number(request.promo_bonus).toFixed(2)}` : "-"}
                          </td>
                          <td className="px-6 py-4 text-gray-400">{formatDateTime(request.created_at)}</td>
                          <td className="px-6 py-4">
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
          ) : pendingWithdrawals.length === 0 ? (
            <EmptyState
              title="No pending withdrawal requests"
              description="New requests will appear here as soon as users submit them from the live account."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#11161d] shadow-lg">
              <div className="border-b border-white/5 bg-[#1A1F26] p-4">
                <h3 className="font-bold text-white">Withdrawal Requests</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm text-gray-300">
                  <thead className="border-b border-white/5 bg-[#11161d] text-xs uppercase text-gray-400">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Request ID</th>
                      <th className="px-6 py-3 font-semibold">User</th>
                      <th className="px-6 py-3 font-semibold">Amount</th>
                      <th className="px-6 py-3 font-semibold">Method</th>
                      <th className="px-6 py-3 font-semibold">Destination</th>
                      <th className="px-6 py-3 font-semibold">Submitted</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pendingWithdrawals.map((request) => {
                      const isBusy = processingWithdrawalId === request.id;

                      return (
                        <tr key={request.id} className="hover:bg-white/[0.02]">
                          <td className="px-6 py-4 font-mono text-gray-400">{request.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{request.userName}</div>
                            <div className="text-xs text-gray-500">@{request.userHandle}</div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-orange-300">${Number(request.amount).toFixed(2)}</td>
                          <td className="px-6 py-4 text-gray-300">{request.method}</td>
                          <td className="px-6 py-4 text-gray-400">
                            <div className="max-w-[240px] break-all">{request.destination}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-400">{formatDateTime(request.created_at)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => void handleWithdrawalDecision(request.id, "approved")}
                                disabled={isBusy}
                                className="flex items-center gap-1 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-bold uppercase text-green-400 transition-colors hover:bg-green-500 hover:text-white disabled:opacity-60"
                              >
                                <CheckCircle size={14} />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleWithdrawalDecision(request.id, "rejected")}
                                disabled={isBusy}
                                className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-60"
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </div>
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
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#11161d] shadow-lg">
                <div className="border-b border-white/5 bg-[#1A1F26] p-4">
                  <h3 className="font-bold text-white">Deposit History</h3>
                </div>
                {processedDeposits.length === 0 ? (
                  <div className="p-6 text-sm text-gray-400">No processed deposits yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1040px] text-left text-sm text-gray-300">
                      <thead className="border-b border-white/5 bg-[#11161d] text-xs uppercase text-gray-400">
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
                            <td className="px-6 py-4 font-mono text-gray-400">{request.id.slice(0, 8).toUpperCase()}</td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-white">{request.userName}</div>
                              <div className="text-xs text-gray-500">@{request.userHandle}</div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-white">${Number(request.amount).toFixed(2)}</td>
                            <td className="px-6 py-4 font-mono text-green-300">
                              {request.credited_amount == null ? "-" : `$${Number(request.credited_amount).toFixed(2)}`}
                            </td>
                            <td className="px-6 py-4 text-gray-400">{request.method}</td>
                            <td className="px-6 py-4 text-gray-400">{formatDateTime(request.processed_at)}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                  STATUS_STYLES[request.status] ?? "bg-white/10 text-gray-300"
                                }`}
                              >
                                {request.status === "approved" ? <CheckCircle size={12} /> : <XCircle size={12} />}
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

              <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#11161d] shadow-lg">
                <div className="border-b border-white/5 bg-[#1A1F26] p-4">
                  <h3 className="font-bold text-white">Withdrawal History</h3>
                </div>
                {processedWithdrawals.length === 0 ? (
                  <div className="p-6 text-sm text-gray-400">No processed withdrawals yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm text-gray-300">
                      <thead className="border-b border-white/5 bg-[#11161d] text-xs uppercase text-gray-400">
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
                            <td className="px-6 py-4 font-mono text-gray-400">{request.id.slice(0, 8).toUpperCase()}</td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-white">{request.userName}</div>
                              <div className="text-xs text-gray-500">@{request.userHandle}</div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-white">${Number(request.amount).toFixed(2)}</td>
                            <td className="px-6 py-4 text-gray-400">{request.method}</td>
                            <td className="px-6 py-4 text-gray-400">{formatDateTime(request.processed_at)}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                  STATUS_STYLES[request.status] ?? "bg-white/10 text-gray-300"
                                }`}
                              >
                                {request.status === "approved" ? <CheckCircle size={12} /> : <XCircle size={12} />}
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
