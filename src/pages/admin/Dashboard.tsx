import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock,
  DollarSign, Loader2, ShieldCheck, Trophy, XCircle, TrendingUp, Users, Wallet, ChevronRight, RefreshCw,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "@/integrations/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";

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

const Dashboard = () => {
  const { profile } = useAuth();
  const { platformName } = useSiteBranding();
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeTraders, setActiveTraders] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [tradingVolume, setTradingVolume] = useState(0);
  const [netProfitLoss, setNetProfitLoss] = useState(0);
  const [profitData, setProfitData] = useState<{ name: string; profit: number }[]>([]);
  const [volumeData, setVolumeData] = useState<{ name: string; volume: number }[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeRow[]>([]);
  const [pendingWds, setPendingWds] = useState<WithdrawRow[]>([]);

  const fetchAllData = async () => {
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

      setRecentTrades(
        (recentTradesR?.data ?? []).map((t: any) => ({
          id: t.id,
          user: (t.user_id ?? "User").slice(0, 8),
          asset: t.asset_symbol ?? "EUR/USD",
          direction: t.direction ?? "CALL",
          amount: formatMoney(Number(t.amount ?? 0)),
          result: formatMoney(Number(t.profit ?? 0)),
          time: t.closed_at ? new Date(t.closed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-",
          won: Number(t.profit ?? 0) > 0,
          status: t.status ?? "closed",
        }))
      );

      setPendingWds(
        (recentWdR?.data ?? []).map((w: any) => ({
          id: w.id,
          user: (w.user_id ?? "User").slice(0, 8),
          amount: formatMoney(Number(w.amount ?? 0)),
          method: (w.payment_method ?? "M-PESA").toUpperCase(),
          time: w.created_at ? new Date(w.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-",
        }))
      );
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAllData();
  }, []);

  return (
    <div className="space-y-5">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#30383d] bg-[#212629] p-5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Executive Control Console</h1>
            <span className="rounded-md bg-[#2f9bff]/15 px-2.5 py-0.5 text-xs font-black uppercase text-[#72bdff] tracking-widest border border-[#2f9bff]/30">
              REALTIME
            </span>
          </div>
          <p className="text-xs font-bold text-gray-400">
            Overview of trading volume, platform earnings, user growth, and pending financial queues for {platformName}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void fetchAllData()}
            className="flex items-center gap-2 rounded-lg border border-[#3a444a] bg-[#2a3040] px-4 py-2.5 text-xs font-black text-gray-300 transition hover:border-[#72bdff] hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#1689e8]" : ""}`} />
            Refresh Feed
          </button>

          <Link
            to="/admin/finance?tab=withdrawals"
            className="flex items-center gap-2 rounded-lg bg-[#2f9bff] px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-[#2f9bff]/25 transition hover:bg-[#198bea] active:scale-95"
          >
            <ArrowUpCircle className="h-4 w-4" />
            Review Queue
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Users */}
        <div className="relative overflow-hidden rounded-xl border border-[#30383d] bg-[#212629] p-5 shadow-xl transition hover:border-[#2f9bff]/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400">TOTAL TRADERS</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1689e8]/15 text-[#1689e8]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{totalUsers.toLocaleString()}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#00c878]">
              <Activity className="h-3.5 w-3.5" />
              <span>{activeTraders.toLocaleString()} active in last 30d</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Deposits */}
        <div className="relative overflow-hidden rounded-xl border border-[#30383d] bg-[#212629] p-5 shadow-xl transition hover:border-[#00c878]/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400">TOTAL DEPOSITS</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00c878]/15 text-[#00c878]">
              <ArrowDownCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{formatMoney(totalDeposits)}</div>
            <div className="mt-1 text-xs font-bold text-gray-400">Cumulative funding volume</div>
          </div>
        </div>

        {/* Card 3: Total Withdrawals */}
        <div className="relative overflow-hidden rounded-xl border border-[#30383d] bg-[#212629] p-5 shadow-xl transition hover:border-amber-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400">TOTAL WITHDRAWALS</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <ArrowUpCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{formatMoney(totalWithdrawals)}</div>
            <div className="mt-1 text-xs font-bold text-amber-400">
              {pendingWds.length} pending requests
            </div>
          </div>
        </div>

        {/* Card 4: Platform Net P&L */}
        <div className="relative overflow-hidden rounded-xl border border-[#30383d] bg-[#212629] p-5 shadow-xl transition hover:border-[#2f9bff]/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400">NET PLATFORM EARNINGS</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${netProfitLoss >= 0 ? "text-[#00c878]" : "text-[#ff4a5a]"}`}>
              {formatMoney(netProfitLoss)}
            </div>
            <div className="mt-1 text-xs font-bold text-gray-400">
              7D Volume: {formatMoney(tradingVolume)}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Net Earnings Trend Chart */}
        <div className="rounded-xl border border-[#30383d] bg-[#212629] p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Platform Net P&L (7-Day)</h3>
              <p className="text-xs text-gray-400">Net platform revenue generated from settlement differentials</p>
            </div>
            <span className="rounded-lg bg-[#00c878]/15 px-2.5 py-1 text-xs font-black text-[#00c878]">
              {formatMoney(netProfitLoss)}
            </span>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profitData}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00c878" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00c878" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2333" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatCompact} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b1018", borderColor: "#1b2333", borderRadius: "12px", color: "#fff", fontSize: "12px", fontWeight: "bold" }}
                  formatter={(val: any) => [formatMoney(Number(val)), "Net P&L"]}
                />
                <Area type="monotone" dataKey="profit" stroke="#00c878" strokeWidth={2.5} fillOpacity={1} fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trading Volume Bar Chart */}
        <div className="rounded-xl border border-[#30383d] bg-[#212629] p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Trading Turnover Volume (7-Day)</h3>
              <p className="text-xs text-gray-400">Total volume of open and settled option contracts</p>
            </div>
            <span className="rounded-lg bg-[#1689e8]/15 px-2.5 py-1 text-xs font-black text-[#1689e8]">
              {formatMoney(tradingVolume)}
            </span>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2333" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatCompact} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b1018", borderColor: "#1b2333", borderRadius: "12px", color: "#fff", fontSize: "12px", fontWeight: "bold" }}
                  formatter={(val: any) => [formatMoney(Number(val)), "Volume"]}
                />
                <Bar dataKey="volume" fill="#1689e8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live Recent Trades & Pending Withdrawals */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Trades Table (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-[#30383d] bg-[#212629] p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#1689e8]" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Recent Live Trades Feed</h3>
            </div>
            <Link to="/admin/trades" className="flex items-center gap-1 text-xs font-bold text-[#1689e8] hover:underline">
              View All <ChevronRight size={14} />
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Direction</th>
                  <th className="py-2.5 px-3">Stake</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold">
                {recentTrades.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">No trades recorded recently.</td>
                  </tr>
                ) : (
                  recentTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3 font-extrabold text-white">{t.asset}</td>
                      <td className="py-3 px-3 text-gray-300">{t.user}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-black text-[10px] uppercase ${t.direction.toUpperCase() === "CALL" || t.direction.toUpperCase() === "HIGHER" ? "bg-[#00c878]/20 text-[#00c878]" : "bg-[#ff4a5a]/20 text-[#ff4a5a]"}`}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-white font-bold">{t.amount}</td>
                      <td className="py-3 px-3">
                        <span className={`font-black ${t.won ? "text-[#00c878]" : "text-[#ff4a5a]"}`}>
                          {t.result}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-400">{t.time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Withdrawals Quick Action Panel (1 col) */}
        <div className="rounded-xl border border-[#30383d] bg-[#212629] p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Pending Withdrawals</h3>
              </div>
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-400">
                {pendingWds.length} QUEUED
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {pendingWds.length === 0 ? (
                <div className="py-8 text-center text-xs font-bold text-gray-400">No pending withdrawal requests.</div>
              ) : (
                pendingWds.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0b1018] p-3 text-xs">
                    <div>
                      <div className="font-black text-white">{w.amount}</div>
                      <div className="text-[10px] text-gray-400">{w.user} • {w.method}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500">{w.time}</span>
                      <Link
                        to="/admin/finance?tab=withdrawals"
                        className="block text-[10px] font-extrabold text-[#1689e8] hover:underline mt-0.5"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            to="/admin/finance?tab=withdrawals"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.05] border border-white/10 py-2.5 text-xs font-black text-gray-300 hover:bg-[#1689e8] hover:text-white transition-colors"
          >
            Open Withdrawal Console
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
