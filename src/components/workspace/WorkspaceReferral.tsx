import { Copy, Share2, TrendingUp, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { DEFAULT_PLATFORM_SETTINGS, normalizePlatformSettings, type PlatformSettingsRecord } from "@/lib/platformMetadata";

type ShareMode = "link" | "code";
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

export const WorkspaceReferral = () => {
  const { platformName } = useSiteBranding();
  const { user, profile } = useAuth();
  const [shareMode, setShareMode] = useState<ShareMode>("link");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [referredCount, setReferredCount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(10);
  const [showCalculator, setShowCalculator] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsRecord>(DEFAULT_PLATFORM_SETTINGS);
  const [bonusRules, setBonusRules] = useState<BonusSettingsRow | null>(null);

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
        supabase.from("platform_settings").select("*").limit(1).maybeSingle(),
        supabase
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
    if (!user) return;

    const fetchReferralCount = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", user.id);

      setReferredCount(count ?? 0);
    };

    void fetchReferralCount();
  }, [user]);

  const copyValue = (value: string, field: string) => {
    void navigator.clipboard.writeText(value).catch(() => undefined);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 1600);
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

  const shareTargets = [
    { label: "f", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}` },
    { label: "tg", href: `https://t.me/share/url?url=${encodeURIComponent(refLink)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(refLink)}` },
    { label: "wa", href: `https://wa.me/?text=${encodeURIComponent(refLink)}` },
  ];

  return (
    <div
      className="flex h-full flex-col overflow-hidden text-[var(--trading-text-color)]"
      style={{ background: "var(--trading-workspace-bg)" }}
    >
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 pb-4 pt-4">
          <div className="rounded-[10px] border bg-gradient-to-br from-[#0b7557]/10 to-transparent p-4" style={panelStyle}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--trading-muted-color)]">
                  Referral earnings
                </p>
                <p className="mt-1 text-[26px] font-bold tracking-tight text-white">{formatMoney(referralEarnings)}</p>
                <p className="mt-0.5 text-[12px] text-[var(--trading-muted-color)]">
                  {referredCount} friend{referredCount !== 1 ? "s" : ""} joined &bull; {referralPercent}% commission
                </p>
              </div>
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-[#0b7557]/20 text-[#5ee0bd]">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-[var(--trading-muted-color)]">Referral link</label>
              <div className="mt-1 flex h-[38px] items-center gap-1.5">
                <div className="flex h-full min-w-0 flex-1 items-center rounded-[7px] border px-3 text-[12px]" style={softPanelStyle}>
                  <span className="truncate font-mono text-[13px] text-[var(--trading-text-color)]">{shortLink}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(refLink, "link")}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[7px] border text-[var(--trading-muted-color)] transition-colors hover:border-[#0b7557]/40 hover:text-[#5ee0bd]"
                  style={softPanelStyle}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--trading-muted-color)]">Promo code</label>
              <div className="mt-1 flex h-[38px] items-center gap-1.5">
                <div className="flex h-full min-w-0 flex-1 items-center rounded-[7px] border px-3 text-[12px]" style={softPanelStyle}>
                  <span className="font-mono text-[13px] font-bold tracking-wider text-[var(--trading-text-color)]">{referralCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(referralCode, "code")}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[7px] border text-[var(--trading-muted-color)] transition-colors hover:border-[#0b7557]/40 hover:text-[#5ee0bd]"
                  style={softPanelStyle}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Friends joined", value: String(referredCount || "0"), icon: Users },
              { label: "Commission rate", value: `${referralPercent}%`, icon: TrendingUp },
              { label: "Paid", value: referralTiming === "immediately" ? "Instant" : "On close", icon: Share2 },
            ].map((item) => (
              <div key={item.label} className="rounded-[8px] border p-2.5" style={softPanelStyle}>
                <div className="flex items-center gap-1.5">
                  <item.icon className="h-3 w-3 text-[#5ee0bd]" />
                  <span className="text-[10px] font-medium text-[var(--trading-muted-color)]">{item.label}</span>
                </div>
                <p className="mt-1 text-[15px] font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="mt-4 flex h-[40px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#0b7557] text-[13px] font-bold text-white transition-all hover:bg-[#0d8d69] active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            Share your referral link
          </button>

          <div className="mt-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--trading-muted-color)]">How it works</h3>
            <div className="mt-3 space-y-3">
              {[
                { step: "01", title: "Share", text: "Copy your unique referral link or promo code." },
                { step: "02", title: "Invite", text: "Send it to a friend — social, email, or any channel." },
                { step: "03", title: "Earn", text: `Receive ${referralPercent}% commission when they qualify.` },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[6px] bg-[#0b7557]/15 text-[11px] font-bold text-[#5ee0bd]">
                    {item.step}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-[12px] text-[var(--trading-muted-color)]">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowCalculator((v) => !v)}
              className="flex w-full items-center justify-between rounded-[8px] border px-3.5 py-3 text-left transition-colors hover:border-[#0b7557]/30"
              style={panelStyle}
            >
              <span className="text-[13px] font-semibold text-white">Bonus calculator</span>
              <span className={`text-[11px] text-[var(--trading-muted-color)] transition-transform duration-200 ${showCalculator ? "rotate-180" : ""}`}>
                &#9660;
              </span>
            </button>

            {showCalculator && (
              <div className="mt-2 rounded-[8px] border p-3.5" style={softPanelStyle}>
                <p className="text-[12px] font-medium text-[var(--trading-muted-color)]">
                  Deposit amount <span className="text-white">{formatMoney(depositAmount, 0)}</span>
                </p>
                <input
                  type="range"
                  min={10}
                  max={1000}
                  step={10}
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(Number(event.target.value))}
                  className="mt-2 h-[4px] w-full accent-[#0b7557]"
                />
                <div className="mt-1 flex justify-between text-[10px] text-[var(--trading-muted-color)]">
                  <span>$10</span>
                  <span>$1,000+</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-[8px] border p-3" style={panelStyle}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--trading-muted-color)]">Your reward</p>
                    <p className="mt-1 text-[18px] font-bold text-white">{formatMoney(rewardAmount)}</p>
                    <p className="text-[11px] text-[var(--trading-muted-color)]">{referralPercent}% of {referralBasis}</p>
                  </div>
                  <div className="rounded-[8px] border p-3" style={panelStyle}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--trading-muted-color)]">Invitee bonus</p>
                    <p className="mt-1 text-[18px] font-bold text-white">+{inviteeBonusPercent}%</p>
                    <p className="text-[11px] text-[var(--trading-muted-color)]">~{formatMoney(inviteeBonusAmount)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="rounded-[8px] border p-3.5" style={panelStyle}>
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-white">
                  {referredCount > 0 ? `${referredCount} friend${referredCount !== 1 ? "s" : ""} referred` : "Your network"}
                </h3>
                <Users className="h-4 w-4 text-[var(--trading-muted-color)]" />
              </div>

              {referredCount > 0 ? (
                <p className="mt-2 text-[12px] leading-5 text-[var(--trading-muted-color)]">
                  You&apos;ve brought <span className="font-semibold text-white">{referredCount}</span> trader{referredCount !== 1 ? "s" : ""} to {platformName}.
                  {referralEarnings > 0 && (
                    <> You&apos;ve earned <span className="font-semibold text-[#5ee0bd]">{formatMoney(referralEarnings)}</span> in referral rewards.</>
                  )}
                </p>
              ) : (
                <div className="mt-3 flex flex-col items-center py-4 text-center">
                  <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[10px] border border-dashed border-white/[0.12] text-[var(--trading-muted-color)]" style={panelStyle}>
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <p className="mt-2 text-[13px] font-semibold text-white">Start building your network</p>
                  <p className="mt-0.5 text-[12px] leading-4 text-[var(--trading-muted-color)]">
                    Share your referral link and track your invites here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {copiedField && (
            <div className="mt-3 text-center text-[12px] font-medium text-[#5ee0bd]">
              {copiedField === "link" ? "Referral link copied" : "Promo code copied"}
            </div>
          )}
        </div>
      </div>

      {shareOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4 backdrop-blur-sm">
          <div
            className="w-full sm:w-[380px] rounded-t-[16px] sm:rounded-[16px] border shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
            style={panelStyle}
          >
            <div className="px-5 pb-6 pt-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-white">Share your referral</h2>
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-[var(--trading-muted-color)] transition-colors hover:bg-white/10 hover:text-white"
                >
                  &#10005;
                </button>
              </div>

              <div className="mt-4 flex gap-1.5 rounded-[8px] border p-1" style={softPanelStyle}>
                {[
                  { id: "link" as const, label: "Referral link" },
                  { id: "code" as const, label: "Promo code" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setShareMode(item.id)}
                    className={`flex-1 h-[32px] rounded-[6px] text-[12px] font-semibold transition-colors ${
                      shareMode === item.id
                        ? "bg-[#0b7557] text-white shadow-sm"
                        : "text-[var(--trading-muted-color)] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex h-[40px] items-center gap-2">
                <div
                  className="flex h-full min-w-0 flex-1 items-center rounded-[8px] border px-3"
                  style={panelStyle}
                >
                  <span className="truncate font-mono text-[13px] font-medium text-white">
                    {shareMode === "link" ? shortLink : referralCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(shareMode === "link" ? refLink : referralCode, shareMode)}
                  className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[8px] border text-[var(--trading-muted-color)] transition-colors hover:border-[#0b7557]/40 hover:text-[#5ee0bd]"
                  style={panelStyle}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <p className="text-[11px] font-medium text-[var(--trading-muted-color)]">Share via</p>
                <div className="mt-2 flex gap-2">
                  {shareTargets.map((target) => (
                    <a
                      key={target.label}
                      href={target.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border text-[12px] font-black text-[var(--trading-muted-color)] transition-colors hover:border-white/20 hover:text-white"
                      style={panelStyle}
                    >
                      {target.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
