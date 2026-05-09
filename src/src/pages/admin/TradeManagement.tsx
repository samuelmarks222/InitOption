import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock3, Search, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type TradeRow = Tables<"trades">;
type ProfileRow = Pick<Tables<"profiles">, "id" | "username" | "display_name">;

type TradeWithUser = TradeRow & {
  userLabel: string;
};

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const formatSignedMoney = (value: number) => `${value > 0 ? "+" : value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;

const formatTimeRemaining = (trade: TradeRow, nowMs: number) => {
  const expiryMs = new Date(trade.opened_at).getTime() + trade.expiry_seconds * 1000;
  const remainingMs = Math.max(0, expiryMs - nowMs);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getUserLabel = (profilesById: Map<string, ProfileRow>, userId: string) => {
  const profile = profilesById.get(userId);
  return profile?.display_name || profile?.username || `User ${userId.slice(0, 8).toUpperCase()}`;
};

const TradeManagement = () => {
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<TradeWithUser[]>([]);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);

      const { data: tradeRows, error: tradeError } = await supabase
        .from("trades")
        .select("*")
        .order("opened_at", { ascending: false })
        .limit(1000);

      if (tradeError) {
        console.error("Failed to load trades for admin trade management", tradeError);
        setTrades([]);
        setLoading(false);
        return;
      }

      const userIds = Array.from(new Set((tradeRows ?? []).map((trade) => trade.user_id)));

      let profilesById = new Map<string, ProfileRow>();
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", userIds);

        if (profileError) {
          console.error("Failed to load profiles for admin trade management", profileError);
        } else {
          profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
        }
      }

      setTrades(
        (tradeRows ?? []).map((trade) => ({
          ...trade,
          userLabel: getUserLabel(profilesById, trade.user_id),
        })),
      );
      setLoading(false);
    };

    void fetchTrades();
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const liveTrades = useMemo(
    () =>
      trades
        .filter((trade) => trade.status === "open")
        .filter((trade) => {
          if (!normalizedSearch) return true;
          return [trade.userLabel, trade.asset_symbol, trade.id].some((value) => value.toLowerCase().includes(normalizedSearch));
        })
        .sort((left, right) => new Date(right.opened_at).getTime() - new Date(left.opened_at).getTime()),
    [normalizedSearch, trades],
  );

  const historyTrades = useMemo(
    () =>
      trades
        .filter((trade) => trade.status !== "open")
        .filter((trade) => {
          if (!normalizedSearch) return true;
          return [trade.userLabel, trade.asset_symbol, trade.id].some((value) => value.toLowerCase().includes(normalizedSearch));
        })
        .sort(
          (left, right) =>
            new Date(right.closed_at ?? right.opened_at).getTime() - new Date(left.closed_at ?? left.opened_at).getTime(),
        ),
    [normalizedSearch, trades],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Trade Management</h2>
          <p className="mt-1 text-sm text-slate-300">Monitor real open positions and review historical trade outcomes.</p>
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by trade ID, user, or asset..."
            className="w-full rounded-xl border border-[#1e2330] bg-[#1c1f2d] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-slate-400 focus:border-[#0fa053]"
          />
        </div>
      </div>

      <div className="flex w-fit items-center gap-2 rounded-xl border border-[#1e2330] bg-[#1e2330] p-1">
        <button
          onClick={() => setActiveTab("live")}
          className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold transition-colors ${
            activeTab === "live" ? "bg-[#0fa053] text-white shadow-lg" : "text-slate-300 hover:text-white"
          }`}
        >
          <Activity size={16} className={activeTab === "live" ? "animate-pulse" : ""} />
          Live Trades
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold transition-colors ${
            activeTab === "history" ? "bg-[#0fa053] text-white shadow-lg" : "text-slate-300 hover:text-white"
          }`}
        >
          <Clock3 size={16} />
          Trade History
        </button>
      </div>

      {activeTab === "live" ? (
        <div className="overflow-hidden rounded-2xl border border-[#1e2330] bg-[#1e2330] shadow-lg">
          <div className="border-b border-[#1e2330] bg-[#1e2330] p-4">
            <h3 className="flex items-center gap-2 font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Active Positions
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm text-slate-200">
              <thead className="border-b border-[#1e2330] bg-[#1e2330] text-xs uppercase text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-semibold">User</th>
                  <th className="px-6 py-3 font-semibold">Asset & Direction</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Entry Price</th>
                  <th className="px-6 py-3 font-semibold">Potential Profit</th>
                  <th className="px-6 py-3 font-semibold">Time Remaining</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                      Loading live trades...
                    </td>
                  </tr>
                ) : liveTrades.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                      No live trades match the current filters.
                    </td>
                  </tr>
                ) : (
                  liveTrades.map((trade) => (
                    <tr key={trade.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-medium text-white">{trade.userLabel}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-bold text-white">
                          {trade.asset_symbol}
                          {trade.direction === "higher" ? (
                            <ArrowUpRight size={14} className="text-green-400" />
                          ) : (
                            <ArrowDownRight size={14} className="text-red-400" />
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">{trade.id.slice(0, 8).toUpperCase()}</div>
                      </td>
                      <td className="px-6 py-4 font-mono">{formatMoney(trade.amount)}</td>
                      <td className="px-6 py-4 font-mono text-slate-200">{trade.entry_price.toFixed(5)}</td>
                      <td className="px-6 py-4 font-mono text-green-400">{formatMoney(trade.amount * trade.payout_rate)}</td>
                      <td className="px-6 py-4 font-mono font-bold text-[#0fa053]">{formatTimeRemaining(trade, nowMs)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-[#0fa053]/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0fa053]">
                          Open
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#1e2330] bg-[#1e2330] shadow-lg">
          <div className="border-b border-[#1e2330] bg-[#1e2330] p-4">
            <h3 className="font-bold text-white">Historical Trades</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm text-slate-200">
              <thead className="border-b border-[#1e2330] bg-[#1e2330] text-xs uppercase text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-semibold">User</th>
                  <th className="px-6 py-3 font-semibold">Asset / Dir</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Entry / Exit</th>
                  <th className="px-6 py-3 font-semibold">Net P&L</th>
                  <th className="px-6 py-3 font-semibold">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">
                      Loading trade history...
                    </td>
                  </tr>
                ) : historyTrades.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">
                      No historical trades match the current filters.
                    </td>
                  </tr>
                ) : (
                  historyTrades.map((trade) => {
                    const outcome = trade.status === "won" ? "won" : trade.status === "lost" ? "lost" : trade.status;
                    const profit = Number(trade.profit ?? 0);

                    return (
                      <tr key={trade.id} className="transition-colors hover:bg-white/[0.02]">
                        <td className="px-6 py-4 font-medium text-white">{trade.userLabel}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{trade.asset_symbol}</div>
                          <div className="text-xs uppercase text-slate-400">{trade.direction}</div>
                        </td>
                        <td className="px-6 py-4 font-mono">{formatMoney(trade.amount)}</td>
                        <td className="px-6 py-4 font-mono text-slate-300">
                          {trade.entry_price.toFixed(5)} → {trade.exit_price?.toFixed(5) ?? "—"}
                        </td>
                        <td className={`px-6 py-4 font-mono font-bold ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {formatSignedMoney(profit)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex w-fit items-center gap-1 rounded px-2 py-1 text-xs font-bold uppercase tracking-wider ${
                              outcome === "won" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {outcome === "won" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {outcome}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeManagement;

