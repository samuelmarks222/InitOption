export const SITE_LOGO_STORAGE_KEY = "site_logo";
export const SITE_PLATFORM_NAME_STORAGE_KEY = "site_platform_name";

export const DEFAULT_PLATFORM_NAME = "Init Option";
export const DEFAULT_META_DESCRIPTION =
  "Init Option is an OTC trading platform with demo and live trading access across desktop and mobile.";

export type TwitterCardType = "summary" | "summary_large_image";

export interface PlatformSettingsRecord {
  id?: string;
  created_at?: string;
  updated_at?: string;
  platform_name: string;
  support_email: string;
  timezone: string;
  min_trade_amount: number;
  max_trade_amount: number;
  enforce_max_exposure: boolean;
  enforce_2fa: boolean;
  require_kyc_withdrawal: boolean;
  strict_password: boolean;
  welcome_bonus_pct: number;
  referral_commission_pct: number;
  logo_url: string;
  favicon_url: string;
  chart_up_color: string;
  chart_down_color: string;
  chart_bg_color: string;
  site_title: string;
  meta_description: string;
  meta_keywords: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
  twitter_card_type: TwitterCardType;
  twitter_title: string;
  twitter_description: string;
  twitter_image_url: string;
  canonical_url: string;
  robots_directive: string;
  custom_meta_tags: string;
  website_content: string;
}

export interface ResolvedSeoMetadata {
  siteTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterCardType: TwitterCardType;
  twitterTitle: string;
  twitterDescription: string;
  twitterImageUrl: string;
  canonicalUrl: string;
  robotsDirective: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsRecord = {
  platform_name: DEFAULT_PLATFORM_NAME,
  support_email: "support@initoption.com",
  timezone: "UTC",
  min_trade_amount: 1,
  max_trade_amount: 10000,
  enforce_max_exposure: true,
  enforce_2fa: false,
  require_kyc_withdrawal: true,
  strict_password: true,
  welcome_bonus_pct: 50,
  referral_commission_pct: 10,
  logo_url: "",
  favicon_url: "",
  chart_up_color: "#00C076",
  chart_down_color: "#F6465D",
  chart_bg_color: "#0E1217",
  site_title: "",
  meta_description: "",
  meta_keywords: "",
  og_title: "",
  og_description: "",
  og_image_url: "",
  twitter_card_type: "summary_large_image",
  twitter_title: "",
  twitter_description: "",
  twitter_image_url: "",
  canonical_url: "",
  robots_directive: "index, follow",
  custom_meta_tags: "",
  website_content: "",
};

const toStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const toOptionalStringValue = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const toBooleanValue = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const toNumberValue = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toTwitterCardType = (value: unknown): TwitterCardType =>
  value === "summary" ? "summary" : "summary_large_image";

export const normalizePlatformSettings = (
  value: Partial<PlatformSettingsRecord> | null | undefined,
): PlatformSettingsRecord => ({
  id: toOptionalStringValue(value?.id),
  created_at: toOptionalStringValue(value?.created_at),
  updated_at: toOptionalStringValue(value?.updated_at),
  platform_name: toStringValue(value?.platform_name, DEFAULT_PLATFORM_SETTINGS.platform_name),
  support_email: toStringValue(value?.support_email, DEFAULT_PLATFORM_SETTINGS.support_email),
  timezone: toStringValue(value?.timezone, DEFAULT_PLATFORM_SETTINGS.timezone),
  min_trade_amount: toNumberValue(value?.min_trade_amount, DEFAULT_PLATFORM_SETTINGS.min_trade_amount),
  max_trade_amount: toNumberValue(value?.max_trade_amount, DEFAULT_PLATFORM_SETTINGS.max_trade_amount),
  enforce_max_exposure: toBooleanValue(value?.enforce_max_exposure, DEFAULT_PLATFORM_SETTINGS.enforce_max_exposure),
  enforce_2fa: toBooleanValue(value?.enforce_2fa, DEFAULT_PLATFORM_SETTINGS.enforce_2fa),
  require_kyc_withdrawal: toBooleanValue(
    value?.require_kyc_withdrawal,
    DEFAULT_PLATFORM_SETTINGS.require_kyc_withdrawal,
  ),
  strict_password: toBooleanValue(value?.strict_password, DEFAULT_PLATFORM_SETTINGS.strict_password),
  welcome_bonus_pct: toNumberValue(value?.welcome_bonus_pct, DEFAULT_PLATFORM_SETTINGS.welcome_bonus_pct),
  referral_commission_pct: toNumberValue(
    value?.referral_commission_pct,
    DEFAULT_PLATFORM_SETTINGS.referral_commission_pct,
  ),
  logo_url: toStringValue(value?.logo_url),
  favicon_url: toStringValue(value?.favicon_url),
  chart_up_color: toStringValue(value?.chart_up_color, DEFAULT_PLATFORM_SETTINGS.chart_up_color),
  chart_down_color: toStringValue(value?.chart_down_color, DEFAULT_PLATFORM_SETTINGS.chart_down_color),
  chart_bg_color: toStringValue(value?.chart_bg_color, DEFAULT_PLATFORM_SETTINGS.chart_bg_color),
  site_title: toStringValue(value?.site_title),
  meta_description: toStringValue(value?.meta_description),
  meta_keywords: toStringValue(value?.meta_keywords),
  og_title: toStringValue(value?.og_title),
  og_description: toStringValue(value?.og_description),
  og_image_url: toStringValue(value?.og_image_url),
  twitter_card_type: toTwitterCardType(value?.twitter_card_type),
  twitter_title: toStringValue(value?.twitter_title),
  twitter_description: toStringValue(value?.twitter_description),
  twitter_image_url: toStringValue(value?.twitter_image_url),
  canonical_url: toStringValue(value?.canonical_url),
  robots_directive: toStringValue(value?.robots_directive, DEFAULT_PLATFORM_SETTINGS.robots_directive),
  custom_meta_tags: toStringValue(value?.custom_meta_tags),
  website_content: toStringValue(value?.website_content),
});

const getCurrentHref = (fallbackHref?: string) => {
  if (fallbackHref) return fallbackHref;
  if (typeof window !== "undefined") return window.location.href;
  return "https://example.com/";
};

const stripUrlForCanonical = (href: string) => {
  try {
    const url = new URL(href);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return href;
  }
};

const resolveUrl = (value: string, fallback: string) => {
  if (!value.trim()) return "";
  try {
    return new URL(value, fallback).toString();
  } catch {
    return value;
  }
};

export const resolveSeoMetadata = (
  rawSettings: Partial<PlatformSettingsRecord> | null | undefined,
  currentHref?: string,
): ResolvedSeoMetadata => {
  const settings = normalizePlatformSettings(rawSettings);
  const href = getCurrentHref(currentHref);
  const canonicalFallback = stripUrlForCanonical(href);
  const siteTitle = settings.site_title.trim() || settings.platform_name.trim() || DEFAULT_PLATFORM_NAME;
  const metaDescription = settings.meta_description.trim() || DEFAULT_META_DESCRIPTION;
  const metaKeywords = settings.meta_keywords.trim();
  const ogTitle = settings.og_title.trim() || siteTitle;
  const ogDescription = settings.og_description.trim() || metaDescription;
  const ogImageUrl = resolveUrl(settings.og_image_url.trim() || settings.logo_url.trim(), href);
  const twitterTitle = settings.twitter_title.trim() || ogTitle;
  const twitterDescription = settings.twitter_description.trim() || ogDescription;
  const twitterImageUrl = resolveUrl(
    settings.twitter_image_url.trim() || settings.og_image_url.trim() || settings.logo_url.trim(),
    href,
  );
  const canonicalUrl = resolveUrl(settings.canonical_url.trim(), href) || canonicalFallback;
  const robotsDirective = settings.robots_directive.trim() || DEFAULT_PLATFORM_SETTINGS.robots_directive;

  return {
    siteTitle,
    metaDescription,
    metaKeywords,
    ogTitle,
    ogDescription,
    ogImageUrl,
    twitterCardType: settings.twitter_card_type,
    twitterTitle,
    twitterDescription,
    twitterImageUrl,
    canonicalUrl,
    robotsDirective,
  };
};
