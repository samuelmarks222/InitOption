import { useEffect, useMemo, useState } from "react";
import { DatabaseZap, RefreshCw, Search } from "lucide-react";
import { realtime } from "@/integrations/pusher/realtime";
import { api } from "@/integrations/api/client";
import { Json, Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { isMissingTradeBalanceAuditTableError, type TradeBalanceAuditEntry } from "@/lib/tradeBalanceAudit";

type WithdrawalRequest = Tables<"withdrawal_requests">;
type ProfileLookup = Pick<Tables<"profiles">, "display_name" | "id" | "username">;

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
      api.from("withdrawal_requests")
        .select("id, amount, provider_amount, audit_log, created_at, status, user_id, provider_name")
        .eq("provider_name", "sasapay")
        .order("created_at", { ascending: false }),
      api.from("profiles").select("id, username, display_name"),
      api.from("trade_balance_audit_logs").select("*").order("created_at", { ascending: false }).limit(300),
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
    const channel = realtime
      .channel("admin-withdrawal-audit-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => {
        void loadAuditEntries();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_balance_audit_logs" }, () => {
        void loadAuditEntries();
      })
      .subscribe();

    return () => {
      void realtime.removeChannel(channel);
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: "#202B3A" }}>
        <div>
          <h2 className="text-xl font-black text-white">AUDIT & COMPLIANCE LEDGER</h2>
          <p className="text-xs text-[#8D9AAF]">M-PESA withdrawal timeline, staff actions, and trade balance change log.</p>
        </div>
        <button
          type="button" onClick={() => void loadAuditEntries()} disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-[#202B3A] bg-[#0D1420] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-[#00C98D]" : ""} /> Refresh Feed
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center gap-3 rounded-lg border bg-[#0D1420] p-3" style={{ borderColor: "#202B3A" }}>
        <div className="relative w-80">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search request, actor, note or status..."
            className="w-full h-8 rounded-lg border bg-[#080D16] pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-500 focus:border-[#00C98D]"
            style={{ borderColor: "#202B3A" }}
          />
        </div>
      </div>

      {/* M-PESA Withdrawal Audit Table */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: "#202B3A" }}>
        <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: "#202B3A" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">M-PESA Withdrawal Audit Trail</p>
        </div>
        {loading ? (
          <div className="px-4 py-12 text-center text-xs text-[#5E6B7D]">Loading audit feed...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No audit events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: "#202B3A" }}>
                  <th className="px-4 py-3">TIME</th>
                  <th className="px-4 py-3">ACTION</th>
                  <th className="px-4 py-3">TRADER</th>
                  <th className="px-4 py-3">STAFF / SOURCE</th>
                  <th className="px-4 py-3">AMOUNT</th>
                  <th className="px-4 py-3">REQUEST</th>
                  <th className="px-4 py-3">STATUS</th>
                  <th className="px-4 py-3">NOTE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202B3A]">
                {filteredEntries.map((entry) => (
                  <tr key={`${entry.requestId}:${entry.action}:${entry.createdAt}`} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[#8D9AAF]">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-4 py-2.5 font-semibold text-white">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                    <td className="px-4 py-2.5 text-gray-300">{entry.userName}</td>
                    <td className="px-4 py-2.5 text-gray-300">
                      {entry.actorName ? (
                        <div>
                          <div className="font-semibold text-white">{entry.actorName}</div>
                          {entry.actorHandle ? <div className="text-[10px] text-[#5E6B7D]">@{entry.actorHandle}</div> : null}
                        </div>
                      ) : "System"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-mono font-bold text-white">${entry.amount.toFixed(2)}</div>
                      {entry.amountKes != null ? <div className="text-[10px] text-[#5E6B7D]">KES {entry.amountKes.toFixed(2)}</div> : null}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[#8D9AAF]">{entry.requestId.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        entry.status === "completed" ? "bg-[#00C98D]/15 text-[#00C98D]" : entry.status === "rejected" || entry.status === "failed" ? "bg-[#EF4444]/15 text-[#EF4444]" : "bg-[#F59E0B]/15 text-[#F59E0B]"
                      }`}>{entry.status || "-"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[#8D9AAF] max-w-[280px] whitespace-normal break-words">{entry.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trade Balance Audit Table */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: "#202B3A" }}>
        <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: "#202B3A" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Trade Balance Audit Log — Every balance change recorded before & after</p>
        </div>
        {loading ? (
          <div className="px-4 py-12 text-center text-xs text-[#5E6B7D]">Loading trade balance audit...</div>
        ) : filteredTradeAuditEntries.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No trade balance audit events yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: "#202B3A" }}>
                  <th className="px-4 py-3">TIME</th>
                  <th className="px-4 py-3">EVENT</th>
                  <th className="px-4 py-3">TRADER</th>
                  <th className="px-4 py-3">ASSET</th>
                  <th className="px-4 py-3">CHANGE</th>
                  <th className="px-4 py-3">STORED BALANCE</th>
                  <th className="px-4 py-3">AVAILABLE</th>
                  <th className="px-4 py-3">RESERVED</th>
                  <th className="px-4 py-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202B3A]">
                {filteredTradeAuditEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[#8D9AAF]">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-4 py-2.5 font-semibold text-white">
                      {entry.eventType === "trade_open" ? "Trade Open" : "Trade Close"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-300">{entry.userName}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-white">{entry.assetSymbol}</span>
                      <div className="text-[10px] uppercase text-[#5E6B7D]">{entry.direction}</div>
                    </td>
                    <td className={`px-4 py-2.5 font-mono font-bold ${entry.changeAmount >= 0 ? "text-[#00C98D]" : "text-[#EF4444]"}`}>
                      {entry.changeAmount >= 0 ? "+" : "-"}${Math.abs(entry.changeAmount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-300">
                      ${entry.balanceBefore.toFixed(2)} → ${entry.balanceAfter.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-300">
                      ${entry.availableBefore.toFixed(2)} → ${entry.availableAfter.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-300">${entry.reservedAmount.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-gray-300">{entry.status || "-"}</td>
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

