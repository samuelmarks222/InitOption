import { useEffect, useMemo, useState } from "react";
import { api } from "@/integrations/api/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Copy,
  Eye,
  Info,
  MessageCircle,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import { useAuth } from "@/contexts/AuthContext";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { toast } from "@/hooks/use-toast";
import {
  computeTraderWinRate,
  formatSocialCurrency,
  getTraderDisplayName,
  type TraderSummary,
} from "@/lib/social";
import type { Tables } from "@/integrations/supabase/types";

type Period = "today" | "week" | "month" | "all";
type ModalTab = "statistics" | "social";
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
  { value: 0.5, label: "x0.5" },
  { value: 1, label: "x1" },
  { value: 2, label: "x2" },
  { value: 5, label: "x5" },
  { value: 10, label: "x10" },
];

export const TraderProfileModal = ({ trader, onClose }: TraderProfileModalProps) => {
  const navigate = useNavigate();
  const { profile: currentProfile } = useAuth();
  const { followTrader, getCopySetting, isFollowing, saveCopySetting, unfollowTrader } = useSocialTrading();

  const [tab, setTab] = useState<ModalTab>("statistics");
  const [period, setPeriod] = useState<Period>("today");
  const [view, setView] = useState<ViewMode>("profile");
  const [trades, setTrades] = useState<Tables<"trades">[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [fullProfile, setFullProfile] = useState<TraderSummary>(trader);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const effectiveLiveBalance = getEffectiveLiveBalance(currentProfile);
  const hasNoBalance = effectiveLiveBalance <= 0;

  const existingSetting = getCopySetting(trader.id);
  const [copyRatio, setCopyRatio] = useState(existingSetting?.ratio ?? 1);
  const [stopBalance, setStopBalance] = useState(existingSetting?.max_daily?.toString() ?? "1");
  const [minAmount, setMinAmount] = useState(existingSetting?.max_per_trade?.toString() ?? "1");
  const [maxAmount, setMaxAmount] = useState("");
  const [savingCopy, setSavingCopy] = useState(false);

  const isSelf = trader.id === currentProfile?.id
    || (currentProfile?.username && trader.username && currentProfile.username === trader.username)
    || (currentProfile?.display_name && fullProfile.display_name && currentProfile.display_name === fullProfile.display_name)
    || (currentProfile?.email && (trader as any).email && currentProfile.email === (trader as any).email);
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
      profitablePct: trades.length > 0 ? ((profitable / trades.length) * 100).toFixed(0) : "0",
      turnover: totalTurnover,
      profit: totalProfit,
      maxTrade: amounts.length ? Math.max(...amounts) : 0,
      minTrade: amounts.length ? Math.min(...amounts) : 0,
      maxProfit: profits.length > 0 ? Math.max(...profits) : 0,
    };
  }, [trades]);

  const handleStartCopyClick = () => {
    if (hasNoBalance) {
      setView("deposit_required");
      return;
    }
    setView("copy");
  };

  const handleConfirmCopy = async () => {
    if (hasNoBalance) {
      setView("deposit_required");
      return;
    }
    setSavingCopy(true);
    await saveCopySetting(trader.id, {
      enabled: true,
      amountType: "ratio",
      executionMode: "automatic",
      fixedAmount: null,
      ratio: copyRatio,
      maxPerTrade: Number(minAmount) || null,
      maxDaily: Number(stopBalance) || null,
      stopLossPct: null,
    });
    setSavingCopy(false);
    setView("profile");
    toast({ title: "Copy trading enabled", description: `Now copying ${getTraderDisplayName(fullProfile)}` });
  };

  const shortId = fullProfile.id ? fullProfile.id.replace(/-/g, "").slice(0, 8).toUpperCase() : "--------";

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-[520px] max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 bg-[#23283b] text-white shadow-[0_32px_80px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200">

        {/* Close */}
        <button onClick={onClose} className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[#a9b5d0] transition-colors hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>

        {/* Back button for copy view */}
        {view === "copy" && (
          <button onClick={() => setView("profile")} className="absolute left-4 top-4 z-10 flex items-center gap-1.5 text-sm font-semibold text-[#a9b5d0] transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}

        {/* ─── PROFILE VIEW ─── */}
        {view === "profile" && (
          <>
            {/* Header */}
            <div className="px-6 pt-5 pb-0">
              <h2 className="text-[15px] font-bold text-[#f3f7ff]">
                Real trading profile ID: {shortId}
              </h2>
            </div>

            {/* Profile Info */}
            <div className="px-6 pt-4 pb-4">
              <div className="flex items-start gap-5">
                {/* Avatar with gold ring */}
                <div className="relative shrink-0">
                  <div className="w-[72px] h-[72px] rounded-full p-[3px] bg-gradient-to-br from-[#f59e0b] via-[#f97316] to-[#f59e0b]">
                    {fullProfile.avatar_url ? (
                      <img src={fullProfile.avatar_url} alt="" className="w-full h-full rounded-full object-cover bg-[#23283b]" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#2c3148] flex items-center justify-center">
                        <span className="text-2xl font-bold text-[#a9b5d0]">
                          {getTraderDisplayName(fullProfile).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#23283b] bg-[#00C076]">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                  </span>
                </div>

                {/* Info Grid */}
                <div className="flex-1 grid grid-cols-3 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-[11px] text-[#a9b5d0]">Name</p>
                    <p className="text-[13px] font-bold text-[#f3f7ff]">{getTraderDisplayName(fullProfile)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#a9b5d0]">Status</p>
                    <p className="text-[13px] font-bold text-[#f3f7ff]">last seen today</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#a9b5d0]">Followers</p>
                    <p className="text-[13px] font-bold text-[#f3f7ff]">{fullProfile.followers_count ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#a9b5d0]">Profile Level</p>
                    <p className="text-[13px] font-bold text-[#f3f7ff]">Guru</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#a9b5d0]">Account Level</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[13px] font-bold text-[#f3f7ff]">{winRate}</span>
                      <span className="text-[10px] text-[#a9b5d0]">%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#a9b5d0]">Watchers</p>
                    <p className="text-[13px] font-bold text-[#f3f7ff]">{fullProfile.followers_count ?? 0}</p>
                  </div>
                </div>
              </div>

              {/* Balance warning banner */}
              {!isSelf && hasNoBalance && (
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#2c8af5]/30 bg-[#2c8af5]/10 px-3.5 py-2.5">
                  <Info className="h-4 w-4 text-[#2c8af5] shrink-0" />
                  <p className="text-[12px] text-[#f3f7ff]">
                    <span className="font-bold underline cursor-pointer" onClick={() => navigate("/deposit")}>Add money</span> to your account in order to copy trades.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {!isSelf && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleStartCopyClick}
                    disabled={fullProfile.social_trading_disabled}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0fa055] px-4 py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Copy className="h-4 w-4" />
                    {copySetting ? "Manage Copy" : "Copy"}
                  </button>
                  <button
                    onClick={() => {
                      if (isSelf) {
                        toast({ title: "Cannot follow yourself", description: "You cannot watch your own profile.", variant: "destructive" });
                        return;
                      }
                      void (following ? unfollowTrader(trader.id) : followTrader(trader.id));
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-bold transition-all active:scale-95 ${
                      following
                        ? "border-[#0fa055]/40 bg-[#0fa055]/10 text-[#0fa055]"
                        : "border-[rgba(143,164,210,0.24)] bg-white/5 text-[#f3f7ff] hover:bg-white/10"
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    {following ? "Watching" : "Watch"}
                  </button>
                  <button className="flex items-center justify-center gap-2 rounded-xl border border-[rgba(143,164,210,0.24)] bg-white/5 px-4 py-2.5 text-[13px] font-bold text-[#f3f7ff] transition-all hover:bg-white/10 active:scale-95">
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Tabs + Content */}
            <div className="flex border-t border-white/8">
              {/* Left Tabs */}
              <div className="w-[160px] shrink-0 border-r border-white/8 py-2">
                {(["statistics", "social"] as ModalTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`w-full text-left px-4 py-2.5 text-[12px] font-bold transition-colors ${
                      tab === t
                        ? "bg-[#8fb3ea]/15 text-[#8fb3ea] border-l-2 border-[#8fb3ea]"
                        : "text-[#a9b5d0] hover:text-[#f3f7ff] border-l-2 border-transparent"
                    }`}
                  >
                    {t === "statistics" ? "Trading Statistics" : "Social Statistics"}
                  </button>
                ))}
              </div>

              {/* Right Content */}
              <div className="flex-1 overflow-y-auto max-h-[320px]">
                {tab === "statistics" && (
                  <div className="p-4">
                    {/* Period Dropdown */}
                    <div className="relative mb-4">
                      <button
                        onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                        className="flex items-center gap-2 rounded-lg border border-[rgba(143,164,210,0.24)] bg-[#2a3046] px-3 py-2 text-[12px] font-semibold text-[#f3f7ff]"
                      >
                        <Calendar className="h-3.5 w-3.5 text-[#a9b5d0]" />
                        {PERIODS.find((p) => p.key === period)?.label}
                      </button>
                      {showPeriodDropdown && (
                        <div className="absolute top-full left-0 mt-1 z-10 w-36 rounded-lg border border-white/10 bg-[#23283b] shadow-xl">
                          {PERIODS.map((p) => (
                            <button
                              key={p.key}
                              onClick={() => { setPeriod(p.key); setShowPeriodDropdown(false); }}
                              className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${
                                period === p.key
                                  ? "bg-[#8fb3ea]/15 text-[#8fb3ea]"
                                  : "text-[#a9b5d0] hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {loadingTrades ? (
                      <div className="py-8 text-center text-[12px] text-[#a9b5d0]">Loading stats...</div>
                    ) : (
                      <div className="space-y-1">
                        <StatRow label="Trades:" value={String(fullProfile.total_trades ?? 0)} />
                        <StatRow label="Profitable trades:" value={`${stats?.profitablePct ?? 0}%`} />
                        <StatRow label="Trading turnover:" value={formatSocialCurrency(stats?.turnover ?? 0)} />
                        <StatRow label="Trading profit:" value={formatSocialCurrency(stats?.profit ?? 0)} accent={(stats?.profit ?? 0) >= 0 ? "text-[#0fa055]" : "text-[#d96059]"} />
                        <StatRow label="Max. trade:" value={formatSocialCurrency(stats?.maxTrade ?? 0)} />
                        <StatRow label="Min. trade:" value={formatSocialCurrency(stats?.minTrade ?? 0)} />
                        <StatRow label="Max. profit:" value={formatSocialCurrency(stats?.maxProfit ?? 0)} />
                      </div>
                    )}
                  </div>
                )}

                {tab === "social" && (
                  <div className="p-4 space-y-1">
                    <StatRow label="Total Followers" value={String(fullProfile.followers_count ?? 0)} />
                    <StatRow label="Following" value={String(fullProfile.following_count ?? 0)} />
                    <StatRow label="Social Trading" value={fullProfile.social_trading_disabled ? "Disabled" : "Enabled"} accent={fullProfile.social_trading_disabled ? "text-[#d96059]" : "text-[#0fa055]"} />
                    <StatRow label="Total Profit" value={`${(fullProfile.total_profit ?? 0) >= 0 ? "+" : ""}${formatSocialCurrency(fullProfile.total_profit ?? 0)}`} accent={(fullProfile.total_profit ?? 0) >= 0 ? "text-[#0fa055]" : "text-[#d96059]"} />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ─── COPY SETTINGS VIEW ─── */}
        {view === "copy" && (
          <>
            {/* Header */}
            <div className="px-6 pt-5 pb-0">
              <h2 className="text-[15px] font-bold text-[#f3f7ff]">
                Real trading profile ID: {shortId}
              </h2>
            </div>

            {/* Profile mini info */}
            <div className="px-6 pt-4 pb-3 flex items-start gap-5">
              <div className="relative shrink-0">
                <div className="w-[72px] h-[72px] rounded-full p-[3px] bg-gradient-to-br from-[#f59e0b] via-[#f97316] to-[#f59e0b]">
                  {fullProfile.avatar_url ? (
                    <img src={fullProfile.avatar_url} alt="" className="w-full h-full rounded-full object-cover bg-[#23283b]" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#2c3148] flex items-center justify-center">
                      <span className="text-2xl font-bold text-[#a9b5d0]">
                        {getTraderDisplayName(fullProfile).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#23283b] bg-[#00C076]">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                </span>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-x-4 gap-y-2">
                <div>
                  <p className="text-[11px] text-[#a9b5d0]">Name</p>
                  <p className="text-[13px] font-bold text-[#f3f7ff]">{getTraderDisplayName(fullProfile)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#a9b5d0]">Status</p>
                  <p className="text-[13px] font-bold text-[#f3f7ff]">last seen today</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#a9b5d0]">Followers</p>
                  <p className="text-[13px] font-bold text-[#f3f7ff]">{fullProfile.followers_count ?? 0}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#a9b5d0]">Profile Level</p>
                  <p className="text-[13px] font-bold text-[#f3f7ff]">Guru</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#a9b5d0]">Account Level</p>
                  <p className="text-[13px] font-bold text-[#f3f7ff]">{winRate}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#a9b5d0]">Watchers</p>
                  <p className="text-[13px] font-bold text-[#f3f7ff]">{fullProfile.followers_count ?? 0}</p>
                </div>
              </div>
            </div>

            {!isSelf && hasNoBalance && (
              <div className="mx-6 mb-3 flex items-center gap-2.5 rounded-xl border border-[#2c8af5]/30 bg-[#2c8af5]/10 px-3.5 py-2.5">
                <Info className="h-4 w-4 text-[#2c8af5] shrink-0" />
                <p className="text-[12px] text-[#f3f7ff]">
                  <span className="font-bold underline cursor-pointer" onClick={() => navigate("/deposit")}>Add money</span> to your account in order to copy trades.
                </p>
              </div>
            )}

            {!isSelf && (
              <div className="mx-6 mb-3 flex gap-2">
                <button
                  onClick={handleStartCopyClick}
                  disabled={fullProfile.social_trading_disabled}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0fa055] px-4 py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Copy className="h-4 w-4" />
                  {copySetting ? "Manage Copy" : "Copy"}
                </button>
                <button
                  onClick={() => void (following ? unfollowTrader(trader.id) : followTrader(trader.id))}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-bold transition-all active:scale-95 ${
                    following
                      ? "border-[#0fa055]/40 bg-[#0fa055]/10 text-[#0fa055]"
                      : "border-[rgba(143,164,210,0.24)] bg-white/5 text-[#f3f7ff] hover:bg-white/10"
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  {following ? "Watching" : "Watch"}
                </button>
                <button className="flex items-center justify-center gap-2 rounded-xl border border-[rgba(143,164,210,0.24)] bg-white/5 px-4 py-2.5 text-[13px] font-bold text-[#f3f7ff] transition-all hover:bg-white/10 active:scale-95">
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Copy Settings Form */}
            <div className="border-t border-white/8 px-6 py-5">
              <h3 className="text-[15px] font-bold text-[#f3f7ff] mb-4">Copy settings</h3>

              {/* Copy in proportion + Stop balance */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[#0fa055]">Copy in proportion:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={copyRatio * 100}
                      onChange={(e) => setCopyRatio(Number(e.target.value) / 100 || 1)}
                      className="flex-1 rounded-lg border border-[rgba(143,164,210,0.24)] bg-[#2a3046] px-3 py-2 text-[13px] font-bold text-[#f3f7ff] outline-none focus:border-[#8fb3ea]"
                    />
                    <span className="text-[13px] font-bold text-[#a9b5d0]">%</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {RATIO_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setCopyRatio(preset.value)}
                        className={`flex-1 rounded-md py-1.5 text-[11px] font-bold transition-colors ${
                          copyRatio === preset.value
                            ? "bg-[#8fb3ea] text-white"
                            : "border border-[rgba(143,164,210,0.24)] bg-[#2a3046] text-[#a9b5d0] hover:text-white"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[#0fa055]">Stop balance:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={stopBalance}
                      onChange={(e) => setStopBalance(e.target.value)}
                      placeholder="1"
                      className="flex-1 rounded-lg border border-[rgba(143,164,210,0.24)] bg-[#2a3046] px-3 py-2 text-[13px] font-bold text-[#f3f7ff] outline-none placeholder:text-[#a9b5d0] focus:border-[#8fb3ea]"
                    />
                    <span className="text-[13px] font-bold text-[#a9b5d0]">$</span>
                  </div>
                </div>
              </div>

              {/* Min + Max copy trade amount */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[#0fa055]">Min. copy trade amount:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="flex-1 rounded-lg border border-[rgba(143,164,210,0.24)] bg-[#2a3046] px-3 py-2 text-[13px] font-bold text-[#f3f7ff] outline-none focus:border-[#8fb3ea]"
                    />
                    <span className="text-[13px] font-bold text-[#a9b5d0]">$</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[#0fa055]">Max. copy trade amount:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="Unlimited"
                      className="flex-1 rounded-lg border border-[rgba(143,164,210,0.24)] bg-[#2a3046] px-3 py-2 text-[13px] font-bold text-[#f3f7ff] outline-none placeholder:text-[#a9b5d0] focus:border-[#8fb3ea]"
                    />
                    <span className="text-[13px] font-bold text-[#a9b5d0]">$</span>
                  </div>
                </div>
              </div>

              {/* Summary text */}
              <div className="text-[11px] text-[#a9b5d0] space-y-1 mb-5">
                <p>You will copy <span className="font-bold text-[#f3f7ff]">{(copyRatio * 100).toFixed(0)}% of provider's trade amount</span></p>
                <p>Min amount of copied trade <span className="font-bold text-[#f3f7ff]">${minAmount || "1"}</span></p>
                <p>Copying will stop if balance less than <span className="font-bold text-[#f3f7ff]">${stopBalance || "1"}</span></p>
                <p className="mt-2 text-[10px] text-[#a9b5d0]">
                  Provider's trade less than ${minAmount || "1"} will not be copied. The maximum amount of the copied trade depends on your account's loyalty program level.
                </p>
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setView("profile")}
                  className="flex-1 rounded-xl border border-[rgba(143,164,210,0.24)] bg-white/5 py-2.5 text-[13px] font-bold text-[#f3f7ff] transition-colors hover:bg-white/10"
                >
                  Back
                </button>
                <button
                  onClick={() => void handleConfirmCopy()}
                  disabled={savingCopy}
                  className="flex-1 rounded-xl bg-[#0fa055] py-2.5 text-[13px] font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingCopy ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ─── DEPOSIT REQUIRED VIEW ─── */}
        {view === "deposit_required" && (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#2c8af5]/15 text-[#2c8af5]">
              <Wallet className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#f3f7ff]">Deposit Required</h3>
              <p className="mt-2 text-[12px] text-[#a9b5d0] leading-5">
                You cannot copy trades from <span className="font-semibold text-[#f3f7ff]">{getTraderDisplayName(fullProfile)}</span> because your live account balance is <span className="font-bold text-[#d96059]">$0.00</span>.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setView("profile")}
                className="flex-1 rounded-xl border border-[rgba(143,164,210,0.24)] bg-white/5 py-2.5 text-[12px] font-bold text-[#f3f7ff] transition-colors hover:bg-white/10"
              >
                Back
              </button>
              <button
                onClick={() => { onClose(); navigate("/deposit"); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0fa055] py-2.5 text-[12px] font-bold text-white transition-colors hover:opacity-90"
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

const StatRow = ({ label, value, accent = "text-[#f3f7ff]" }: { label: string; value: string; accent?: string }) => (
  <div className="flex items-center justify-between rounded-lg border-l-2 border-[#8fb3ea] bg-white/[0.03] px-3 py-2.5">
    <span className="text-[12px] text-[#a9b5d0]">{label}</span>
    <span className={`text-[13px] font-bold ${accent}`}>{value}</span>
  </div>
);
