import { useState } from "react";
import {
  Award, BarChart3, Calendar, Check, ChevronDown, Clock, Copy, DollarSign, Flame, Globe,
  Medal, Shield, Star, Target, Trophy, TrendingUp, TrendingDown, User, X, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import CountryFlag from "@/components/ui/CountryFlag";
import type { TraderData } from "./WorkspaceLeaderboard";

const ACHIEVEMENTS = [
  { icon: Trophy, label: "Top Trader", color: "text-yellow-400", bg: "bg-yellow-400/12" },
  { icon: TrendingUp, label: "High Win Rate", color: "text-[#00b95b]", bg: "bg-[#00b95b]/12" },
  { icon: Star, label: "Consistent Performer", color: "text-[#007aff]", bg: "bg-[#007aff]/12" },
  { icon: Medal, label: "Weekly Champion", color: "text-amber-600", bg: "bg-amber-600/12" },
  { icon: Trophy, label: "Monthly Champion", color: "text-yellow-400", bg: "bg-yellow-400/12" },
  { icon: Zap, label: "100 Winning Trades", color: "text-purple-400", bg: "bg-purple-400/12" },
  { icon: Flame, label: "1,000 Completed Trades", color: "text-orange-400", bg: "bg-orange-400/12" },
  { icon: Shield, label: "Elite Trader", color: "text-cyan-400", bg: "bg-cyan-400/12" },
];

interface TraderProfileProps {
  trader: TraderData;
  onClose: () => void;
  onCopy: (id: string) => void;
}

export const TraderProfile = ({ trader, onClose, onCopy }: TraderProfileProps) => {
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyAmount, setCopyAmount] = useState(trader.minCopyAmount);
  const [maxLoss, setMaxLoss] = useState(500);
  const [maxTrades, setMaxTrades] = useState(10);
  const [riskMultiplier, setRiskMultiplier] = useState(1);

  const isPositive = trader.totalProfit >= 0;
  const initial = trader.name.charAt(0).toUpperCase();
  const iconColor = ["#f44336","#e91e63","#9c27b0","#673ab7","#3f51b5","#2196f3","#03a9f4","#00bcd4","#009688","#4caf50","#8bc34a","#cddc39","#ffc107","#ff9800","#ff5722","#795548","#607d8b","#1abc9c","#3498db","#9b59b6","#e67e22","#2ecc71","#e74c3c","#1b8ffa"][trader.id.length % 24];

  const formatMoney = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const dailyChartData = trader.dailyProfits.map((v, i) => ({ day: `D${i + 1}`, profit: v }));
  const weeklyChartData = trader.weeklyProfits.map((v, i) => ({ week: `W${i + 1}`, profit: v }));
  const monthlyChartData = trader.monthlyProfits.map((v, i) => ({ month: `M${i + 1}`, profit: v }));
  const winLossData = [
    { name: "Wins", value: trader.wins },
    { name: "Losses", value: trader.losses },
  ];
  const activityData = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, trades: Math.floor(Math.random() * 15 + 1) }));
  const successTrendData = Array.from({ length: 12 }, (_, i) => ({ month: `M${i + 1}`, rate: Number((55 + Math.random() * 35).toFixed(1)) }));

  const COLORS = ["#00b95b", "#ff4d4d"];

  return (
    <div
      className="fixed inset-0 z-[350] flex items-start justify-center overflow-y-auto bg-[rgba(5,8,16,0.72)] backdrop-blur-[2px] px-4 py-6 sm:px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[900px] rounded-[20px] border border-[#334050] bg-[#232b3a] shadow-[0_40px_90px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-white ring-2 ring-white/20"
              style={{ background: iconColor }}
            >
              {initial}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-bold text-white">{trader.name}</h2>
                <CountryFlag code={trader.country} size={18} className="rounded-full" />
                {trader.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#007aff]/12 px-2 py-0.5 text-[9px] font-bold text-[#007aff]">
                    <Check className="h-2.5 w-2.5" /> VERIFIED
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/50">
                <span>ID: {trader.id}</span>
                <span>·</span>
                <span>Member since: {trader.memberSince}</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#3b4b6c] bg-[#2a3450] text-[#9fb3d5] hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Online/Offline status bar */}
        <div className="flex items-center gap-2 px-6 pt-3 text-[12px] text-white/50">
          <span className={`inline-block h-2 w-2 rounded-full ${trader.isOnline ? "bg-[#00b95b]" : "bg-white/30"}`} />
          <span>{trader.isOnline ? "Online now" : "Offline"}</span>
          <span className="ml-2 rounded-full bg-[#007aff]/10 px-2 py-0.5 text-[10px] font-bold text-[#007aff]">
            {trader.experience}
          </span>
          <span className="rounded-full bg-[#f4b742]/10 px-2 py-0.5 text-[10px] font-bold text-[#f4b742]">
            {trader.followers.toLocaleString()} Followers
          </span>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-6">
          {/* ─── Binary Options Statistics ─────────────────────────────────────── */}
          <div>
            <h3 className="mb-3 text-[14px] font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#007aff]" />
              Binary Options Statistics
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-[#334050] bg-[#1e2530] p-4 sm:grid-cols-4">
              <StatItem label="Total Profit" value={formatMoney(trader.totalProfit)} className={isPositive ? "text-[#00b95b]" : "text-[#ff4d4d]"} />
              <StatItem label="Today's Profit" value={formatMoney(trader.todayProfit)} className={trader.todayProfit >= 0 ? "text-[#00b95b]" : "text-[#ff4d4d]"} />
              <StatItem label="Weekly Profit" value={formatMoney(trader.weeklyProfits.reduce((a, b) => a + b, 0))} />
              <StatItem label="Monthly Profit" value={formatMoney(trader.monthlyProfits.reduce((a, b) => a + b, 0))} />
              <StatItem label="Total Trades" value={trader.totalTrades.toLocaleString()} />
              <StatItem label="Winning Trades" value={trader.wins.toLocaleString()} className="text-[#00b95b]" />
              <StatItem label="Losing Trades" value={trader.losses.toLocaleString()} className="text-[#ff4d4d]" />
              <StatItem label="Win Rate" value={`${trader.winRate.toFixed(1)}%`} className="text-[#00b95b]" />
              <StatItem label="Avg Return" value={`${trader.avgReturn}%`} className="text-[#00b95b]" />
              <StatItem label="Highest Win" value={formatMoney(trader.highestWin)} className="text-[#f4b742]" />
              <StatItem label="Longest Streak" value={`${trader.longestStreak}`} className="text-[#007aff]" />
              <StatItem label="Current Streak" value={`${trader.currentStreak}`} />
              <StatItem label="Avg Duration" value={`${trader.avgDuration} min`} />
              <StatItem label="Avg Amount" value={formatMoney(trader.avgAmount)} />
              <StatItem label="Risk Level" value={trader.riskLevel} className={trader.riskLevel === "Low" ? "text-[#00b95b]" : trader.riskLevel === "Medium" ? "text-[#f4b742]" : "text-[#ff4d4d]"} />
              <StatItem label="Success Rate" value={`${trader.successRate}%`} className="text-[#00b95b]" />
            </div>
          </div>

          {/* ─── Performance Charts ────────────────────────────────────────── */}
          <div>
            <h3 className="mb-3 text-[14px] font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#007aff]" />
              Trading Performance
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Daily Profit */}
              <div className="rounded-xl border border-[#334050] bg-[#1e2530] p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">Daily Profit (30 days)</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={dailyChartData}>
                    <XAxis dataKey="day" tick={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "#1e2530", border: "1px solid #334050", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(v: number) => [`${formatMoney(v)}`, "Profit"]}
                    />
                    <Bar dataKey="profit" fill="#00b95b" radius={[3, 3, 0, 0]} maxBarSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly Performance */}
              <div className="rounded-xl border border-[#334050] bg-[#1e2530] p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">Weekly Performance</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={weeklyChartData}>
                    <XAxis dataKey="week" tick={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "#1e2530", border: "1px solid #334050", borderRadius: "8px", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="profit" stroke="#007aff" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Win/Loss Ratio */}
              <div className="rounded-xl border border-[#334050] bg-[#1e2530] p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">Win vs Loss Ratio</p>
                <div className="flex items-center justify-center h-[140px]">
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={winLossData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                        {winLossData.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#1e2530", border: "1px solid #334050", borderRadius: "8px", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1 text-[11px]">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#00b95b]" /> Wins {trader.wins}</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ff4d4d]" /> Losses {trader.losses}</span>
                  </div>
                </div>
              </div>

              {/* Trading Activity */}
              <div className="rounded-xl border border-[#334050] bg-[#1e2530] p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">Trading Activity (24h)</p>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={activityData}>
                    <XAxis dataKey="hour" tick={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "#1e2530", border: "1px solid #334050", borderRadius: "8px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="trades" stroke="#00b95b" fill="#00b95b" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Success Rate Trend */}
              <div className="rounded-xl border border-[#334050] bg-[#1e2530] p-4 sm:col-span-2">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">Success Rate Trend (12 months)</p>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={successTrendData}>
                    <XAxis dataKey="month" tick={false} axisLine={false} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "#1e2530", border: "1px solid #334050", borderRadius: "8px", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="rate" stroke="#f4b742" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ─── Recent Trades ────────────────────────────────────────────── */}
          <div>
            <h3 className="mb-3 text-[14px] font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#007aff]" />
              Recent Binary Options History
            </h3>
            <div className="overflow-x-auto rounded-xl border border-[#334050]">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#334050] text-[10px] font-bold uppercase tracking-wider text-white/40">
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Direction</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Investment</th>
                    <th className="px-4 py-3">Payout</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">Profit</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {trader.copyTrades.slice(0, 10).map((t, i) => (
                    <tr key={i} className="border-b border-[#334050] transition-colors hover:bg-[#1e2530]">
                      <td className="px-4 py-3 font-medium text-white">{t.asset}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", t.direction === "Higher" ? "bg-[#00b95b]/12 text-[#00b95b]" : "bg-[#ff4d4d]/12 text-[#ff4d4d]")}>
                          {t.direction === "Higher" ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60">{t.expiration}</td>
                      <td className="px-4 py-3 text-white">${t.investment.toFixed(2)}</td>
                      <td className="px-4 py-3 text-white/60">${t.payout.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold", t.result === "Win" ? "bg-[#00b95b]/15 text-[#00b95b]" : "bg-[#ff4d4d]/15 text-[#ff4d4d]")}>
                          {t.result}
                        </span>
                      </td>
                      <td className={cn("px-4 py-3 font-bold tabular-nums", t.profit >= 0 ? "text-[#00b95b]" : "text-[#ff4d4d]")}>
                        {formatMoney(t.profit)}
                      </td>
                      <td className="px-4 py-3 text-white/50">{new Date(t.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Achievements ─────────────────────────────────────────────── */}
          <div>
            <h3 className="mb-3 text-[14px] font-bold text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-[#007aff]" />
              Trading Achievements
            </h3>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {ACHIEVEMENTS.map((a) => (
                <div key={a.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-[#334050] bg-[#1e2530] p-3 text-center transition-all hover:border-[#007aff]/30">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${a.bg}`}>
                    <a.icon className={`h-4 w-4 ${a.color}`} />
                  </div>
                  <span className="text-[9px] font-bold text-white/60 leading-tight">{a.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Favorite Assets & Expirations ─────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#334050] bg-[#1e2530] p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
                <Target className="inline h-3 w-3 mr-1" />
                Preferred Assets
              </p>
              <div className="flex flex-wrap gap-2">
                {trader.preferredAssets.map((a) => (
                  <span key={a} className="rounded-full border border-[#334050] bg-[#27303d] px-2.5 py-1 text-[10px] font-bold text-white">
                    {a}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[#334050] bg-[#1e2530] p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
                <Clock className="inline h-3 w-3 mr-1" />
                Favorite Expiration Times
              </p>
              <div className="flex flex-wrap gap-2">
                {trader.favExpirations.map((e) => (
                  <span key={e} className="rounded-full border border-[#334050] bg-[#27303d] px-2.5 py-1 text-[10px] font-bold text-white">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Copy Trading ──────────────────────────────────────────────── */}
          <div>
            <h3 className="mb-3 text-[14px] font-bold text-white flex items-center gap-2">
              <Copy className="h-4 w-4 text-[#007aff]" />
              Copy Trading
            </h3>
            <div className="rounded-xl border border-[#334050] bg-[#1e2530] p-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Followers</p>
                  <p className="mt-1 text-[16px] font-black text-white">{trader.followers.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Success Rate</p>
                  <p className="mt-1 text-[16px] font-black text-[#00b95b]">{trader.successRate}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">30 Days P/L</p>
                  <p className={cn("mt-1 text-[16px] font-black tabular-nums", trader.last30DaysProfit >= 0 ? "text-[#00b95b]" : "text-[#ff4d4d]")}>
                    {formatMoney(trader.last30DaysProfit)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Risk Level</p>
                  <p className={cn("mt-1 text-[16px] font-black", trader.riskLevel === "Low" ? "text-[#00b95b]" : trader.riskLevel === "Medium" ? "text-[#f4b742]" : "text-[#ff4d4d]")}>
                    {trader.riskLevel}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Avg Return</p>
                  <p className="mt-1 text-[16px] font-black text-[#00b95b]">{trader.avgReturn}%</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 border-t border-[#334050] pt-4">
                <p className="text-[12px] text-white/60">
                  Min. copy amount: <span className="font-bold text-white">${trader.minCopyAmount.toFixed(2)}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setShowCopyModal(true)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] bg-[#00b95b] px-4 py-2 text-[12px] font-bold text-white transition-all hover:bg-[#00a34f]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Trade
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copy Trade Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-[rgba(5,8,16,0.72)] backdrop-blur-[2px] px-4" onClick={() => setShowCopyModal(false)}>
          <div className="w-full max-w-[460px] rounded-[20px] border border-[#334050] bg-[#232b3a] p-6 shadow-[0_40px_90px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-white">Copy {trader.name}</h3>
              <button type="button" onClick={() => setShowCopyModal(false)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#3b4b6c] bg-[#2a3450] text-[#9fb3d5] hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">Investment Amount</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-white/50">$</span>
                  <input type="number" value={copyAmount} onChange={(e) => setCopyAmount(Number(e.target.value))} className="w-full rounded-[10px] border border-[#334050] bg-[#1e2530] py-3 pl-8 pr-4 text-[14px] font-bold text-white outline-none focus:border-[#007aff]/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">Max Daily Loss</label>
                  <input type="number" value={maxLoss} onChange={(e) => setMaxLoss(Number(e.target.value))} className="w-full rounded-[10px] border border-[#334050] bg-[#1e2530] py-3 px-4 text-[14px] font-bold text-white outline-none focus:border-[#007aff]/50" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">Max Open Trades</label>
                  <input type="number" value={maxTrades} onChange={(e) => setMaxTrades(Number(e.target.value))} className="w-full rounded-[10px] border border-[#334050] bg-[#1e2530] py-3 px-4 text-[14px] font-bold text-white outline-none focus:border-[#007aff]/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">Risk Multiplier</label>
                  <select value={riskMultiplier} onChange={(e) => setRiskMultiplier(Number(e.target.value))} className="w-full rounded-[10px] border border-[#334050] bg-[#1e2530] py-3 px-4 text-[14px] font-bold text-white outline-none focus:border-[#007aff]/50">
                    <option value={0.5}>0.5x (Low)</option>
                    <option value={1}>1x (Normal)</option>
                    <option value={1.5}>1.5x (High)</option>
                    <option value={2}>2x (Very High)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">Stop Copying</label>
                  <select className="w-full rounded-[10px] border border-[#334050] bg-[#1e2530] py-3 px-4 text-[14px] font-bold text-white outline-none focus:border-[#007aff]/50">
                    <option value="never">Never</option>
                    <option value="loss">On max loss</option>
                    <option value="profit">On target profit</option>
                    <option value="date">On specific date</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { onCopy(trader.id); setShowCopyModal(false); }}
                className="w-full rounded-[10px] bg-[#00b95b] py-3.5 text-[14px] font-bold text-white transition-all hover:bg-[#00a34f]"
              >
                Start Copying
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatItem = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</p>
    <p className={cn("mt-0.5 text-[13px] font-bold text-white tabular-nums", className)}>{value}</p>
  </div>
);

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}