import {
  CheckCircle2,
  Copy,
  Film,
  ImageIcon,
  Share2,
  UserRoundPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { DEFAULT_PLATFORM_SETTINGS, normalizePlatformSettings, type PlatformSettingsRecord } from "@/lib/platformMetadata";

type ShareMode = "link" | "code";
type PromoAssetMode = "banners" | "videos";
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
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [referredCount, setReferredCount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(10);
  const [showCalculator, setShowCalculator] = useState(false);
  const [promoAssetMode, setPromoAssetMode] = useState<PromoAssetMode>("banners");
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
      className="flex h-full w-full flex-col overflow-hidden text-[var(--trading-text-color)]"
      style={{ background: "var(--trading-workspace-bg)" }}
    >
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 no-scrollbar">
        <div className="rounded-[10px] border p-3" style={panelStyle}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0b7557]/15 text-[#5ee0bd]">
              <Share2 className="h-4 w-4" />
            </div>
            <h2 className="text-[14px] font-bold">Invite friends, earn together</h2>
          </div>
          <p className="mt-1.5 text-[11px] font-medium leading-4 text-[var(--trading-muted-color)]">
            Share your referral link or promo code. Earn {referralPercent}% commission when your friends join {platformName}.
          </p>

          <div className="mt-3 space-y-2">
            <div className="flex h-[34px] items-center gap-1.5">
              <div
                className="flex h-full min-w-0 flex-1 items-center rounded-[7px] border px-2.5 text-[11px] font-bold"
                style={softPanelStyle}
              >
                <span className="truncate">{shortLink}</span>
              </div>
              <button
                type="button"
                onClick={() => copyValue(refLink, "link")}
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[7px] border text-[var(--trading-muted-color)] hover:text-white"
                style={softPanelStyle}
                aria-label="Copy referral link"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex h-[34px] items-center gap-1.5">
              <div
                className="flex h-full min-w-0 flex-1 items-center rounded-[7px] border px-2.5 text-[11px] font-bold tracking-wider"
                style={softPanelStyle}
              >
                <span className="truncate">{referralCode}</span>
              </div>
              <button
                type="button"
                onClick={() => copyValue(referralCode, "promo code")}
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[7px] border text-[var(--trading-muted-color)] hover:text-white"
                style={softPanelStyle}
                aria-label="Copy promo code"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="mt-2 flex h-[34px] w-full items-center justify-center gap-2 rounded-[7px] bg-[#0b7557] text-[12px] font-bold text-white hover:brightness-110"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share Now
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Friends", value: String(referredCount || "-") },
            { label: "Commission", value: `${referralPercent}%` },
            { label: "Earnings", value: formatMoney(referralEarnings, 0) },
          ].map((item) => (
            <div key={item.label} className="rounded-[9px] border p-2.5 text-center" style={softPanelStyle}>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--trading-muted-color)]">{item.label}</div>
              <div className="mt-0.5 text-[16px] font-bold text-[var(--trading-text-color)]">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-[10px] border p-3" style={panelStyle}>
          <h3 className="text-[12px] font-bold">How it works</h3>
          <div className="mt-2 space-y-2">
            {[
              { step: 1, text: "Copy your referral link or promo code above." },
              { step: 2, text: "Share it with a friend through any channel." },
              { step: 3, text: `Earn ${referralPercent}% commission when they qualify.` },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-2.5 text-[11px] leading-4">
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#0b7557] text-[10px] font-bold text-white">
                  {item.step}
                </span>
                <span className="text-[var(--trading-muted-color)]">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCalculator((v) => !v)}
          className="flex w-full items-center justify-between rounded-[9px] border p-3 text-left"
          style={panelStyle}
        >
          <span className="text-[12px] font-bold">Bonus Calculator</span>
          <span className={`text-[11px] text-[var(--trading-muted-color)] transition-transform ${showCalculator ? "rotate-180" : ""}`}>
            &#9660;
          </span>
        </button>

        {showCalculator && (
          <div className="rounded-[9px] border p-3" style={softPanelStyle}>
            <input
              type="range"
              min={10}
              max={1000}
              step={10}
              value={depositAmount}
              onChange={(event) => setDepositAmount(Number(event.target.value))}
              className="h-[4px] w-full accent-[#0b7557]"
            />
            <div className="mt-1 flex justify-between text-[10px] font-semibold text-[var(--trading-muted-color)]">
              <span>$10</span>
              <span className="text-[12px] font-bold text-[var(--trading-text-color)]">{formatMoney(depositAmount, 0)}</span>
              <span>$1,000+</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-[8px] border border-dashed p-2.5" style={panelStyle}>
                <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--trading-muted-color)]">You receive</div>
                <div className="mt-0.5 text-[16px] font-bold">{formatMoney(rewardAmount)}</div>
                <div className="text-[10px] text-[var(--trading-muted-color)]">{referralPercent}% of {referralBasis}</div>
              </div>
              <div className="rounded-[8px] border border-dashed p-2.5" style={panelStyle}>
                <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--trading-muted-color)]">Invitee bonus</div>
                <div className="mt-0.5 text-[16px] font-bold">+{inviteeBonusPercent}%</div>
                <div className="text-[10px] text-[var(--trading-muted-color)]">~{formatMoney(inviteeBonusAmount)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-[9px] border border-[#0b7557]/20 bg-[#0b7557]/10 p-3" style={panelStyle}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h3 className="text-[12px] font-bold text-white">Promo materials</h3>
              <p className="mt-0.5 text-[10px] font-medium text-white/70">Grab banners or videos to share</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => setPromoAssetMode("banners")}
                className={`flex h-[28px] items-center gap-1.5 rounded-[6px] px-2.5 text-[10px] font-bold ${
                  promoAssetMode === "banners" ? "bg-white text-[#1e2330]" : "bg-white/15 text-white"
                }`}
              >
                <ImageIcon className="h-3 w-3" />
                Banners
              </button>
              <button
                type="button"
                onClick={() => setPromoAssetMode("videos")}
                className={`flex h-[28px] items-center gap-1.5 rounded-[6px] px-2.5 text-[10px] font-bold ${
                  promoAssetMode === "videos" ? "bg-white text-[#1e2330]" : "bg-white/15 text-white"
                }`}
              >
                <Film className="h-3 w-3" />
                Videos
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[10px] border p-3" style={panelStyle}>
          <h3 className="text-[12px] font-bold">Your Init Friends</h3>
          {referredCount > 0 ? (
            <p className="mt-2 text-[11px] text-[var(--trading-muted-color)]">
              You have <span className="font-bold text-white">{referredCount}</span> referred friend{referredCount !== 1 ? "s" : ""}.
            </p>
          ) : (
            <div className="mt-3 flex flex-col items-center py-4 text-center">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[9px] border border-white/[0.08] bg-white/[0.06]">
                <UserRoundPlus className="h-5 w-5 text-[#9ddac6]" />
              </div>
              <h4 className="mt-2 text-[13px] font-bold">No referred traders yet</h4>
              <p className="mt-1 text-[10px] font-medium text-[var(--trading-muted-color)]">
                Share your link and new referrals will appear here.
              </p>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="mt-3 flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[#0b7557] px-3 text-[11px] font-bold text-white hover:brightness-110"
              >
                <Share2 className="h-3 w-3" />
                Share your link
              </button>
            </div>
          )}
        </div>

        <div className="rounded-[8px] border border-[#0b7557]/15 bg-[#0b7557]/8 px-3 py-2.5 text-[10px] leading-4 text-[#c7fff0]">
          Promo code and referral link both point to the {platformName} signup page. The signup form reads the <code className="text-[#5ee0bd]">ref</code> value automatically.
        </div>
      </div>

      {copiedField && (
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center gap-1.5 rounded-full bg-[#0b7557]/20 px-3 py-1 text-[11px] font-bold text-[#5ee0bd]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Copied {copiedField}
          </div>
        </div>
      )}

      {shareOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-[2px]">
          <div className="w-[360px] overflow-hidden rounded-[16px] border shadow-[0_24px_80px_rgba(0,0,0,0.55)]" style={panelStyle}>
            <div className="px-5 pb-5 pt-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-bold">Share {platformName}</h2>
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--trading-muted-color)] hover:text-white"
                  aria-label="Close share modal"
                >
                  &#10005;
                </button>
              </div>

              <div className="mt-3 flex gap-1.5">
                {[
                  { id: "link" as const, label: "Referral link" },
                  { id: "code" as const, label: "Promo code" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setShareMode(item.id)}
                    className={`h-[30px] rounded-[6px] border px-3 text-[11px] font-bold ${
                      shareMode === item.id ? "border-[#0b7557]/50 bg-[#0b7557]/20 text-[#c7fff0]" : "text-[var(--trading-muted-color)]"
                    }`}
                    style={shareMode === item.id ? undefined : softPanelStyle}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex h-[34px] items-center gap-1.5">
                <div
                  className="flex h-full min-w-0 flex-1 items-center rounded-[7px] border px-2.5 text-[11px] font-bold"
                  style={panelStyle}
                >
                  <span className="truncate">{shareMode === "link" ? shortLink : referralCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(shareMode === "link" ? refLink : referralCode, shareMode)}
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[7px] border text-[var(--trading-muted-color)]"
                  style={panelStyle}
                  aria-label="Copy"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="mt-3 text-[11px] font-medium text-[var(--trading-muted-color)]">Share to:</p>
              <div className="mt-2 flex gap-2">
                {shareTargets.map((target) => (
                  <a
                    key={target.label}
                    href={target.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] border text-[11px] font-black text-[var(--trading-muted-color)] hover:text-white"
                    style={panelStyle}
                  >
                    {target.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
