import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronRight,
  Clock3,
  DollarSign,
  Loader2,
  PlusCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { readDemoBalanceStorage, writeDemoBalanceStorage, DEFAULT_DEMO_BALANCE } from "@/lib/onboarding";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useSiteBranding } from "@/hooks/useSiteBranding";

type ProfileRow = Pick<Tables<"profiles">, "id" | "username" | "display_name" | "created_at">;
type ActivityItem =
  | { id: string; type: "deposit"; userLabel: string; amount: number; createdAt: string }
  | { id: string; type: "withdrawal"; userLabel: string; amount: number; createdAt: string }
  | { id: string; type: "trade"; userLabel: string; amount: number; asset: string; createdAt: string }
  | { id: string; type: "signup"; userLabel: string; createdAt: string };

type DashboardPoint = { name: string; signups: number; trades: number };

type DashboardData = {
  activeTraders30d: number;
  chartData: DashboardPoint[];
  pendingDeposits: number;
  platformProfitToday: number;
  recentActivity: ActivityItem[];
  readyWithdrawals: number;
  reviewWithdrawals: number;
  signupsToday: number;
  totalUsers: number;
  tradesToday: number;
};

const PALETTE = {
  accent: "#0fa053",
  accentStrong: "#0fa053",
  border: "#2a2f42",
  card: "#1a1e2b",
  canvas: "#0e1017",
  elevated: "#222738",
  orange: "#ff9a3d",
  orangeSoft: "#ffc27a",
  surface: "#13161e",
};

const panelClass =
  "rounded-[28px] border shadow-[0_24px_70px_rgba(6,14,24,0.42)] backdrop-blur-xl" + '" style="border-color: var(--admin-border); background: linear-gradient(180deg, var(--admin-surface) 0%, var(--admin-input) 100%);"';

const innerCardClass = "rounded-[22px] border" + ' style="border-color: var(--admin-border); background: var(--admin-elevated);"';
const ADMIN_DASHBOARD_CHART_ROW_LIMIT = 5000;

const formatMoney = (value: number) =>
  `$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const getStartOfDay = (date = new Date()) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getUserLabel = (profile?: ProfileRow | null) =>
  profile?.display_name || profile?.username || (profile?.id ? `User ${profile.id.slice(0, 8).toUpperCase()}` : "User");

const formatRelativeTime = (value: string) => {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const MetricCard = ({
  chip,
  icon,
  label,
  tone,
  value,
}: {
  chip: string;
  icon: ReactNode;
  label: string;
  tone: "accent" | "deep" | "soft" | "strong";
  value: string;
}) => {
  const toneStyles = {
    accent: "border border-[#0fa053]/25 bg-[#0fa053]/12 text-[#9be1bc]",
    deep: "border bg-[var(--admin-elevated)] text-[var(--admin-orange-soft)]" + '" style="border-color: var(--admin-orange)/0.20;"',
    soft: "border bg-[var(--admin-surface)] text-[var(--admin-text-secondary)]" + '" style="border-color: var(--admin-border);"',
    strong: "border bg-[var(--admin-orange)]/0.10 text-[var(--admin-orange-soft)]" + '" style="border-color: var(--admin-orange)/0.24;"',
  }[tone];

  return (
    <div className={`${panelClass} flex min-h-[140px] flex-col justify-between p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${toneStyles}`}>{icon}</div>
        <div className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneStyles}`}>{chip}</div>
      </div>
      <div>
        <p className="text-xs text-[#a7bfd8]">{label}</p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">{value}</h3>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { profile } = useAuth();
  const { platformName } = useSiteBranding();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    activeTraders30d: 0,
    chartData: [],
    pendingDeposits: 0,
    platformProfitToday: 0,
    readyWithdrawals: 0,
    recentActivity: [],
    reviewWithdrawals: 0,
    signupsToday: 0,
    totalUsers: 0,
    tradesToday: 0,
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      const todayStart = getStartOfDay();
      const chartStart = new Date(todayStart);
      chartStart.setDate(todayStart.getDate() - 6);

      const [
        userCountResult,
        activeTradersCountResult,
        pendingDepositsCountResult,
        reviewWithdrawalsCountResult,
        readyWithdrawalsCountResult,
        chartProfilesResult,
        chartTradesResult,
        recentProfilesResult,
        recentTradesResult,
        recentDepositsResult,
        recentWithdrawalsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gt("trade_count_30d", 0),
        supabase.from("deposit_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).in("status", ["approved", "processing"]),
        supabase.from("profiles").select("id, username, display_name, created_at").gte("created_at", chartStart.toISOString()).limit(ADMIN_DASHBOARD_CHART_ROW_LIMIT),
        supabase.from("trades").select("id, user_id, asset_symbol, amount, profit, opened_at, closed_at, status").gte("opened_at", chartStart.toISOString()).limit(ADMIN_DASHBOARD_CHART_ROW_LIMIT),
        supabase.from("profiles").select("id, username, display_name, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("trades").select("id, user_id, asset_symbol, amount, profit, opened_at, closed_at, status").order("opened_at", { ascending: false }).limit(10),
        supabase.from("deposit_requests").select("id, user_id, amount, created_at, status").order("created_at", { ascending: false }).limit(10),
        supabase.from("withdrawal_requests").select("id, user_id, amount, created_at, status").order("created_at", { ascending: false }).limit(10),
      ]);

      const recentUserIds = Array.from(
        new Set([
          ...(recentTradesResult.data ?? []).map((entry) => entry.user_id),
          ...(recentDepositsResult.data ?? []).map((entry) => entry.user_id),
          ...(recentWithdrawalsResult.data ?? []).map((entry) => entry.user_id),
          ...(recentProfilesResult.data ?? []).map((entry) => entry.id),
        ]),
      );

      let profilesById = new Map<string, ProfileRow>();
      if (recentUserIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, username, display_name, created_at")
          .in("id", recentUserIds);
        profilesById = new Map((profileRows ?? []).map((entry) => [entry.id, entry]));
      }

      const chartProfiles = chartProfilesResult.data ?? [];
      const chartTrades = chartTradesResult.data ?? [];
      const chartData = Array.from({ length: 7 }).map((_, index) => {
        const dayStart = new Date(chartStart);
        dayStart.setDate(chartStart.getDate() + index);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);
        return {
          name: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
          signups: chartProfiles.filter((row) => new Date(row.created_at) >= dayStart && new Date(row.created_at) < dayEnd).length,
          trades: chartTrades.filter((row) => new Date(row.opened_at) >= dayStart && new Date(row.opened_at) < dayEnd).length,
        };
      });

      const platformProfitToday = chartTrades
        .filter((trade) => trade.status !== "open" && trade.closed_at && new Date(trade.closed_at) >= todayStart)
        .reduce((sum, trade) => sum - Number(trade.profit ?? 0), 0);

      const recentActivity: ActivityItem[] = [
        ...(recentDepositsResult.data ?? []).map((entry) => ({
          id: `deposit-${entry.id}`,
          type: "deposit" as const,
          userLabel: getUserLabel(profilesById.get(entry.user_id)),
          amount: Number(entry.amount ?? 0),
          createdAt: entry.created_at,
        })),
        ...(recentWithdrawalsResult.data ?? []).map((entry) => ({
          id: `withdrawal-${entry.id}`,
          type: "withdrawal" as const,
          userLabel: getUserLabel(profilesById.get(entry.user_id)),
          amount: Number(entry.amount ?? 0),
          createdAt: entry.created_at,
        })),
        ...(recentTradesResult.data ?? []).map((entry) => ({
          id: `trade-${entry.id}`,
          type: "trade" as const,
          userLabel: getUserLabel(profilesById.get(entry.user_id)),
          amount: Number(entry.amount ?? 0),
          asset: entry.asset_symbol,
          createdAt: entry.opened_at,
        })),
        ...(recentProfilesResult.data ?? []).map((entry) => ({
          id: `signup-${entry.id}`,
          type: "signup" as const,
          userLabel: getUserLabel(entry),
          createdAt: entry.created_at,
        })),
      ]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 7);

      setData({
        activeTraders30d: activeTradersCountResult.count ?? 0,
        chartData,
        pendingDeposits: pendingDepositsCountResult.count ?? 0,
        platformProfitToday,
        readyWithdrawals: readyWithdrawalsCountResult.count ?? 0,
        recentActivity,
        reviewWithdrawals: reviewWithdrawalsCountResult.count ?? 0,
        signupsToday: chartProfiles.filter((entry) => new Date(entry.created_at) >= todayStart).length,
        totalUsers: userCountResult.count ?? 0,
        tradesToday: chartTrades.filter((entry) => new Date(entry.opened_at) >= todayStart).length,
      });

      setLoading(false);
    };

    void fetchDashboard();
  }, []);

  const greetingName = useMemo(() => {
    const value = profile?.display_name || profile?.username || "Admin";
    return value.split(/\s+/)[0] ?? value;
  }, [profile?.display_name, profile?.username]);

  const queueMix = useMemo(() => {
    const raw = [
      { label: "Pending deposits", value: data.pendingDeposits, color: "#ff9a3d" },
      { label: "Review queue", value: data.reviewWithdrawals, color: "#0fa053" },
      { label: "Ready payouts", value: data.readyWithdrawals, color: "#8fb0cf" },
    ];
    return raw.every((entry) => entry.value === 0)
      ? [{ label: "No queue", value: 1, color: "#222738" }]
      : raw.filter((entry) => entry.value > 0);
  }, [data.pendingDeposits, data.readyWithdrawals, data.reviewWithdrawals]);

  const [virtualAmount, setVirtualAmount] = useState("");
  const [virtualStatus, setVirtualStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [virtualLoading, setVirtualLoading] = useState(false);

  const handleAddVirtualFunds = async () => {
    const amount = Number(virtualAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setVirtualStatus({ ok: false, msg: "Enter a valid amount." });
      return;
    }
    if (!profile?.id) {
      setVirtualStatus({ ok: false, msg: "Profile not found." });
      return;
    }
    setVirtualLoading(true);
    setVirtualStatus(null);
    try {
      const { data: currentProfile, error: readError } = await supabase
        .from("profiles")
        .select("balance, total_deposit")
        .eq("id", profile.id)
        .single();
      if (readError) throw readError;
      const currentBalance = Number(currentProfile?.balance ?? 0);
      const currentTotalDeposit = Number(currentProfile?.total_deposit ?? 0);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          balance: currentBalance + amount,
          total_deposit: currentTotalDeposit + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
      if (updateError) throw updateError;
      setVirtualStatus({ ok: true, msg: `$${amount.toLocaleString()} added to your live balance.` });
      setVirtualAmount("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add funds.";
      setVirtualStatus({ ok: false, msg: message });
    } finally {
      setVirtualLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.28em]" style={{ borderColor: "var(--admin-orange)/0.20", background: "var(--admin-surface)", color: "var(--admin-orange-soft)" }}>
            Admin / Overview
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Dashboard</h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-6 text-[#a7bfd8] sm:text-sm">
            Track growth, funding queues, and live trading pressure across {platformName}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/finance"
            className="admin-button-primary inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold"
          >
            Open finance desk <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/admin/users"
            className="admin-button-secondary inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold"
          >
            View users <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className={`${panelClass} relative col-span-12 overflow-hidden p-4 sm:p-5 xl:col-span-6`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(35,58,89,0.55),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(48,168,106,0.18),transparent_34%)]" />
          <div className="relative flex h-full flex-col justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--admin-orange-soft)" }}>Welcome back</div>
              <h2 className="mt-1.5 text-2xl font-semibold tracking-tight break-all text-white sm:text-[1.8rem]">
                {greetingName}
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-6 text-[#a7bfd8]">
                The command center is ready. Review finance activity, user growth, and live trading flow from one place.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className={`${innerCardClass} p-3`}>
                <p className="text-[10px] uppercase tracking-[0.26em]" style={{ color: "var(--admin-orange-soft)" }}>Trades today</p>
                <div className="mt-2 text-2xl font-semibold text-white">{data.tradesToday.toLocaleString()}</div>
                <div className="mt-1 text-xs text-[#a7bfd8]">Live trading demand today.</div>
              </div>
              <div className={`${innerCardClass} p-3`}>
                <p className="text-[10px] uppercase tracking-[0.26em] text-[#8fb0cf]">New users today</p>
                <div className="mt-2 text-2xl font-semibold text-white">{data.signupsToday.toLocaleString()}</div>
                <div className="mt-1 text-xs text-[#a7bfd8]">Fresh registrations joining the platform.</div>
              </div>
              <div className={`${innerCardClass} p-3`}>
                <p className="text-[10px] uppercase tracking-[0.26em] text-[#9be1bc]">Platform P&amp;L</p>
                <div className={`mt-2 text-2xl font-semibold ${data.platformProfitToday >= 0 ? "text-[#0fa053]" : "text-slate-200"}`}>
                  {loading ? "..." : `${data.platformProfitToday >= 0 ? "+" : "-"}${formatMoney(data.platformProfitToday)}`}
                </div>
                <div className="mt-1 text-xs text-[#a7bfd8]">Closed-trade result for today.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 grid gap-4 sm:grid-cols-2 xl:col-span-6 xl:grid-cols-2">
          <MetricCard chip={`+${data.signupsToday.toLocaleString()} today`} icon={<Activity className="h-6 w-6" />} label="Active Traders" tone="accent" value={loading ? "..." : formatCompact(data.activeTraders30d)} />
          <MetricCard chip={`${formatCompact(data.totalUsers)} total`} icon={<Users className="h-6 w-6" />} label="Total Users" tone="deep" value={loading ? "..." : formatCompact(data.totalUsers)} />
          <MetricCard chip={`${data.pendingDeposits.toLocaleString()} waiting`} icon={<ArrowDownCircle className="h-6 w-6" />} label="Pending Deposits" tone="soft" value={loading ? "..." : data.pendingDeposits.toLocaleString()} />
          <MetricCard chip={`${data.reviewWithdrawals.toLocaleString()} queued`} icon={<ArrowUpCircle className="h-6 w-6" />} label="Withdrawal Review" tone="strong" value={loading ? "..." : data.reviewWithdrawals.toLocaleString()} />
        </div>

        <div className={`${panelClass} col-span-12 p-4 xl:col-span-6`}>
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--admin-orange-soft)" }}>Virtual funds</div>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">Add credit to your account</h3>
            <p className="mt-1 text-xs leading-5 text-[#a7bfd8]">Credit your live balance directly without going through the deposit flow.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">$</span>
                <input
                  type="number"
                  value={virtualAmount}
                  onChange={(e) => setVirtualAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border py-2 pl-7 pr-3 text-base font-bold text-white outline-none transition-colors placeholder:text-slate-500" style={{ borderColor: "var(--admin-border)", background: "var(--admin-input)", "--tw-placeholder": "rgb(148 163 184 / 1)" } as any}
                />
              </div>
              <button
                onClick={() => void handleAddVirtualFunds()}
                disabled={virtualLoading}
                className="flex h-[38px] items-center gap-1.5 rounded-xl bg-[#0fa053] px-4 text-xs font-bold text-white transition-colors hover:bg-[#0d8f47] disabled:opacity-50"
              >
                {virtualLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                Add Funds
              </button>
            </div>
            <div className="flex gap-1.5">
              {[500, 1000, 5000, 10000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setVirtualAmount(String(preset))}
                  className="rounded-lg border px-2 py-1 text-[11px] font-semibold text-slate-300 transition-colors" style={{ borderColor: "var(--admin-border)", background: "var(--admin-input)" }}
                >
                  ${preset.toLocaleString()}
                </button>
              ))}
            </div>
            {virtualStatus && (
              <div className={`text-xs ${virtualStatus.ok ? "text-[#0fa053]" : "text-red-400"}`}>
                {virtualStatus.msg}
              </div>
            )}
          </div>
        </div>

        <div className={`${panelClass} col-span-12 p-4 xl:col-span-6`}>
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--admin-orange-soft)" }}>Activity bar</div>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">Weekly platform activity</h3>
            <p className="mt-1 text-xs leading-5 text-[#a7bfd8]">Trades and registrations over the last seven days.</p>
          </div>
          <div className="h-[220px]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#0fa053]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 12, right: 12, left: -8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(143,176,207,0.14)" vertical={false} />
                  <XAxis dataKey="name" stroke="#b9cbe0" tickLine={false} axisLine={false} />
                  <YAxis stroke="#b9cbe0" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: PALETTE.surface, border: `1px solid ${PALETTE.border}`, borderRadius: 18, color: "#f8fafc" }}
                    formatter={(value: number, key: string) => [value.toLocaleString(), key === "trades" ? "Trades" : "Signups"]}
                    labelStyle={{ color: "#b9cbe0" }}
                  />
                  <Bar dataKey="trades" fill={PALETTE.accent} radius={[12, 12, 0, 0]} barSize={18} />
                  <Bar dataKey="signups" fill={PALETTE.orange} radius={[12, 12, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={`${panelClass} col-span-12 p-4 xl:col-span-3`}>
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--admin-orange-soft)" }}>Desk balance</div>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">Operations mix</h3>
          </div>
          <div className="mx-auto h-[180px] w-full max-w-[200px]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#0fa053]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={queueMix} dataKey="value" innerRadius={68} outerRadius={96} paddingAngle={4} stroke="rgba(255,255,255,0.08)" strokeWidth={2}>
                    {queueMix.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: PALETTE.surface, border: `1px solid ${PALETTE.border}`, borderRadius: 18, color: "#f8fafc" }}
                    formatter={(value: number) => [value.toLocaleString(), "Requests"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-1.5 mt-2">
            {queueMix.map((entry) => (
              <div key={entry.label} className={`flex items-center justify-between ${innerCardClass} px-3 py-2`}>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs font-medium text-[#a7bfd8]">{entry.label}</span>
                </div>
                <span className="text-xs font-semibold text-white">{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${panelClass} col-span-12 p-4 xl:col-span-3`}>
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--admin-orange-soft)" }}>Payout watch</div>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">Withdrawal desk</h3>
          </div>
          <div className="space-y-3">
            <div className={`${innerCardClass} px-3 py-3`}>
              <div className="text-[10px] uppercase tracking-[0.26em]" style={{ color: "var(--admin-orange-soft)" }}>Needs review</div>
              <div className="mt-1 text-2xl font-semibold" style={{ color: "var(--admin-orange-soft)" }}>{data.reviewWithdrawals.toLocaleString()}</div>
            </div>
            <div className={`${innerCardClass} px-3 py-3`}>
              <div className="text-[10px] uppercase tracking-[0.26em] text-[#9be1bc]">Ready to send</div>
              <div className="mt-1 text-2xl font-semibold text-[#0fa053]">{data.readyWithdrawals.toLocaleString()}</div>
            </div>
            <div className={`${innerCardClass} px-3 py-3`}>
              <div className="text-[10px] uppercase tracking-[0.26em] text-[#8fb0cf]">Platform P&amp;L</div>
              <div className={`mt-1 text-2xl font-semibold ${data.platformProfitToday >= 0 ? "text-[#0fa053]" : "text-slate-200"}`}>
                {loading ? "..." : `${data.platformProfitToday >= 0 ? "+" : "-"}${formatMoney(data.platformProfitToday)}`}
              </div>
            </div>
          </div>
        </div>

        <div className={`${panelClass} col-span-12 p-4`}>
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--admin-orange-soft)" }}>Live feed</div>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">Recent admin-visible activity</h3>
            </div>
            <Link
              to="/admin/finance"
              className="admin-button-secondary inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold"
            >
              View queues <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {loading ? (
              <div className="col-span-full flex h-[140px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#0fa053]" />
              </div>
            ) : data.recentActivity.length === 0 ? (
              <div className="col-span-full flex h-[140px] items-center justify-center rounded-[24px] border border-dashed text-xs text-slate-500" style={{ borderColor: "var(--admin-border)" }}>
                No recent activity yet.
              </div>
            ) : (
              data.recentActivity.map((activity) => (
                <div key={activity.id} className={`flex items-start gap-3 ${innerCardClass} px-3 py-3`}>
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border" style={{ borderColor: "var(--admin-border)", background: "var(--admin-input)" }}>
                    {activity.type === "deposit" ? (
                      <ArrowDownCircle className="h-4 w-4 text-[#0fa053]" />
                    ) : activity.type === "withdrawal" ? (
                      <ArrowUpCircle className="h-4 w-4 text-[#ffc27a]" />
                    ) : activity.type === "trade" ? (
                      <TrendingUp className="h-4 w-4 text-[#8fb0cf]" />
                    ) : (
                      <PlusCircle className="h-4 w-4 text-[#ffc27a]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-6 text-slate-200">
                      {activity.type === "deposit" ? (
                        <>
                          <span className="font-semibold text-[#0fa053]">{formatMoney(activity.amount)}</span> deposit request from{" "}
                          <span className="font-semibold text-white">{activity.userLabel}</span>
                        </>
                      ) : activity.type === "withdrawal" ? (
                        <>
                          <span className="font-semibold text-[#ffc27a]">{formatMoney(activity.amount)}</span> withdrawal request from{" "}
                          <span className="font-semibold text-white">{activity.userLabel}</span>
                        </>
                      ) : activity.type === "trade" ? (
                        <>
                          <span className="font-semibold text-[#8fb0cf]">{formatMoney(activity.amount)}</span> trade on{" "}
                          <span className="font-semibold text-white">{activity.asset}</span> by{" "}
                          <span className="font-semibold text-white">{activity.userLabel}</span>
                        </>
                      ) : (
                        <>
                          New registration: <span className="font-semibold text-white">{activity.userLabel}</span>
                        </>
                      )}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                      <Clock3 className="h-3 w-3" />
                      {formatRelativeTime(activity.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
