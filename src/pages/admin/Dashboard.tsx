import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  DollarSign,
  Loader2,
  Trophy,
  ShieldCheck,
  Megaphone,
  XCircle,
  Clock,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";

const ACCENT = "#D5006C";
const BG_CARD = "#1A1A2A";
const BORDER = "#2A2A3A";
const TEXT_SEC = "#B0B0B0";
const PROFIT = "#00C076";
const LOSS = "#F6465D";

const formatMoney = (v: number) =>
  `$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCompact = (v: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);

const getStartOfDay = (d = new Date()) => {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
};

interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: { value: string; up: boolean };
  sub: string;
}

interface TradeRow {
  id: string;
  user: string;
  asset: string;
  direction: string;
  amount: string;
  result: string;
  time: string;
  won: boolean;
}

interface WithdrawRow {
  id: string;
  user: string;
  amount: string;
  method: string;
  time: string;
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
  const [profitData, setProfitData] = useState<{ name: string; profit: number }[]>([]);
  const [volumeData, setVolumeData] = useState<{ name: string; volume: number }[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeRow[]>([]);
  const [pendingWds, setPendingWds] = useState<WithdrawRow[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const todayStart = getStartOfDay();
      const weekAgo = new Date(todayStart);
      weekAgo.setDate(weekAgo.getDate() - 6);

      const [
        userCountR,
        activeR,
        depSumR,
        wdSumR,
        wdPendingR,
        chartTradesR,
        recentTradesR,
        recentWdR,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gt("trade_count_30d", 0),
        supabase.from("deposit_requests").select("amount").eq("status", "completed"),
        supabase.from("withdrawal_requests").select("amount").eq("status", "completed"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("trades")
          .select("profit, opened_at, closed_at, amount, status")
          .gte("opened_at", weekAgo.toISOString())
          .limit(10000),
        supabase.from("trades")
          .select("id, user_id, asset_symbol, direction, amount, profit, closed_at")
          .order("closed_at", { ascending: false })
          .limit(5),
        supabase.from("withdrawal_requests")
          .select("id, user_id, amount, payment_method, created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setTotalUsers(userCountR.count ?? 0);
      setActiveTraders(activeR.count ?? 0);
      setTotalDeposits(
        (depSumR.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0),
      );
      setTotalWithdrawals(
        (wdSumR.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0),
      );
      setPendingWithdrawals(wdPendingR.count ?? 0);

      // Chart data
      const trades = chartTradesR.data ?? [];
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekAgo);
        d.setDate(d.getDate() + i);
        return d;
      });
      setProfitData(
        days.map((d) => {
          const dayEnd = new Date(d);
          dayEnd.setDate(d.getDate() + 1);
          const dayTrades = trades.filter(
            (t) =>
              t.closed_at &&
              new Date(t.closed_at) >= d &&
              new Date(t.closed_at) < dayEnd,
          );
          const profit = dayTrades.reduce(
            (s, t) => s - Number(t.profit ?? 0),
            0,
          );
          return {
            name: d.toLocaleDateString("en-US", { weekday: "short" }),
            profit,
          };
        }),
      );
      setVolumeData(
        days.map((d) => {
          const dayEnd = new Date(d);
          dayEnd.setDate(d.getDate() + 1);
          const vol = trades
            .filter((t) => new Date(t.opened_at) >= d && new Date(t.opened_at) < dayEnd)
            .reduce((s, t) => s + Number(t.amount ?? 0), 0);
          return {
            name: d.toLocaleDateString("en-US", { weekday: "short" }),
            volume: vol,
          };
        }),
      );

      // Resolve user labels
      const allUids = [
        ...new Set([
          ...(recentTradesR.data ?? []).map((t) => t.user_id),
          ...(recentWdR.data ?? []).map((w) => w.user_id),
        ]),
      ];
      const profileMap = new Map<string, string>();
      if (allUids.length > 0) {
        const { data: pRows } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", allUids);
        (pRows ?? []).forEach((p) => {
          profileMap.set(p.id, p.display_name || p.username || p.id.slice(0, 8));
        });
      }

      setRecentTrades(
        (recentTradesR.data ?? []).map((t) => ({
          id: t.id,
          user: profileMap.get(t.user_id) || "User",
          asset: t.asset_symbol,
          direction: t.direction,
          amount: formatMoney(Number(t.amount ?? 0)),
          result:
            Number(t.profit ?? 0) >= 0
              ? `+${formatMoney(Number(t.profit))}`
              : formatMoney(Number(t.profit)),
          time: t.closed_at
            ? new Date(t.closed_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          won: Number(t.profit ?? 0) >= 0,
        })),
      );

      setPendingWds(
        (recentWdR.data ?? []).map((w) => ({
          id: w.id,
          user: profileMap.get(w.user_id) || "User",
          amount: formatMoney(Number(w.amount ?? 0)),
          method: w.payment_method || "Bank",
          time: new Date(w.created_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
      );

      setLoading(false);
    };

    void fetchAll();
  }, []);

  const greetingName = useMemo(
    () =>
      (profile?.display_name || profile?.username || "Admin").split(/\s+/)[0] ?? "Admin",
    [profile],
  );

  const stats: StatCard[] = [
    {
      label: "Total Users",
      value: formatCompact(totalUsers),
      icon: <Activity size={22} />,
      trend: { value: `${formatCompact(totalUsers)} total`, up: true },
      sub: "Registered accounts",
    },
    {
      label: "Active Traders",
      value: formatCompact(activeTraders),
      icon: <Activity size={22} />,
      trend: { value: `${formatCompact(activeTraders)} this month`, up: true },
      sub: "Traded in last 30 days",
    },
    {
      label: "Total Deposits",
      value: formatMoney(totalDeposits),
      icon: <ArrowDownCircle size={22} />,
      trend: { value: "All time", up: true },
      sub: "Completed deposits",
    },
    {
      label: "Total Withdrawals",
      value: formatMoney(totalWithdrawals),
      icon: <ArrowUpCircle size={22} />,
      trend: { value: "All time", up: false },
      sub: "Completed payouts",
    },
    {
      label: "Pending Withdrawals",
      value: String(pendingWithdrawals),
      icon: <Clock size={22} />,
      trend: {
        value: `${pendingWithdrawals} awaiting action`,
        up: pendingWithdrawals > 0,
      },
      sub: "Needs review",
    },
  ];

  const quickActions = [
    {
      label: "Approve Withdrawals",
      href: "/admin/finance?tab=withdrawals",
      icon: <CheckCircle2 size={18} />,
      color: PROFIT,
    },
    {
      label: "Create Tournament",
      href: "/admin/tournaments?tab=create",
      icon: <Trophy size={18} />,
      color: ACCENT,
    },
    {
      label: "View KYC Requests",
      href: "/admin/users?tab=kyc",
      icon: <ShieldCheck size={18} />,
      color: "#F59E0B",
    },
    {
      label: "Send Announcement",
      href: "/admin/notifications",
      icon: <Megaphone size={18} />,
      color: "#3B82F6",
    },
  ];

  const cardClass =
    "rounded-xl border p-5" as const;

  const renderLoader = () => (
    <div className="flex h-full items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: ACCENT }} />
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div
        className={`${cardClass} relative overflow-hidden`}
        style={{ background: BG_CARD, borderColor: BORDER }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background: `radial-gradient(circle at 0% 0%, ${ACCENT}, transparent 60%)`,
          }}
        />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {greetingName}!
          </h1>
          <p className="mt-1 text-sm" style={{ color: TEXT_SEC }}>
            Here's your {platformName} trading platform overview.
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`${cardClass} flex flex-col justify-between`}
            style={{ background: BG_CARD, borderColor: BORDER }}
          >
            <div className="flex items-center justify-between">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: `${ACCENT}20`, color: ACCENT }}
              >
                {s.icon}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  s.trend.up ? "text-[#00C076]" : "text-[#F6465D]"
                }`}
                style={{
                  background: s.trend.up
                    ? "rgba(0,192,118,0.12)"
                    : "rgba(246,70,93,0.12)",
                }}
              >
                {s.trend.value}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs" style={{ color: TEXT_SEC }}>
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
              <p className="mt-0.5 text-[11px]" style={{ color: TEXT_SEC }}>
                {s.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Profit Analytics */}
        <div
          className={`${cardClass}`}
          style={{ background: BG_CARD, borderColor: BORDER }}
        >
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Profit Analytics</h3>
            <p className="mt-0.5 text-xs" style={{ color: TEXT_SEC }}>
              Daily platform profit over the last 7 days
            </p>
          </div>
          <div className="h-[260px]">
            {loading ? (
              renderLoader()
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitData} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                  <XAxis dataKey="name" stroke={TEXT_SEC} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis stroke={TEXT_SEC} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      background: BG_CARD,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [
                      `${value >= 0 ? "+" : ""}${formatMoney(value)}`,
                      "Profit",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke={PROFIT}
                    strokeWidth={2.5}
                    dot={{ fill: PROFIT, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Trading Volume */}
        <div
          className={`${cardClass}`}
          style={{ background: BG_CARD, borderColor: BORDER }}
        >
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Trading Volume</h3>
            <p className="mt-0.5 text-xs" style={{ color: TEXT_SEC }}>
              Daily trading volume over the last 7 days
            </p>
          </div>
          <div className="h-[260px]">
            {loading ? (
              renderLoader()
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                  <XAxis dataKey="name" stroke={TEXT_SEC} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis stroke={TEXT_SEC} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      background: BG_CARD,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatMoney(value), "Volume"]}
                  />
                  <Bar dataKey="volume" fill={ACCENT} radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        className={`${cardClass}`}
        style={{ background: BG_CARD, borderColor: BORDER }}
      >
        <h3 className="mb-4 text-sm font-semibold text-white">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5"
              style={{ borderColor: BORDER, color: TEXT_SEC }}
            >
              <span style={{ color: action.color }}>{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Tables row */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Recent Trades */}
        <div
          className={`${cardClass}`}
          style={{ background: BG_CARD, borderColor: BORDER }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Trades</h3>
              <p className="mt-0.5 text-xs" style={{ color: TEXT_SEC }}>
                Latest closed positions
              </p>
            </div>
            <Link
              to="/admin/trades"
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: `${ACCENT}20`, color: ACCENT }}
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider" style={{ color: TEXT_SEC }}>
                  <th className="pb-3 pr-4 font-semibold">User</th>
                  <th className="pb-3 pr-4 font-semibold">Asset</th>
                  <th className="pb-3 pr-4 font-semibold">Direction</th>
                  <th className="pb-3 pr-4 font-semibold">Amount</th>
                  <th className="pb-3 pr-4 font-semibold">Result</th>
                  <th className="pb-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm" style={{ color: TEXT_SEC }}>
                      No recent trades
                    </td>
                  </tr>
                ) : (
                  recentTrades.map((t) => (
                    <tr key={t.id} className="border-t" style={{ borderColor: BORDER }}>
                      <td className="py-3 pr-4 text-white">{t.user}</td>
                      <td className="py-3 pr-4 text-white">{t.asset}</td>
                      <td className="py-3 pr-4">
                        <span
                          className="rounded px-2 py-0.5 text-xs font-semibold"
                          style={{
                            background:
                              t.direction === "CALL"
                                ? "rgba(0,192,118,0.15)"
                                : "rgba(246,70,93,0.15)",
                            color: t.direction === "CALL" ? PROFIT : LOSS,
                          }}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-white">{t.amount}</td>
                      <td
                        className="py-3 pr-4 font-semibold"
                        style={{ color: t.won ? PROFIT : LOSS }}
                      >
                        {t.result}
                      </td>
                      <td className="py-3" style={{ color: TEXT_SEC }}>
                        {t.time}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Withdrawals */}
        <div
          className={`${cardClass}`}
          style={{ background: BG_CARD, borderColor: BORDER }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Pending Withdrawals</h3>
              <p className="mt-0.5 text-xs" style={{ color: TEXT_SEC }}>
                Withdrawals awaiting approval
              </p>
            </div>
            <Link
              to="/admin/finance?tab=withdrawals"
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: `${ACCENT}20`, color: ACCENT }}
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider" style={{ color: TEXT_SEC }}>
                  <th className="pb-3 pr-4 font-semibold">User</th>
                  <th className="pb-3 pr-4 font-semibold">Amount</th>
                  <th className="pb-3 pr-4 font-semibold">Method</th>
                  <th className="pb-3 pr-4 font-semibold">Time</th>
                  <th className="pb-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingWds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm" style={{ color: TEXT_SEC }}>
                      No pending withdrawals
                    </td>
                  </tr>
                ) : (
                  pendingWds.map((w) => (
                    <tr key={w.id} className="border-t" style={{ borderColor: BORDER }}>
                      <td className="py-3 pr-4 text-white">{w.user}</td>
                      <td className="py-3 pr-4 font-semibold text-white">{w.amount}</td>
                      <td className="py-3 pr-4" style={{ color: TEXT_SEC }}>
                        {w.method}
                      </td>
                      <td className="py-3 pr-4" style={{ color: TEXT_SEC }}>
                        {w.time}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/finance?tab=withdrawals&id=${w.id}`}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors hover:opacity-80"
                            style={{ background: "rgba(0,192,118,0.15)", color: PROFIT }}
                          >
                            <CheckCircle2 size={12} />
                            Approve
                          </Link>
                          <button
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors hover:opacity-80"
                            style={{ background: "rgba(246,70,93,0.15)", color: LOSS }}
                          >
                            <XCircle size={12} />
                            Reject
                          </button>
                        </div>
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
