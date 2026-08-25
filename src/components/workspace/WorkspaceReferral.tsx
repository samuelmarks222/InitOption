import {
  CalendarDays,
  CheckCircle2,
  Copy,
  DollarSign,
  FileText,
  ImageIcon,
  LockKeyhole,
  QrCode,
  Share2,
  TrendingUp,
  UserRoundPlus,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/integrations/api/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { DEFAULT_PLATFORM_SETTINGS, normalizePlatformSettings, type PlatformSettingsRecord } from "@/lib/platformMetadata";
import type { WorkspaceModule } from "../navigation/NavigationSidebar";

type ReferralTab = "trading" | "profile" | "loyalty" | "security" | "history" | "friends";
type ShareMode = "link" | "code";
type DetailMode = "calculator" | "terms";
type PromoAssetMode = "banners";
type AccountTabTarget = "personal" | "settings" | "trading_history";
type BonusSettingsRow = Pick<
  Tables<"bonus_settings">,
  | "deposit_bonus_enabled"
  | "deposit_bonus_max"
  | "deposit_bonus_min"
  | "deposit_bonus_percent"
  | "referral_commission_enabled"
  | "referral_commission_payout_timing"
  | "referral_commission_percent"
  | "referral_commission_type"
  | "welcome_bonus_amount"
  | "welcome_bonus_enabled"
>;

const PRODUCTION_REFERRAL_ORIGIN = "https://initoption.com";

const formatMoney = (value: number, precision = 2) =>
  `$${Number.isFinite(value) ? value.toFixed(precision) : "0.00"}`;

const clampPercent = (value: number) => Math.max(0, Math.min(500, Number.isFinite(value) ? value : 0));

const panelStyle = {
  background: "var(--trading-panel-bg)",
  borderColor: "var(--trading-border-color)",
};

const softPanelStyle = {
  background: "var(--trading-panel-soft-bg)",
  borderColor: "var(--trading-border-color)",
};

interface WorkspaceReferralProps {
  onSelectWorkspace?: (workspace: WorkspaceModule) => void;
}

const PromoIllustration = () => (
  <div className="relative h-full min-h-[150px] overflow-hidden">
    <div className="absolute bottom-[-44px] right-0 h-[210px] w-[310px] rounded-full bg-[#0b7557]/10 blur-[24px]" />
    <div className="absolute bottom-0 right-[178px] h-[142px] w-[58px] rounded-t-[32px] bg-[#558b79] shadow-[0_0_0_2px_rgba(255,255,255,0.16)_inset]" />
    <div className="absolute right-[194px] top-[30px] h-[48px] w-[48px] rounded-full bg-[#93cbb7] shadow-[0_0_0_2px_rgba(255,255,255,0.16)_inset]" />
    <div className="absolute right-[201px] top-[48px] h-[3px] w-[7px] rounded-full bg-[#1f3f37]" />
    <div className="absolute right-[181px] top-[48px] h-[3px] w-[7px] rounded-full bg-[#1f3f37]" />
    <div className="absolute right-[189px] top-[62px] h-[7px] w-[16px] rounded-b-full border-b-2 border-[#1f3f37]" />
    <div className="absolute right-[238px] top-[72px] h-[78px] w-[34px] -rotate-12 rounded-[10px] bg-[#477564] shadow-[0_0_0_2px_rgba(255,255,255,0.14)_inset]" />
    <div className="absolute right-[229px] top-[99px] h-[12px] w-[25px] rounded-full bg-[#0b7557]" />
    <div className="absolute bottom-0 right-[48px] h-[160px] w-[76px] rounded-t-[40px] bg-[#3f6f5f] shadow-[0_0_0_2px_rgba(255,255,255,0.16)_inset]" />
    <div className="absolute right-[77px] top-[22px] h-[54px] w-[54px] rounded-full bg-[#7fbca5] shadow-[0_0_0_2px_rgba(255,255,255,0.16)_inset]" />
    <div className="absolute right-[94px] top-[42px] h-[3px] w-[7px] rounded-full bg-[#1f3f37]" />
    <div className="absolute right-[73px] top-[42px] h-[3px] w-[7px] rounded-full bg-[#1f3f37]" />
    <div className="absolute right-[82px] top-[56px] h-[7px] w-[16px] rounded-b-full border-b-2 border-[#1f3f37]" />
    <div className="absolute right-[10px] top-[88px] h-[88px] w-[44px] rotate-12 rounded-[12px] bg-[#5c8e7b] shadow-[0_0_0_2px_rgba(255,255,255,0.15)_inset]" />
    <div className="absolute right-[27px] top-[105px] h-[42px] w-[4px] rounded bg-[#c7fff0]" />
  </div>
);

const MiniBrandMark = () => (
  <div className="relative h-[126px] w-[126px]">
    <div className="absolute inset-y-0 left-1 w-[72px] rounded-l-[12px] rounded-r-[54px] bg-[#0b7557]" />
    <div className="absolute bottom-2 left-[56px] h-[58px] w-[58px] rounded-full bg-[#5ee0bd]" />
    <div className="absolute left-8 top-9 h-10 w-12 rounded-lg border border-white/50" />
    <div className="absolute left-11 top-12 h-2 w-7 rounded-full bg-white/75" />
  </div>
);

const EmptyFriendsState = ({ onShare }: { onShare: () => void }) => (
  <div className="flex h-full min-h-0 flex-col items-center justify-center text-center">
    <div className="relative mb-4">
      <div className="h-[16px] w-[148px] rounded bg-white/[0.035]" />
      <div className="mx-auto mt-2 h-[16px] w-[196px] rounded bg-white/[0.035]" />
      <div className="mx-auto mt-2 h-[16px] w-[150px] rounded bg-white/[0.035]" />
      <div className="absolute left-1/2 top-1 flex h-[54px] w-[54px] -translate-x-1/2 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.06]">
        <UserRoundPlus className="h-7 w-7 text-[#9ddac6]" />
      </div>
    </div>
    <h3 className="text-[16px] font-bold text-[var(--trading-text-color)]">No referred traders yet</h3>
    <p className="mt-2 text-[12px] font-medium text-[var(--trading-muted-color)]">
      Share your Init Option link and new referrals will appear here automatically.
    </p>
    <button
      type="button"
      onClick={onShare}
      className="mt-4 flex h-[34px] w-[250px] max-w-full items-center justify-center gap-2 rounded-[7px] bg-[#0b7557] text-[12px] font-bold text-white hover:brightness-110"
    >
      <Share2 className="h-4 w-4" />
      Share your link
    </button>
  </div>
);

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => (
  <div className="rounded-[9px] border p-3" style={softPanelStyle}>
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--trading-muted-color)]">{label}</span>
    </div>
    <div className="mt-1 text-[16px] font-bold text-[var(--trading-text-color)]">{value}</div>
  </div>
);

export const WorkspaceReferral = ({ onSelectWorkspace }: WorkspaceReferralProps) => {
  const navigate = useNavigate();
  const { platformName } = useSiteBranding();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<ReferralTab>("friends");
  const [detailMode, setDetailMode] = useState<DetailMode>("calculator");
  const [shareMode, setShareMode] = useState<ShareMode>("link");
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [referredCount, setReferredCount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(10);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsRecord>(DEFAULT_PLATFORM_SETTINGS);
  const [bonusRules, setBonusRules] = useState<BonusSettingsRow | null>(null);
  const [promoMaterials, setPromoMaterials] = useState<any[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [commissionLoading, setCommissionLoading] = useState(false);

  const referralCode = useMemo(() => {
    const saved = String((profile as any)?.referral_code ?? "").trim().toUpperCase();
    if (saved) return saved;
    return `INIT${String(user?.id ?? "OPTION").replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  }, [profile, user?.id]);

  const refLink = useMemo(
    () => `${PRODUCTION_REFERRAL_ORIGIN}/register?ref=${encodeURIComponent(referralCode)}`,
    [referralCode],
  );
  const shortLink = useMemo(
    () => `initoption.com/register?ref=${referralCode}`,
    [referralCode],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchRules = async () => {
      const [platformResponse, bonusResponse] = await Promise.all([
        api.from("platform_settings").select("*").limit(1).maybeSingle(),
        api
          .from("bonus_settings")
          .select(
            "deposit_bonus_enabled, deposit_bonus_max, deposit_bonus_min, deposit_bonus_percent, referral_commission_enabled, referral_commission_payout_timing, referral_commission_percent, referral_commission_type, welcome_bonus_amount, welcome_bonus_enabled",
          )
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setPlatformSettings(normalizePlatformSettings((platformResponse.data as Partial<PlatformSettingsRecord> | null) ?? null));
      setBonusRules((bonusResponse.data as BonusSettingsRow | null) ?? null);
    };

    void fetchRules();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const fetchPromoMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const { data, error } = await api
          .from("promo_materials")
          .select("*")
          .order("created_at", { ascending: false });

        if (error && error.code !== "PGRST116") {
          throw error;
        }
        setPromoMaterials(data || []);
      } catch (error: any) {
        console.error("Error fetching promo materials:", error);
      } finally {
        setMaterialsLoading(false);
      }
    };

    void fetchPromoMaterials();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchReferralData = async () => {
      setCommissionLoading(true);
      const [countResult, referredResult, commissionsResult] = await Promise.all([
        api.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", user.id),
        api.from("profiles").select("id, username, display_name, created_at").eq("referred_by", user.id).order("created_at", { ascending: false }),
        api.from("referral_commissions").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }),
      ]);
      setReferredCount(countResult.count ?? 0);
      if (referredResult.data) setReferredUsers(referredResult.data);
      if (commissionsResult.data) setCommissions(commissionsResult.data);
      setCommissionLoading(false);
    };

    void fetchReferralData();
  }, [user]);

  const copyValue = (value: string, field: string) => {
    void navigator.clipboard.writeText(value).catch(() => undefined);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 1600);
  };

  const openAccountTab = (tab: AccountTabTarget) => {
    if (onSelectWorkspace) {
      onSelectWorkspace("account");
      return;
    }

    navigate("/trade", { state: { accountTab: tab } });
  };

  const handleTabClick = (tab: ReferralTab) => {
    if (tab === "profile") {
      openAccountTab("personal");
      return;
    }

    if (tab === "security") {
      openAccountTab("settings");
      return;
    }

    if (tab === "history") {
      openAccountTab("trading_history");
      return;
    }

    setActiveTab(tab);
  };

  const fallbackReferralPercent = clampPercent(Number(platformSettings.referral_commission_pct));
  const referralPercent = clampPercent(
    bonusRules ? (bonusRules.referral_commission_enabled ? Number(bonusRules.referral_commission_percent) : 0) : fallbackReferralPercent,
  );
  const referralBasis = bonusRules?.referral_commission_type === "trade_volume" ? "trade volume" : "first deposit";
  const referralTiming =
    bonusRules?.referral_commission_payout_timing === "after_trade_close" ? "after trade closes" : "immediately";
  const rewardAmount = Math.max(0, (depositAmount * referralPercent) / 100);
  const depositBonusMin = Number(bonusRules?.deposit_bonus_min ?? 0);
  const rawInviteeBonusPercent = bonusRules?.deposit_bonus_enabled
    ? Number(bonusRules.deposit_bonus_percent)
    : Number(platformSettings.welcome_bonus_pct);
  const inviteeBonusPercent = depositAmount >= depositBonusMin ? clampPercent(rawInviteeBonusPercent) : 0;
  const rawInviteeBonus = (depositAmount * inviteeBonusPercent) / 100;
  const maxInviteeBonus = Number(bonusRules?.deposit_bonus_max ?? 0);
  const inviteeBonusAmount = maxInviteeBonus > 0 ? Math.min(rawInviteeBonus, maxInviteeBonus) : rawInviteeBonus;
  const referralEarnings = Number((profile as any)?.referral_earnings ?? 0);
  const displayName = profile?.username?.trim() || profile?.display_name?.trim() || user?.email?.split("@")[0] || "Trader";

  const totalCommissions = useMemo(
    () => commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0),
    [commissions],
  );
  const pendingCommissions = useMemo(
    () => commissions.filter((c) => c.status === "pending").reduce((sum, c) => sum + Number(c.commission_amount), 0),
    [commissions],
  );
  const paidCommissions = useMemo(
    () => commissions.filter((c) => c.status === "paid").reduce((sum, c) => sum + Number(c.commission_amount), 0),
    [commissions],
  );
  const totalDeposits = useMemo(
    () => commissions.reduce((sum, c) => sum + Number(c.deposit_amount), 0),
    [commissions],
  );

  const shareTargets = [
    { label: "f", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}` },
    { label: "tg", href: `https://t.me/share/url?url=${encodeURIComponent(refLink)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(refLink)}` },
    { label: "wa", href: `https://wa.me/?text=${encodeURIComponent(refLink)}` },
  ];

  const tabs: Array<{ id: ReferralTab; label: string }> = [
    { id: "trading", label: "Trading profile" },
    { id: "profile", label: "Profile" },
    { id: "loyalty", label: "Loyalty program" },
    { id: "security", label: "Security" },
    { id: "history", label: "Trading history" },
    { id: "friends", label: "Init Friends" },
  ];

  const metricCards = [
    { label: "Referral commission", value: `${referralPercent}%`, detail: `Paid ${referralTiming}` },
    { label: "Basis", value: referralBasis, detail: "Controlled from admin bonus rules" },
    { label: "Invitee bonus", value: `+${inviteeBonusPercent}%`, detail: depositBonusMin > 0 ? `Starts from ${formatMoney(depositBonusMin, 0)}` : "Applies from first deposit" },
    { label: "Registered friends", value: referredCount || "-", detail: "Linked through your promo code" },
  ];

  const renderInfoTab = () => {
    const content: Record<Exclude<ReferralTab, "friends">, { icon: typeof TrendingUp; title: string; intro: string; stats: Array<{ label: string; value: string }> }> = {
      trading: {
        icon: TrendingUp,
        title: "Trading profile",
        intro: "Your public trading summary uses live account activity from your Init Option profile.",
        stats: [
          { label: "Total trades", value: String((profile as any)?.total_trades ?? 0) },
          { label: "Wins", value: String((profile as any)?.total_wins ?? 0) },
          { label: "30-day volume", value: formatMoney(Number((profile as any)?.total_trade_volume_30d ?? 0)) },
          { label: "Total profit", value: formatMoney(Number((profile as any)?.total_profit ?? 0)) },
        ],
      },
      profile: {
        icon: UsersRound,
        title: "Profile",
        intro: "This tab reflects the identity information users see around the social and referral areas.",
        stats: [
          { label: "Nickname", value: displayName },
          { label: "Email", value: user?.email ?? "-" },
          { label: "Country", value: String((profile as any)?.nationality ?? "-") },
          { label: "KYC status", value: String((profile as any)?.kyc_status ?? "Not submitted") },
        ],
      },
      loyalty: {
        icon: WalletCards,
        title: "Loyalty program",
        intro: "Referral earnings and VIP progress stay tied to the same user profile balance rules.",
        stats: [
          { label: "VIP tier", value: String((profile as any)?.vip_tier ?? "Standard") },
          { label: "Referral earnings", value: formatMoney(referralEarnings) },
          { label: "Total deposit", value: formatMoney(Number((profile as any)?.total_deposit ?? 0)) },
          { label: "Welcome bonus rule", value: `${Number(platformSettings.welcome_bonus_pct ?? 0)}%` },
        ],
      },
      security: {
        icon: LockKeyhole,
        title: "Security",
        intro: "Security settings are read from the platform configuration published in the admin panel.",
        stats: [
          { label: "Strict password", value: platformSettings.strict_password ? "Enabled" : "Disabled" },
          { label: "2FA enforcement", value: platformSettings.enforce_2fa ? "Required" : "Optional" },
          { label: "KYC withdrawals", value: platformSettings.require_kyc_withdrawal ? "Required" : "Not required" },
          { label: "Support email", value: platformSettings.support_email },
        ],
      },
      history: {
        icon: CalendarDays,
        title: "Trading history",
        intro: "A compact status view for activity that feeds referrals, loyalty and user trust metrics.",
        stats: [
          { label: "30-day trades", value: String((profile as any)?.trade_count_30d ?? 0) },
          { label: "30-day volume", value: formatMoney(Number((profile as any)?.total_trade_volume_30d ?? 0)) },
          { label: "Reserved withdrawal", value: formatMoney(Number((profile as any)?.reserved_withdrawal_balance ?? 0)) },
          { label: "Current live balance", value: formatMoney(Number((profile as any)?.balance ?? 0)) },
        ],
      },
    };

    const current = content[activeTab as Exclude<ReferralTab, "friends">];
    const Icon = current.icon;

    return (
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 overflow-y-auto lg:overflow-hidden">
        <section className="flex min-h-0 flex-col rounded-[10px] border p-5" style={panelStyle}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b7557]/15 text-[#5ee0bd]">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-[var(--trading-text-color)]">{current.title}</h1>
              <p className="mt-1 text-[12px] font-medium text-[var(--trading-muted-color)]">{current.intro}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {current.stats.map((stat) => (
              <div key={stat.label} className="rounded-[9px] border p-4" style={softPanelStyle}>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--trading-muted-color)]">{stat.label}</div>
                <div className="mt-2 truncate text-[18px] font-bold text-[var(--trading-text-color)]">{stat.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-[9px] border border-[#0b7557]/20 bg-[#0b7557]/10 p-4 text-[12px] leading-5 text-[#c7fff0]">
            These panels are connected to the logged-in profile and platform settings. Changing tabs keeps the page in-place without losing the referral calculator state.
          </div>
        </section>
        <aside className="rounded-[10px] border p-5" style={panelStyle}>
          <h2 className="text-[18px] font-bold text-[var(--trading-text-color)]">Referral quick status</h2>
          <div className="mt-4 space-y-3">
            {metricCards.map((item) => (
              <div key={item.label} className="rounded-[9px] border p-3" style={softPanelStyle}>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--trading-muted-color)]">{item.label}</div>
                <div className="mt-1 text-[18px] font-bold text-[var(--trading-text-color)]">{item.value}</div>
                <div className="mt-1 text-[11px] font-medium text-[var(--trading-muted-color)]">{item.detail}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    );
  };

  return (
    <div
      className="relative h-full w-full overflow-y-auto lg:overflow-hidden px-3 py-3 text-[var(--trading-text-color)]"
      style={{ background: "var(--trading-workspace-bg)" }}
    >
      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4 pb-16 lg:pb-0">
        <aside className="flex min-h-0 flex-col rounded-[12px] border p-4" style={panelStyle}>
          <div className="hidden lg:flex h-[128px] shrink-0 items-center justify-center">
            <MiniBrandMark />
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-[15px] font-bold">Your Init Option link</h3>
              <div className="mt-2 flex h-[36px] items-center gap-2">
                <div className="flex h-full min-w-0 flex-1 items-center rounded-[7px] border px-3 text-[12px] font-bold" style={softPanelStyle}>
                  <span className="truncate">{shortLink}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(refLink, "link")}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-[7px] border text-[var(--trading-muted-color)] hover:text-white"
                  style={softPanelStyle}
                  aria-label="Copy Init Option referral link"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-[15px] font-bold">Your promo code</h3>
              <div className="mt-2 flex h-[36px] items-center gap-2">
                <div className="flex h-full min-w-0 flex-1 items-center rounded-[7px] border px-3 text-[12px] font-bold" style={softPanelStyle}>
                  <span className="truncate">{referralCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(referralCode, "promo code")}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-[7px] border text-[var(--trading-muted-color)] hover:text-white"
                  style={softPanelStyle}
                  aria-label="Copy referral promo code"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="flex h-[38px] w-full items-center justify-center gap-2 rounded-[8px] border text-[13px] font-bold hover:brightness-110"
              style={softPanelStyle}
            >
              <Share2 className="h-4 w-4 text-[#9ddac6]" />
              Share
            </button>
          </div>

          <div className="mt-5 rounded-[10px] border p-4" style={softPanelStyle}>
            <h3 className="text-[15px] font-bold">Your Init Friends</h3>
            <div className="mt-3 space-y-2 text-[12px]">
              <div className="flex items-center justify-between text-[var(--trading-muted-color)]">
                <span>Total referrals</span>
                <span className="font-bold text-[var(--trading-text-color)]">{referredCount || "-"}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--trading-muted-color)]">
                <span>Total deposits</span>
                <span className="font-bold text-[var(--trading-text-color)]">{formatMoney(totalDeposits, 0)}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--trading-muted-color)]">
                <span>Commission rate</span>
                <span className="font-bold text-[var(--trading-text-color)]">{referralPercent}%</span>
              </div>
              <div className="flex items-center justify-between text-[var(--trading-muted-color)]">
                <span>Total earned</span>
                <span className="font-bold text-[#5ee0bd]">{formatMoney(totalCommissions)}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--trading-muted-color)]">
                <span>Pending</span>
                <span className="font-bold text-amber-400">{formatMoney(pendingCommissions)}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--trading-muted-color)]">
                <span>Paid</span>
                <span className="font-bold text-[#5ee0bd]">{formatMoney(paidCommissions)}</span>
              </div>
            </div>
          </div>

          <div className="mt-auto rounded-[10px] border border-[#0b7557]/20 bg-[#0b7557]/10 p-3 text-[11px] leading-5 text-[#c7fff0]">
            Promo code and referral link both point to Init Option signup. The signup form reads the `ref` value automatically.
          </div>
        </aside>

        <main className="flex flex-col min-h-0 gap-3">
          <div className="flex min-h-0 gap-2 overflow-x-auto pb-1.5 shrink-0 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`h-[34px] shrink-0 rounded-[7px] border px-4 text-[11px] font-bold uppercase tracking-[0.04em] transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? "border-[#0b7557]/50 bg-[#0b7557] text-white" : "text-[var(--trading-muted-color)] hover:text-white"
                }`}
                style={activeTab === tab.id ? undefined : softPanelStyle}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab !== "friends" ? (
            renderInfoTab()
          ) : (
            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
              <section className="grid min-h-0 shrink-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] overflow-hidden rounded-[12px] border" style={panelStyle}>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b7557]/15 text-[#5ee0bd]">
                      <UsersRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-[22px] font-bold">Init Friends</h1>
                      <p className="mt-1 text-[12px] font-semibold text-[var(--trading-muted-color)]">
                        Invite traders to {platformName}. Earn together through admin-controlled referral rules.
                      </p>
                    </div>
                  </div>

                  <ol className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px] font-bold leading-5">
                    <li className="rounded-[9px] border p-3" style={softPanelStyle}>1. Copy your Init Option referral link.</li>
                    <li className="rounded-[9px] border p-3" style={softPanelStyle}>2. Share the link or promo code with a friend.</li>
                    <li className="rounded-[9px] border p-3" style={softPanelStyle}>3. Earn {referralPercent}% when the referral rule qualifies.</li>
                  </ol>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailMode("calculator")}
                      className={`flex h-[34px] items-center gap-2 rounded-[7px] border px-4 text-[12px] font-bold ${
                        detailMode === "calculator" ? "border-[#0b7557]/40 bg-[#0b7557]/20 text-[#c7fff0]" : "text-[var(--trading-muted-color)]"
                      }`}
                      style={detailMode === "calculator" ? undefined : softPanelStyle}
                    >
                      <CalendarDays className="h-4 w-4" />
                      Bonus Calculator
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailMode("terms")}
                      className={`flex h-[34px] items-center gap-2 rounded-[7px] border px-4 text-[12px] font-bold ${
                        detailMode === "terms" ? "border-[#0b7557]/40 bg-[#0b7557]/20 text-[#c7fff0]" : "text-[var(--trading-muted-color)]"
                      }`}
                      style={detailMode === "terms" ? undefined : softPanelStyle}
                    >
                      <FileText className="h-4 w-4" />
                      Terms
                    </button>
                  </div>
                </div>
                <div className="hidden lg:block h-full relative">
                  <PromoIllustration />
                </div>
              </section>

              <section className="min-h-0 shrink-0 rounded-[12px] border p-4" style={panelStyle}>
                {detailMode === "calculator" ? (
                  <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h2 className="text-[18px] font-bold">Bonus Calculator</h2>
                      <p className="mt-2 text-[12px] font-semibold text-[var(--trading-muted-color)]">
                        Uses the same referral percentage saved in the admin bonus rules.
                      </p>
                      <div className="mt-3 text-[30px] font-bold">{formatMoney(depositAmount, 0)}</div>
                      <input
                        type="range"
                        min={10}
                        max={1000}
                        step={10}
                        value={depositAmount}
                        onChange={(event) => setDepositAmount(Number(event.target.value))}
                        className="mt-4 h-[4px] w-full accent-[#0b7557]"
                      />
                      <div className="mt-1 flex justify-between text-[11px] font-semibold text-[var(--trading-muted-color)]">
                        <span>$10</span>
                        <span>$1,000+</span>
                      </div>
                    </div>

                    <div className="rounded-[10px] border border-dashed p-4" style={softPanelStyle}>
                      <h3 className="text-[15px] font-bold">You will receive</h3>
                      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--trading-muted-color)]">
                        Referral commission
                      </p>
                      <div className="mt-1 text-[30px] font-bold">{formatMoney(rewardAmount)}</div>
                      <p className="mt-2 text-[12px] text-[var(--trading-muted-color)]">{referralPercent}% of {referralBasis}</p>
                    </div>

                    <div className="rounded-[10px] border border-dashed p-4" style={softPanelStyle}>
                      <h3 className="text-[15px] font-bold">Invitee can receive</h3>
                      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--trading-muted-color)]">
                        Deposit bonus
                      </p>
                      <div className="mt-1 text-[30px] font-bold">+{inviteeBonusPercent}%</div>
                      <p className="mt-2 text-[12px] text-[var(--trading-muted-color)]">
                        Estimated bonus {formatMoney(inviteeBonusAmount)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      `Referral commission is ${referralPercent}% and is paid ${referralTiming}.`,
                      `The qualifying basis is ${referralBasis}; admins can change it in Bonus & Referral Rules.`,
                      `Referral abuse, self-referrals, or duplicate accounts can be reviewed before rewards are paid.`,
                    ].map((term) => (
                      <div key={term} className="flex gap-3 rounded-[10px] border p-4 text-[12px] leading-5" style={softPanelStyle}>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5ee0bd]" />
                        <span>{term}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="shrink-0 rounded-[12px] border p-4" style={panelStyle}>
                <h2 className="text-[18px] font-bold">Referral summary</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <StatCard icon={UsersRound} label="Total referrals" value={String(referredCount)} color="text-blue-400" />
                  <StatCard icon={DollarSign} label="Total deposits" value={formatMoney(totalDeposits, 0)} color="text-emerald-400" />
                  <StatCard icon={WalletCards} label="Total earned" value={formatMoney(totalCommissions)} color="text-[#5ee0bd]" />
                  <StatCard icon={CalendarDays} label="Pending" value={formatMoney(pendingCommissions)} color="text-amber-400" />
                  <StatCard icon={CheckCircle2} label="Paid" value={formatMoney(paidCommissions)} color="text-[#5ee0bd]" />
                </div>
              </section>

              <section className="shrink-0 rounded-[12px] border" style={panelStyle}>
                <div className="border-b px-4 py-3" style={{ borderColor: "var(--trading-border-color)" }}>
                  <h2 className="text-[16px] font-bold">Commission History</h2>
                </div>
                {commissionLoading ? (
                  <div className="flex items-center justify-center py-8 text-[var(--trading-muted-color)]">Loading...</div>
                ) : commissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <DollarSign className="h-10 w-10 text-[var(--trading-muted-color)] mb-2 opacity-50" />
                    <p className="text-[13px] font-bold text-[var(--trading-text-color)]">No commissions yet</p>
                    <p className="mt-1 text-[11px] text-[var(--trading-muted-color)]">Share your referral link to start earning.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="text-[11px] font-bold text-[var(--trading-muted-color)] uppercase tracking-wider border-b" style={{ borderColor: "var(--trading-border-color)" }}>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Deposit</th>
                          <th className="px-4 py-3">Commission</th>
                          <th className="px-4 py-3">Rate</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: "var(--trading-border-color)" }}>
                        {commissions.map((c: any) => (
                          <tr key={c.id} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3 text-[var(--trading-text-color)] font-medium">
                              {referredUsers.find((u: any) => u.id === c.referred_user_id)?.username || "User"}
                            </td>
                            <td className="px-4 py-3 text-[var(--trading-muted-color)]">{formatMoney(Number(c.deposit_amount))}</td>
                            <td className="px-4 py-3 text-[#5ee0bd] font-bold">{formatMoney(Number(c.commission_amount))}</td>
                            <td className="px-4 py-3 text-[var(--trading-muted-color)]">{Number(c.commission_rate)}%</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                c.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : c.status === "pending" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                              }`}>
                                {c.status === "paid" && <CheckCircle2 className="h-3 w-3" />}
                                {c.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[var(--trading-muted-color)]">
                              {new Date(c.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="shrink-0 rounded-[12px] border" style={panelStyle}>
                <div className="border-b px-4 py-3" style={{ borderColor: "var(--trading-border-color)" }}>
                  <h2 className="text-[16px] font-bold">Referred Users</h2>
                </div>
                {commissionLoading ? (
                  <div className="flex items-center justify-center py-8 text-[var(--trading-muted-color)]">Loading...</div>
                ) : referredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <UsersRound className="h-10 w-10 text-[var(--trading-muted-color)] mb-2 opacity-50" />
                    <p className="text-[13px] font-bold text-[var(--trading-text-color)]">No referrals yet</p>
                    <p className="mt-1 text-[11px] text-[var(--trading-muted-color)]">People who sign up with your code will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "var(--trading-border-color)" }}>
                    {referredUsers.map((ru: any) => (
                      <div key={ru.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400 text-sm font-bold">
                            {(ru.username || ru.display_name || "U")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-[var(--trading-text-color)]">{ru.username || ru.display_name || "User"}</div>
                            <div className="text-[11px] text-[var(--trading-muted-color)]">Joined {new Date(ru.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>

      {shareOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-[2px]">
          <div className="w-[400px] overflow-hidden rounded-[18px] border shadow-[0_24px_80px_rgba(0,0,0,0.55)]" style={panelStyle}>
            <div className="relative h-[220px] border-b" style={softPanelStyle}>
              <PromoIllustration />
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="absolute right-5 top-5 text-[var(--trading-muted-color)] hover:text-white"
                aria-label="Close share modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-7 pb-7 pt-5">
              <h2 className="text-[26px] font-bold">Share Init Option</h2>
              <div className="mt-5 flex gap-2">
                {[
                  { id: "link" as const, label: "Referral link" },
                  { id: "code" as const, label: "Promo code" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setShareMode(item.id)}
                    className={`h-[34px] rounded-[7px] border px-4 text-[12px] font-bold ${
                      shareMode === item.id ? "border-[#0b7557]/50 bg-[#0b7557]/20 text-[#c7fff0]" : "text-[var(--trading-muted-color)]"
                    }`}
                    style={shareMode === item.id ? undefined : softPanelStyle}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-[10px] border p-4" style={softPanelStyle}>
                <div className="flex h-[36px] items-center gap-2">
                  <div className="flex h-full min-w-0 flex-1 items-center rounded-[7px] border px-3 text-[12px] font-bold" style={panelStyle}>
                    <span className="truncate">{shareMode === "link" ? shortLink : referralCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyValue(shareMode === "link" ? refLink : referralCode, shareMode)}
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-[7px] border text-[var(--trading-muted-color)]"
                    style={panelStyle}
                    aria-label="Copy share value"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-[7px] border text-[var(--trading-muted-color)]"
                    style={panelStyle}
                    aria-label="Show QR code"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-[12px] text-[var(--trading-muted-color)]">Share to:</p>
                <div className="mt-2 flex gap-2">
                  {shareTargets.map((target) => (
                    <a
                      key={target.label}
                      href={target.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border text-[12px] font-black text-[var(--trading-muted-color)] hover:text-white"
                      style={panelStyle}
                    >
                      {target.label}
                    </a>
                  ))}
                </div>
              </div>

              {copiedField ? <p className="mt-3 text-[12px] font-bold text-[#5ee0bd]">Copied {copiedField}.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
