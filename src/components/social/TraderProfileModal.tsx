import { useEffect, useMemo, useState } from "react";
import { api } from "@/integrations/api/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Eye,
  MessageCircle,
  ShieldAlert,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { VipBadge } from "@/components/vip/VipBadge";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import { useAuth } from "@/contexts/AuthContext";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { toast } from "@/hooks/use-toast";
import {
  computeTraderWinRate,
  formatDirectionLabel,
  formatSocialCurrency,
  getTraderDisplayName,
  type TraderSummary,
} from "@/lib/social";
import type { Tables } from "@/integrations/supabase/types";

type Period = "today" | "week" | "month" | "all";
type ModalTab = "statistics" | "social" | "achievements";
type ViewMode = "profile" | "copy" | "deposit_required";

interface TraderProfileModalProps {
  trader: TraderSummary;
  onClose: () => void;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All" },
];

const RATIO_PRESETS = [
  { value: 0.5, label: "×0.5" },
  { value: 1, label: "×1" },
  { value: 2, label: "×2" },
  { value: 5, label: "×5" },
  { value: 10, label: "×10" },
];

export const TraderProfileModal = ({ trader, onClose }: TraderProfileModalProps) => {
  const navigate = useNavigate();
  const { profile: currentProfile } = useAuth();
  const { followTrader, getCopySetting, isFollowing, saveCopySetting, unfollowTrader, stopCopying } = useSocialTrading();

  const [tab, setTab] = useState<ModalTab>("statistics");
  const [period, setPeriod] = useState<Period>("all");
  const [view, setView] = useState<ViewMode>("profile");
  const [trades, setTrades] = useState<Tables<"trades">[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [fullProfile, setFullProfile] = useState<TraderSummary>(trader);

  const effectiveLiveBalance = getEffectiveLiveBalance(currentProfile);
  const hasNoBalance = effectiveLiveBalance <= 0;

  // Copy settings state
  const existingSetting = getCopySetting(trader.id);
  const [copyAmount, setCopyAmount] = useState(existingSetting?.fixed_amount?.toString() ?? "10");
  const [copyRatio, setCopyRatio] = useState(existingSetting?.ratio ?? 1);
  const [useRatio, setUseRatio] = useState(existingSetting?.amount_type === "ratio");
  const [stopBalance, setStopBalance] = useState(existingSetting?.max_daily?.toString() ?? "");
  const [minAmount, setMinAmount] = useState(existingSetting?.max_per_trade?.toString() ?? "");
  const [savingCopy, setSavingCopy] = useState(false);
  const [stopLossEnabled, setStopLossEnabled] = useState(!!existingSetting?.stop_loss_pct);
  const [stopLossPct, setStopLossPct] = useState(existingSetting?.stop_loss_pct?.toString() ?? "20");

  const isSelf = trader.id === currentProfile?.id;
  const following = isFollowing(trader.id);
  const copySetting = getCopySetting(trader.id);
  const winRate = computeTraderWinRate(fullProfile.total_wins, fullProfile.total_trades);

  useEffect(() => {
    const loadData = async () => {
      setLoadingTrades(true);
      const [{ data: profileData }, { data: tradesData }] = await Promise.all([
        api.from("profiles")
          .select("id, username, display_name, avatar_url, vip_tier, total_profit, total_trades, total_wins, followers_count, following_count, social_trading_disabled, created_at")
          .eq("id", trader.id)
          .maybeSingle(),
        api.from("trades")
          .select("*")
          .eq("user_id", trader.id)
          .neq("status", "open")
          .order("closed_at", { ascending: false })
          .limit(20),
      ]);
      if (profileData) setFullProfile({ ...trader, ...profileData });
      setTrades((tradesData ?? []) as Tables<"trades">[]);
      setLoadingTrades(false);
    };
    void loadData();
  }, [trader.id]);

  const stats = useMemo(() => {
    if (!trades.length) return null;
    const profitable = trades.filter((t) => (t.profit ?? 0) > 0).length;
    const totalTurnover = trades.reduce((s, t) => s + Number(t.amount), 0);
    const totalProfit = trades.reduce((s, t) => s + Number(t.profit ?? 0), 0);
    const amounts = trades.map((t) => Number(t.amount));
    const profits = trades.filter((t) => (t.profit ?? 0) > 0).map((t) => Number(t.profit));
    return {
      trades: trades.length,
      profitablePct: trades.length > 0 ? ((profitable / trades.length) * 100).toFixed(1) : "0",
      turnover: totalTurnover,
      profit: totalProfit,
      maxTrade: amounts.length ? Math.max(...amounts) : 0,
      minTrade: amounts.length ? Math.min(...amounts) : 0,
      maxProfit: profits.length > 0 ? Math.max(...profits) : 0,
    };
  }, [trades]);

  const handleStartCopyClick = () => {
    if (hasNoBalance) {
      toast({
        title: "Deposit Required",
        description: "You must add money to your account in order to copy trades.",
        variant: "destructive",
      });
      setView("deposit_required");
      return;
    }
    setView("copy");
  };

  const handleConfirmCopy = async () => {
    if (hasNoBalance) {
      toast({
        title: "Deposit Required",
        description: "Your balance is $0.00. Please deposit funds before enabling copy trading.",
        variant: "destructive",
      });
      setView("deposit_required");
      return;
    }

    setSavingCopy(true);
    await saveCopySetting(trader.id, {
      enabled: true,
      amountType: useRatio ? "ratio" : "fixed",
      executionMode: "automatic",
      fixedAmount: useRatio ? null : Number(copyAmount) || 10,
      ratio: useRatio ? copyRatio : null,
      maxPerTrade: Number(minAmount) || null,
      maxDaily: Number(stopBalance) || null,
      stopLossPct: stopLossEnabled ? Number(stopLossPct) || null : null,
    });
    setSavingCopy(false);
    setView("profile");
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-3xl border border-white/10 bg-[#0f1520] text-white shadow-[0_32px_80px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200">

        {/* Close */}
        <button onClick={onClose} className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>

        {/* Back button for copy view */}
        {view === "copy" && (
          <button onClick={() => setView("profile")} className="absolute left-4 top-4 z-10 flex items-center gap-1.5 text-sm font-semibold text-gray-400 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}

        {/* ─── PROFILE VIEW ─── */}
        {view === "profile" && (
          <>
            {/* Header Banner */}
            <div className="relative bg-gradient-to-br from-[#0fa053]/20 via-[#0d1c2e] to-[#131c2e] px-6 pb-5 pt-8">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {fullProfile.avatar_url ? (
                    <img src={fullProfile.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/15" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0fa053] to-purple-600 text-2xl font-black text-white ring-2 ring-white/15">
                      {getTraderDisplayName(fullProfile).charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Online indicator */}
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#0f1520] bg-[#00C076]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white/40" />
                  </span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white truncate">{getTraderDisplayName(fullProfile)}</h2>
                    <VipBadge tierId={(fullProfile.vip_tier as any) ?? "standard"} size={18} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">@{fullProfile.username ?? fullProfile.id.slice(0, 8)}</p>

                  {/* Level badges */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-gradient-to-r from-[#0fa053] to-[#0d8f47] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      Guru
                    </span>
                    <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                      Pro Trader
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-[#0fa053]" />
                      <span className="font-bold text-white">{fullProfile.followers_count ?? 0}</span>
                      <span className="text-xs text-gray-500">followers</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Eye className="h-3.5 w-3.5 text-[#0fa053]" />
                      <span className="font-bold text-white">{fullProfile.followers_count ?? 0}</span>
                      <span className="text-xs text-gray-500">watchers</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <TrendingUp className="h-3.5 w-3.5 text-[#00C076]" />
                      <span className={`font-bold ${winRate >= 50 ? "text-[#00C076]" : "text-[#F6465D]"}`}>{winRate}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {!isSelf && (
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={handleStartCopyClick}
                    disabled={fullProfile.social_trading_disabled}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0fa053] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#0d8f47] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Copy className="h-4 w-4" />
                    {copySetting ? "Manage Copy" : "Copy"}
                  </button>
                  <button
                    onClick={() => void (following ? unfollowTrader(trader.id) : followTrader(trader.id))}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                      following
                        ? "border-[#00C076]/40 bg-[#00C076]/10 text-[#00C076] hover:bg-[#00C076]/20"
                        : "border-white/15 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    {following ? "Watching" : "Watch"}
                  </button>
                  <button className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95">
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Balance warning banner */}
              {!isSelf && hasNoBalance && (
                <button
                  onClick={() => navigate("/deposit")}
                  className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-orange-500/30 bg-orange-500/15 px-3.5 py-2.5 text-left text-xs font-semibold text-orange-200 transition-colors hover:bg-orange-500/25"
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-orange-400 shrink-0" />
                    <span>Add money to your account in order to copy trades ($0.00)</span>
                  </div>
                  <span className="shrink-0 rounded-lg bg-orange-500 px-2 py-1 text-[10px] font-black uppercase text-black">
                    Deposit
                  </span>
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/8">
              {(["statistics", "social", "achievements"] as ModalTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    tab === t
                      ? "border-b-2 border-[#0fa053] text-white"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {t === "statistics" ? "Trading Stats" : t === "social" ? "Social" : "Achievements"}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="max-h-[360px] overflow-y-auto px-5 py-4">

              {/* Period selector (only for stats) */}
              {tab === "statistics" && (
                <div className="mb-4 flex items-center gap-1.5">
                  {PERIODS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPeriod(p.key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        period === p.key
                          ? "bg-[#0fa053] text-white"
                          : "border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {tab === "statistics" && (
                loadingTrades ? (
                  <div className="py-8 text-center text-sm text-gray-400">Loading stats...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <StatRow label="Trades" value={String(fullProfile.total_trades ?? 0)} />
                      <StatRow
                        label="Profitable Trades"
                        value={`${stats?.profitablePct ?? 0}%`}
                        accent={Number(stats?.profitablePct ?? 0) >= 50 ? "text-[#00C076]" : "text-[#F6465D]"}
                      />
                      <StatRow label="Trading Turnover" value={formatSocialCurrency(stats?.turnover ?? 0)} />
                      <StatRow
                        label="Trading Profit"
                        value={`${(stats?.profit ?? 0) >= 0 ? "+" : ""}${formatSocialCurrency(stats?.profit ?? 0)}`}
                        accent={(stats?.profit ?? 0) >= 0 ? "text-[#00C076]" : "text-[#F6465D]"}
                      />
                      <StatRow label="Max Trade" value={formatSocialCurrency(stats?.maxTrade ?? 0)} />
                      <StatRow label="Min Trade" value={formatSocialCurrency(stats?.minTrade ?? 0)} />
                      <StatRow label="Max Profit" value={formatSocialCurrency(stats?.maxProfit ?? 0)} accent="text-[#00C076]" />
                      <StatRow
                        label="Win Rate"
                        value={`${winRate}%`}
                        accent={winRate >= 50 ? "text-[#00C076]" : "text-[#F6465D]"}
                      />
                    </div>

                    {/* Recent trades */}
                    {trades.length > 0 && (
                      <>
                        <h4 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-gray-500">Recent Trades</h4>
                        <div className="space-y-1.5">
                          {trades.slice(0, 6).map((trade) => (
                            <div key={trade.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
                                    trade.direction === "higher" ? "bg-[#00C076]/15 text-[#00C076]" : "bg-[#F6465D]/15 text-[#F6465D]"
                                  }`}
                                >
                                  {trade.direction === "higher" ? "↑" : "↓"}
                                </span>
                                <div>
                                  <p className="text-xs font-semibold text-white">{trade.asset_symbol}</p>
                                  <p className="text-[10px] text-gray-500">{formatDirectionLabel(trade.direction)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-xs font-bold ${(trade.profit ?? 0) >= 0 ? "text-[#00C076]" : "text-[#F6465D]"}`}>
                                  {(trade.profit ?? 0) >= 0 ? "+" : ""}{formatSocialCurrency(trade.profit)}
                                </p>
                                <p className="text-[10px] text-gray-500">${Number(trade.amount).toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )
              )}

              {tab === "social" && (
                <div className="space-y-3">
                  <StatRow label="Total Followers" value={String(fullProfile.followers_count ?? 0)} />
                  <StatRow label="Following" value={String(fullProfile.following_count ?? 0)} />
                  <StatRow label="Social Trading" value={fullProfile.social_trading_disabled ? "Disabled" : "Enabled"} accent={fullProfile.social_trading_disabled ? "text-[#F6465D]" : "text-[#00C076]"} />
                  <StatRow label="Total Profit" value={`${(fullProfile.total_profit ?? 0) >= 0 ? "+" : ""}${formatSocialCurrency(fullProfile.total_profit ?? 0)}`} accent={(fullProfile.total_profit ?? 0) >= 0 ? "text-[#00C076]" : "text-[#F6465D]"} />

                  <div className="mt-4 flex gap-3">
                    <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#00C076]/25 bg-[#00C076]/10 py-3 text-sm font-bold text-[#00C076] transition-colors hover:bg-[#00C076]/20">
                      <ThumbsUp className="h-4 w-4" /> Good trader
                    </button>
                    <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#F6465D]/25 bg-[#F6465D]/10 py-3 text-sm font-bold text-[#F6465D] transition-colors hover:bg-[#F6465D]/20">
                      <ThumbsDown className="h-4 w-4" /> Poor trader
                    </button>
                  </div>
                </div>
              )}

              {tab === "achievements" && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: "🏆", label: "Top Trader", desc: "Top 10% monthly" },
                    { icon: "🎯", label: "Accurate", desc: "70%+ win rate" },
                    { icon: "💎", label: "VIP Member", desc: "Premium status" },
                    { icon: "🔥", label: "Hot Streak", desc: "5 wins in a row" },
                    { icon: "📈", label: "Profitable", desc: "+$1,000 profit" },
                    { icon: "👥", label: "Influencer", desc: "10+ followers" },
                  ].map((a) => (
                    <div key={a.label} className="flex flex-col items-center rounded-xl border border-white/8 bg-white/[0.03] px-2 py-3 text-center">
                      <span className="text-2xl">{a.icon}</span>
                      <p className="mt-1.5 text-xs font-bold text-white">{a.label}</p>
                      <p className="mt-0.5 text-[10px] text-gray-500">{a.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── COPY SETTINGS VIEW ─── */}
        {view === "copy" && (
          <>
            {/* Header */}
            <div className="border-b border-white/8 px-6 pt-8 pb-5">
              <div className="flex items-center gap-3">
                {fullProfile.avatar_url ? (
                  <img src={fullProfile.avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/15" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0fa053] to-purple-600 text-base font-black text-white">
                    {getTraderDisplayName(fullProfile).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-white">Copy {getTraderDisplayName(fullProfile)}</h2>
                  <p className="text-xs text-gray-400">Configure your copy trading parameters</p>
                </div>
              </div>
            </div>

            <div className="max-h-[480px] overflow-y-auto px-5 py-4 space-y-4">

              {/* Copy in proportion */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Copy amount</p>
                    <p className="text-xs text-gray-400">Fixed $ amount or proportion of trader's stake</p>
                  </div>
                  <div className="flex gap-1.5 rounded-xl bg-black/20 p-1">
                    <button
                      onClick={() => setUseRatio(false)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${!useRatio ? "bg-[#0fa053] text-white" : "text-gray-400 hover:text-white"}`}
                    >
                      Fixed
                    </button>
                    <button
                      onClick={() => setUseRatio(true)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${useRatio ? "bg-[#0fa053] text-white" : "text-gray-400 hover:text-white"}`}
                    >
                      Ratio
                    </button>
                  </div>
                </div>

                {!useRatio ? (
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-gray-400">$</span>
                    <input
                      type="number"
                      value={copyAmount}
                      min="1"
                      step="1"
                      onChange={(e) => setCopyAmount(e.target.value)}
                      className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-bold text-white outline-none transition-colors focus:border-[#0fa053]"
                    />
                  </div>
                ) : (
                  <>
                    <div className="mb-2 grid grid-cols-5 gap-1.5">
                      {RATIO_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => setCopyRatio(preset.value)}
                          className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                            copyRatio === preset.value
                              ? "bg-[#0fa053] text-white"
                              : "border border-white/10 bg-black/20 text-gray-400 hover:text-white"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-center text-xs text-gray-400">
                      You will copy <span className="font-bold text-white">{(copyRatio * 100).toFixed(0)}%</span> of provider's trade amount
                    </p>
                  </>
                )}
              </div>

              {/* Stop balance */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Stop Balance ($)</label>
                <input
                  type="number"
                  value={stopBalance}
                  placeholder="Unlimited"
                  min="0"
                  onChange={(e) => setStopBalance(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[#0fa053]"
                />
                <p className="mt-1 text-xs text-gray-500">Stop copying if your balance drops to this level</p>
              </div>

              {/* Min copy trade */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Min Copy Trade ($)</label>
                <input
                  type="number"
                  value={minAmount}
                  placeholder="No minimum"
                  min="0"
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[#0fa053]"
                />
              </div>

              {/* Stop Loss */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Stop Loss</p>
                    <p className="text-xs text-gray-400">Stop copying if trader loses too much</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStopLossEnabled(!stopLossEnabled)}
                    className={`relative h-6 w-10 rounded-full transition-colors ${stopLossEnabled ? "bg-[#0fa053]" : "bg-gray-600"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow ${stopLossEnabled ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
                {stopLossEnabled && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      value={stopLossPct}
                      min="1"
                      max="100"
                      onChange={(e) => setStopLossPct(e.target.value)}
                      className="w-20 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#0fa053]"
                    />
                    <span className="text-sm text-gray-400">% loss threshold</span>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-[#0fa053]/20 bg-[#0fa053]/8 px-4 py-3">
                <p className="text-xs text-[#9be1bc]">
                  {useRatio
                    ? `You will copy ${(copyRatio * 100).toFixed(0)}% of ${getTraderDisplayName(fullProfile)}'s trade amount automatically.`
                    : `You will copy a fixed $${copyAmount || "10"} on each trade by ${getTraderDisplayName(fullProfile)}.`}
                  {stopBalance && ` Stops if balance ≤ $${stopBalance}.`}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-white/8 px-5 py-4">
              {copySetting && (
                <button
                  onClick={async () => {
                    await stopCopying(trader.id);
                    setView("profile");
                  }}
                  className="rounded-xl border border-[#F6465D]/40 px-4 py-2.5 text-sm font-bold text-[#F6465D] transition-colors hover:bg-[#F6465D]/10"
                >
                  Stop
                </button>
              )}
              <button
                onClick={() => setView("profile")}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Back
              </button>
              <button
                onClick={() => void handleConfirmCopy()}
                disabled={savingCopy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0fa053] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0d8f47] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingCopy ? "Saving..." : copySetting ? "Update Copy" : "Confirm Copy"}
              </button>
            </div>
          </>
        )}

        {/* ─── DEPOSIT REQUIRED VIEW ─── */}
        {view === "deposit_required" && (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/15 text-orange-400">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Deposit Required</h3>
              <p className="mt-2 text-xs text-gray-400 leading-5">
                You cannot copy trades from <span className="font-semibold text-white">{getTraderDisplayName(fullProfile)}</span> because your live account balance is <span className="font-bold text-orange-400">$0.00</span>.
              </p>
            </div>
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-xs text-orange-300 text-left">
              <p className="font-bold">Why do I need to deposit?</p>
              <p className="mt-1 text-orange-300/80">
                Automated copy trading mirrors real order stakes on your live account in real time. Please top up your live wallet balance to begin.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setView("profile")}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Back
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate("/deposit");
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0fa053] py-3 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-[#0d8f47]"
              >
                <Wallet className="h-4 w-4" /> Deposit Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatRow = ({ label, value, accent = "text-white" }: { label: string; value: string; accent?: string }) => (
  <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
    <span className="text-xs text-gray-400">{label}</span>
    <span className={`text-sm font-bold ${accent}`}>{value}</span>
  </div>
);
