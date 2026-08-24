import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock,
  DollarSign, Loader2, Megaphone, ShieldCheck, Trophy, XCircle, TrendingUp, Filter, Search,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "@/integrations/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";

const ACCENT = "#00C98D";
const BG_SURFACE = "#0D1420";
const BG_TERTIARY = "#121B29";
const BORDER = "#202B3A";
const PROFIT = "#00C98D";
const LOSS = "#EF4444";

const formatMoney = (v: number) =>
  `$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCompact = (v: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);

interface TradeRow {
  id: string;
  user: string;
  asset: string;
  direction: string;
  amount: string;
  result: string;
  time: string;
  won: boolean;
  status: string;
}

interface WithdrawRow {
  amount: string;
  id: string;
  method: string;
  time: string;
  user: string;
}

const AdminDashboard = () => {
  const { profile } = useAuth();
  const { platformName } = useSiteBranding();
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeTraders, setActiveTraders] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [tradingVolume, setTradingVolume] = useState(0);
  const [netProfitLoss, setNetProfitLoss] = useState(0);
  const [profitData, setProfitData] = useState<{ name: string; profit: number }[]>([]);
  const [volumeData, setVolumeData] = useState<{ name: string; volume: number }[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeRow[]>([]);
  const [pendingWds, setPendingWds] = useState<WithdrawRow[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const weekAgo = new Date(todayStart);
        weekAgo.setDate(weekAgo.getDate() - 6);

        const [
          userCountR,
          activeR,
          depSumR,
          wdSumR,
          chartTradesR,
          recentTradesR,
          recentWdR,
        ] = await Promise.all([
          api.from("profiles").select("id", { count: "exact", head: true }),
          api.from("profiles").select("id", { count: "exact", head: true }).gt("trade_count_30d", 0),
          api.from("deposit_requests").select("amount").eq("status", "completed"),
          api.from("withdrawal_requests").select("amount").eq("status", "completed"),
          api.from("trades")
            .select("profit, opened_at, closed_at, amount, status")
            .gte("opened_at", weekAgo.toISOString())
            .limit(10000),
          api.from("trades")
            .select("id, user_id, asset_symbol, direction, amount, profit, closed_at, status")
            .order("closed_at", { ascending: false })
            .limit(8),
          api.from("withdrawal_requests")
            .select("id, user_id, amount, payment_method, created_at")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        setTotalUsers(userCountR?.count ?? 0);
        setActiveTraders(activeR?.count ?? 0);
        setTotalDeposits((depSumR?.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0));
        setTotalWithdrawals((wdSumR?.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0));

        const trades = chartTradesR?.data ?? [];
        let totVol = 0;
        let totProfit = 0;
        trades.forEach((t) => {
          totVol += Number(t.amount ?? 0);
          totProfit += (Number(t.amount ?? 0) - Number(t.profit ?? 0));
        });
        setTradingVolume(totVol);
        setNetProfitLoss(totProfit);

        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekAgo);
          d.setDate(d.getDate() + i);
          return d;
        });

        setProfitData(
          days.map((d) => {
            const dayEnd = new Date(d);
            dayEnd.setDate(d.getDate() + 1);
            const dayTrades = trades.filter((t) => t.closed_at && new Date(t.closed_at) >= d && new Date(t.closed_at) < dayEnd);
            const profit = dayTrades.reduce((s, t) => s + (Number(t.amount ?? 0) - Number(t.profit ?? 0)), 0);
            return { name: d.toLocaleDateString("en-US", { weekday: "short" }), profit };
          })
        );

        setVolumeData(
          days.map((d) => {
            const dayEnd = new Date(d);
            dayEnd.setDate(d.getDate() + 1);
            const vol = trades
              .filter((t) => t.opened_at && new Date(t.opened_at) >= d && new Date(t.opened_at) < dayEnd)
              .reduce((s, t) => s + Number(t.amount ?? 0), 0);
            return { name: d.toLocaleDateString("en-US", { weekday: "short" }), volume: vol };
          })
        );

        const recentTradesList = recentTradesR?.data ?? [];
        const recentWdList = recentWdR?.data ?? [];

        const allUids = [...new Set([...recentTradesList.map((t) => t.user_id), ...recentWdList.map((w) => w.user_id)])];
        const profileMap = new Map<string, string>();
        if (allUids.length > 0) {
          const { data: pRows } = await api.from("profiles").select("id, display_name, username").in("id", allUids);
          (pRows ?? []).forEach((p) => { profileMap.set(p.id, p.display_name || p.username || p.id.slice(0, 8)); });
        }

        setRecentTrades(
          recentTradesList.map((t) => ({
            id: t.id,
            user: profileMap.get(t.user_id) || "User",
            asset: t.asset_symbol,
            direction: t.direction,
            amount: formatMoney(Number(t.amount ?? 0)),
            result: Number(t.profit ?? 0) >= 0 ? `+$${Number(t.profit ?? 0).toFixed(2)}` : `-$${Number(t.amount ?? 0).toFixed(2)}`,
            time: t.closed_at ? new Date(t.closed_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "LIVE",
            won: Number(t.profit ?? 0) >= 0,
            status: t.status ?? "closed",
          }))
        );

        setPendingWds(
          recentWdList.map((w) => ({
            id: w.id,
            user: profileMap.get(w.user_id) || "User",
            amount: formatMoney(Number(w.amount ?? 0)),
            method: w.payment_method || "M-PESA",
            time: new Date(w.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          }))
        );
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00C98D]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Operations Header Strip */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
        <div>
          <h2 className="text-xl font-black text-white">OPERATIONS OVERVIEW</h2>
          <p className="text-xs text-[#8D9AAF]">Real-time brokerage metrics & operational activity feed.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-md border border-[#00C98D]/20 bg-[#00C98D]/10 px-2.5 py-1 text-[11px] font-bold text-[#00C98D]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00C98D] animate-pulse" /> LIVE ENGINE
          </span>
          <span className="text-xs font-mono text-[#5E6B7D]">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      {/* Structured Financial Metrics Strip (NO CARDS - Horizontal Panel) */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="grid grid-cols-2 divide-x divide-y divide-[#202B3A] md:grid-cols-6 md:divide-y-0">
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Trading Volume</p>
            <p className="mt-1 text-xl font-black text-white font-mono">{formatMoney(tradingVolume)}</p>
            <span className="mt-0.5 block text-[10px] font-semibold text-[#00C98D]">+12.4% vs last week</span>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Total Users</p>
            <p className="mt-1 text-xl font-black text-white font-mono">{totalUsers}</p>
            <span className="mt-0.5 block text-[10px] font-semibold text-[#8D9AAF]">{activeTraders} active (30d)</span>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Completed Deposits</p>
            <p className="mt-1 text-xl font-black text-white font-mono">{formatMoney(totalDeposits)}</p>
            <span className="mt-0.5 block text-[10px] font-semibold text-[#00C98D]">Processed</span>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Total Withdrawals</p>
            <p className="mt-1 text-xl font-black text-white font-mono">{formatMoney(totalWithdrawals)}</p>
            <span className="mt-0.5 block text-[10px] font-semibold text-[#F59E0B]">{pendingWds.length} pending review</span>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Brokerage Net P&L</p>
            <p className={`mt-1 text-xl font-black font-mono ${netProfitLoss >= 0 ? "text-[#00C98D]" : "text-[#EF4444]"}`}>
              {netProfitLoss >= 0 ? "+" : ""}{formatMoney(netProfitLoss)}
            </p>
            <span className="mt-0.5 block text-[10px] font-semibold text-[#00C98D]">Positive margin</span>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Pending Queue</p>
            <p className="mt-1 text-xl font-black text-[#F59E0B] font-mono">{pendingWds.length}</p>
            <Link to="/admin/finance?tab=withdrawals" className="mt-0.5 block text-[10px] font-semibold text-[#00C98D] hover:underline">
              Review withdrawals &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Trading Analytics Charts Section */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Net Profit Chart */}
        <div className="rounded-lg border bg-[#0D1420] p-4" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between mb-3 border-b pb-2" style={{ borderColor: BORDER }}>
            <span className="text-xs font-bold uppercase tracking-wider text-white">Daily Brokerage Revenue (7D)</span>
            <span className="text-[11px] font-mono text-[#8D9AAF]">Net Settlement Profit</span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profitData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#202B3A" vertical={false} />
                <XAxis dataKey="name" stroke="#5E6B7D" tick={{ fontSize: 11 }} axisLine={false} />
                <YAxis stroke="#5E6B7D" tick={{ fontSize: 11 }} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: "#121B29", borderColor: "#202B3A", color: "#fff", fontSize: 11 }} />
                <Line type="monotone" dataKey="profit" stroke="#00C98D" strokeWidth={2} dot={{ fill: "#00C98D", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volume Chart */}
        <div className="rounded-lg border bg-[#0D1420] p-4" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between mb-3 border-b pb-2" style={{ borderColor: BORDER }}>
            <span className="text-xs font-bold uppercase tracking-wider text-white">Daily Trading Volume (7D)</span>
            <span className="text-[11px] font-mono text-[#8D9AAF]">Gross Volume</span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#202B3A" vertical={false} />
                <XAxis dataKey="name" stroke="#5E6B7D" tick={{ fontSize: 11 }} axisLine={false} />
                <YAxis stroke="#5E6B7D" tick={{ fontSize: 11 }} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: "#121B29", borderColor: "#202B3A", color: "#fff", fontSize: 11 }} />
                <Bar dataKey="volume" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dense Operational Tables Row */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Live / Recent Trading Activity Ledger */}
        <div className="rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: BORDER }}>
            <span className="text-xs font-bold uppercase tracking-wider text-white">Recent Trading Activity</span>
            <Link to="/admin/trades" className="text-xs font-semibold text-[#00C98D] hover:underline">
              View All Trades &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: BORDER }}>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Asset</th>
                  <th className="px-4 py-2.5">Direction</th>
                  <th className="px-4 py-2.5">Stake</th>
                  <th className="px-4 py-2.5">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202B3A]">
                {recentTrades.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#5E6B7D]">No recent trades logged.</td>
                  </tr>
                ) : (
                  recentTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[#8D9AAF]">{t.time}</td>
                      <td className="px-4 py-2.5 font-semibold text-white truncate max-w-[110px]">{t.user}</td>
                      <td className="px-4 py-2.5 font-semibold text-white">{t.asset}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          t.direction === "higher" || t.direction === "CALL" ? "bg-[#00C98D]/15 text-[#00C98D]" : "bg-[#EF4444]/15 text-[#EF4444]"
                        }`}>
                          {t.direction?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-white">{t.amount}</td>
                      <td className={`px-4 py-2.5 font-mono font-bold ${t.won ? "text-[#00C98D]" : "text-[#EF4444]"}`}>
                        {t.result}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Withdrawals Action Ledger */}
        <div className="rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: BORDER }}>
            <span className="text-xs font-bold uppercase tracking-wider text-white">Pending Withdrawals Queue</span>
            <Link to="/admin/finance?tab=withdrawals" className="text-xs font-semibold text-[#00C98D] hover:underline">
              Manage Queue &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: BORDER }}>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202B3A]">
                {pendingWds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-[#5E6B7D]">No pending withdrawal requests.</td>
                  </tr>
                ) : (
                  pendingWds.map((w) => (
                    <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-white truncate max-w-[110px]">{w.user}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-white">{w.amount}</td>
                      <td className="px-4 py-2.5 text-[#8D9AAF]">{w.method}</td>
                      <td className="px-4 py-2.5 font-mono text-[#5E6B7D]">{w.time}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          to="/admin/finance?tab=withdrawals"
                          className="inline-flex items-center gap-1 rounded border border-[#00C98D]/30 bg-[#00C98D]/10 px-2 py-1 text-[11px] font-bold text-[#00C98D] hover:bg-[#00C98D] hover:text-black transition-colors"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
