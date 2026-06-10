import { useEffect, useMemo, useState } from "react";
import { DatabaseZap, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Json, Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { isMissingTradeBalanceAuditTableError, type TradeBalanceAuditEntry } from "@/lib/tradeBalanceAudit";

type WithdrawalRequest = Tables<"withdrawal_requests">;
type ProfileLookup = Pick<Tables<"profiles">, "display_name" | "id" | "username">;
const supabaseAny = supabase as any;

type AuditEntry = {
  action: string;
  actorHandle: string | null;
  actorName: string | null;
  amount: number;
  amountKes: number | null;
  createdAt: string;
  note: string | null;
  requestId: string;
  status: string | null;
  userName: string;
};

type TradeAuditRow = {
  id: string;
  createdAt: string;
  eventType: string;
  userName: string;
  assetSymbol: string;
  direction: string;
  changeAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  availableBefore: number;
  availableAfter: number;
  reservedAmount: number;
  status: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  approved: "Approved",
  completed: "Completed",
  completed_manual: "Marked Paid",
  dispatch_failed: "Dispatch Failed",
  failed: "Failed",
  failed_manual: "Marked Failed",
  processing_started: "Processing Started",
  rejected: "Rejected",
  requested: "Requested",
  retry_scheduled: "Retry Scheduled",
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });

const asString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const readAuditArray = (value: Json | null) => (Array.isArray(value) ? value : []);

const getUserName = (profile: ProfileLookup | undefined, fallbackId: string) =>
  profile?.display_name || profile?.username || `User ${fallbackId.slice(0, 8).toUpperCase()}`;

const getUserHandle = (profile: ProfileLookup | undefined, fallbackId: string) =>
  profile?.username || fallbackId.slice(0, 8).toUpperCase();

const AuditLogs = () => {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [tradeAuditEntries, setTradeAuditEntries] = useState<TradeAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadAuditEntries = async () => {
    setLoading(true);

    const [withdrawalsResponse, profilesResponse, tradeAuditResponse] = await Promise.all([
      supabase
        .from("withdrawal_requests")
        .select("id, amount, provider_amount, audit_log, created_at, status, user_id, provider_name")
        .eq("provider_name", "sasapay")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, username, display_name"),
      supabaseAny.from("trade_balance_audit_logs").select("*").order("created_at", { ascending: false }).limit(300),
    ]);

    if (withdrawalsResponse.error) {
      toast({
        title: "Audit feed unavailable",
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

    const nextEntries = ((withdrawalsResponse.data ?? []) as Pick<
      WithdrawalRequest,
      "amount" | "audit_log" | "created_at" | "id" | "provider_amount" | "status" | "user_id"
    >[]).flatMap((request) => {
      const requestProfile = profilesById.get(request.user_id);
      const userName = getUserName(requestProfile, request.user_id);
      const auditTrail = readAuditArray(request.audit_log);

      return auditTrail.flatMap((entry): AuditEntry[] => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return [];
        }

        const row = entry as Record<string, unknown>;
        const actorId = asString(row.actor_id);
        const actorProfile = actorId ? profilesById.get(actorId) : undefined;
        const createdAt = asString(row.created_at) || request.created_at;
        const action = asString(row.action) || "updated";
        const note =
          asString(row.admin_note) ||
          asString(row.failure_reason) ||
          asString(row.provider_result_desc) ||
          null;

        return [
          {
            action,
            actorHandle: actorId ? getUserHandle(actorProfile, actorId) : null,
            actorName: actorId ? getUserName(actorProfile, actorId) : null,
            amount: Number(request.amount ?? 0),
            amountKes: asNumber(request.provider_amount),
            createdAt,
            note,
            requestId: request.id,
            status: asString(row.status) || request.status,
            userName,
          },
        ];
      });
    });

    nextEntries.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    setAuditEntries(nextEntries);

    if (tradeAuditResponse.error && !isMissingTradeBalanceAuditTableError(tradeAuditResponse.error)) {
      toast({
        title: "Trade balance audit unavailable",
        description: tradeAuditResponse.error.message,
        variant: "destructive",
      });
    }

    const nextTradeAuditEntries = ((tradeAuditResponse.data ?? []) as TradeBalanceAuditEntry[]).map((entry) => {
      const profile = profilesById.get(entry.user_id);

      return {
        id: entry.id,
        createdAt: entry.created_at,
        eventType: entry.event_type,
        userName: getUserName(profile, entry.user_id),
        assetSymbol: entry.asset_symbol,
        direction: entry.direction,
        changeAmount: Number(entry.change_amount ?? 0),
        balanceBefore: Number(entry.balance_before ?? 0),
        balanceAfter: Number(entry.balance_after ?? 0),
        availableBefore: Number(entry.available_balance_before ?? 0),
        availableAfter: Number(entry.available_balance_after ?? 0),
        reservedAmount: Number(entry.reserved_withdrawal_balance ?? 0),
        status: entry.status,
      };
    });

    setTradeAuditEntries(nextTradeAuditEntries);
    setLoading(false);
  };

  useEffect(() => {
    void loadAuditEntries();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-withdrawal-audit-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => {
        void loadAuditEntries();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_balance_audit_logs" }, () => {
        void loadAuditEntries();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    if (!normalizedSearch) return auditEntries;

    return auditEntries.filter((entry) =>
      [
        entry.action,
        entry.actorHandle,
        entry.actorName,
        entry.note,
        entry.requestId,
        entry.status,
        entry.userName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [auditEntries, normalizedSearch]);

  const filteredTradeAuditEntries = useMemo(() => {
    if (!normalizedSearch) return tradeAuditEntries;

    return tradeAuditEntries.filter((entry) =>
      [
        entry.eventType,
        entry.userName,
        entry.assetSymbol,
        entry.direction,
        entry.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [normalizedSearch, tradeAuditEntries]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Audit Logs</h2>
          <p className="mt-1 text-sm text-slate-300">
            Review the full M-PESA withdrawal timeline, including finance approvals, manual payout notes, and final outcomes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAuditEntries()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-70" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)", }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border shadow-lg" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
        <div className="border-b p-4" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className=\"relative w-full max-w-sm\">
              <Search className=\"pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400\" />
              <input
                type=\"text\"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder=\"Search request, actor, note or status...\"
                className=\"w-full rounded-lg border py-2 pl-9 pr-4 text-sm text-white outline-none transition-colors\" style={{ borderColor: \"var(--admin-border)\", background: \"var(--admin-canvas)\" }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--admin-green)/0.10" }}>
              <RefreshCw className="h-8 w-8 animate-spin" style={{ color: "var(--admin-green)" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Loading audit feed</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Pulling the latest M-PESA withdrawal actions from your live manual payout workflow.
              </p>
            </div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--admin-green)/0.10" }}>
              <DatabaseZap className="h-8 w-8" style={{ color: "var(--admin-green)" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No audit events yet</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                New M-PESA withdrawal requests, approvals, manual payout notes, and final outcomes will appear here automatically.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm text-slate-200">
              <thead className="border-b text-xs uppercase text-slate-300\" style={{ borderColor: \"var(--admin-border)\", background: \"var(--admin-surface)\" }}>
                <tr>
                  <th className="px-6 py-3 font-semibold">Time</th>
                  <th className="px-6 py-3 font-semibold">Action</th>
                  <th className="px-6 py-3 font-semibold">Trader</th>
                  <th className="px-6 py-3 font-semibold">Staff / Source</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Request</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEntries.map((entry) => (
                  <tr key={`${entry.requestId}:${entry.action}:${entry.createdAt}`} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-slate-300">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-6 py-4 font-medium text-white">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                    <td className="px-6 py-4 text-slate-200">{entry.userName}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {entry.actorName ? (
                        <div>
                          <div className="text-white">{entry.actorName}</div>
                          {entry.actorHandle ? <div className="text-xs text-slate-400">@{entry.actorHandle}</div> : null}
                        </div>
                      ) : (
                        "System"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-white">${entry.amount.toFixed(2)}</div>
                      {entry.amountKes != null ? (
                        <div className="mt-1 text-xs text-slate-400">KES {entry.amountKes.toFixed(2)}</div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">{entry.requestId.slice(0, 8).toUpperCase()}</td>
                    <td className="px-6 py-4 text-slate-200">{entry.status || "-"}</td>
                    <td className="px-6 py-4 text-slate-300">
                      <div className="max-w-[340px] whitespace-normal break-words">
                        {entry.note || "-"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border shadow-lg\" style={{ borderColor: \"var(--admin-border)\", background: \"var(--admin-surface)\" }}>
        <div className=\"border-b p-4\" style={{ borderColor: \"var(--admin-border)\", background: \"var(--admin-surface)\" }}>
          <div className=\"text-lg font-bold text-white\">Trade Balance Audit</div>
          <div className="mt-1 text-sm text-slate-300">
            Every trade open and close records the exact balance before, change amount, and balance after.
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">Loading trade balance audit...</div>
        ) : filteredTradeAuditEntries.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">No trade balance audit events yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm text-slate-200">
              <thead className="border-b text-xs uppercase text-slate-300\" style={{ borderColor: \"var(--admin-border)\", background: \"var(--admin-surface)\" }}>
                <tr>
                  <th className="px-6 py-3 font-semibold">Time</th>
                  <th className="px-6 py-3 font-semibold">Event</th>
                  <th className="px-6 py-3 font-semibold">Trader</th>
                  <th className="px-6 py-3 font-semibold">Asset</th>
                  <th className="px-6 py-3 font-semibold">Change</th>
                  <th className="px-6 py-3 font-semibold">Stored Balance</th>
                  <th className="px-6 py-3 font-semibold">Available Balance</th>
                  <th className="px-6 py-3 font-semibold">Reserved</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTradeAuditEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-slate-300">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-6 py-4 font-medium text-white">
                      {entry.eventType === "trade_open" ? "Trade Open" : "Trade Close"}
                    </td>
                    <td className="px-6 py-4 text-slate-200">{entry.userName}</td>
                    <td className="px-6 py-4 text-white">
                      {entry.assetSymbol}
                      <div className="mt-1 text-xs uppercase text-slate-400">{entry.direction}</div>
                    </td>
                    <td className={`px-6 py-4 font-mono font-bold ${entry.changeAmount >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {entry.changeAmount >= 0 ? "+" : "-"}${Math.abs(entry.changeAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-200">
                      {`$${entry.balanceBefore.toFixed(2)} -> $${entry.balanceAfter.toFixed(2)}`}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">
                      {`$${entry.availableBefore.toFixed(2)} -> $${entry.availableAfter.toFixed(2)}`}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">${entry.reservedAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-200">{entry.status || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;

