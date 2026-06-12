import { getRouteSeoOverride, type RouteSeoContext } from "./routeSeo.js";

export const SITE_LOGO_STORAGE_KEY = "site_logo";
export const SITE_LOGO_LIGHT_STORAGE_KEY = "site_logo_light";
export const SITE_LOGO_DARK_STORAGE_KEY = "site_logo_dark";
export const SITE_PLATFORM_NAME_STORAGE_KEY = "site_platform_name";
export const SITE_SUPPORT_EMAIL_STORAGE_KEY = "site_support_email";

export const DEFAULT_PLATFORM_NAME = "Init Option";
export const DEFAULT_FAVICON_PATH = "/favicon.ico";
export const DEFAULT_SHARE_IMAGE_PATH = "/apple-touch-icon.png";
export const DEFAULT_META_DESCRIPTION =
  "Init Option is an online trading platform with live charts, M-PESA and crypto funding, instant demo access, and weekly tournaments.";

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
  mpesa_withdrawal_approval_threshold_kes: number;
  require_kyc_withdrawal: boolean;
  strict_password: boolean;
  welcome_bonus_pct: number;
  referral_commission_pct: number;
  logo_url: string;
  logo_url_light: string;
  logo_url_dark: string;
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
  faviconUrl: string;
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
  mpesa_withdrawal_approval_threshold_kes: 10000,
  require_kyc_withdrawal: true,
  strict_password: true,
  welcome_bonus_pct: 50,
  referral_commission_pct: 10,
  logo_url: "",
  logo_url_light: "",
  logo_url_dark: "",
  favicon_url: "",
  chart_up_color: "#00C076",
  chart_down_color: "#F6465D",
  chart_bg_color: "#202942",
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
  mpesa_withdrawal_approval_threshold_kes: toNumberValue(
    value?.mpesa_withdrawal_approval_threshold_kes,
    DEFAULT_PLATFORM_SETTINGS.mpesa_withdrawal_approval_threshold_kes,
  ),
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
  logo_url_light: toStringValue(value?.logo_url_light),
  logo_url_dark: toStringValue(value?.logo_url_dark),
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

const resolveCanonicalUrl = (configuredValue: string, href: string) => {
  const fallback = stripUrlForCanonical(href);
  const resolvedValue = resolveUrl(configuredValue.trim(), href);

  if (!resolvedValue) return fallback;

  try {
    const configuredUrl = new URL(resolvedValue);
    const currentUrl = new URL(fallback);

    if (configuredUrl.pathname === "/" || configuredUrl.pathname === "") {
      return new URL(`${currentUrl.pathname}${currentUrl.search}`, configuredUrl.origin).toString();
    }

    return configuredUrl.toString();
  } catch {
    return resolvedValue || fallback;
  }
};

const BLOCKED_BRAND_ASSET_PATTERN = /(lovable|placeholder\.svg)/i;

const isBlockedBrandAsset = (value: string) => BLOCKED_BRAND_ASSET_PATTERN.test(value);

export const resolveFaviconMimeType = (value: string) => {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue.endsWith(".svg")) return "image/svg+xml";
  if (normalizedValue.endsWith(".ico")) return "image/x-icon";
  return "image/png";
};

export const resolveBrandAssetUrl = (value: string, fallback: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue || isBlockedBrandAsset(trimmedValue)) return "";

  const resolvedValue = resolveUrl(trimmedValue, fallback);
  return isBlockedBrandAsset(resolvedValue) ? "" : resolvedValue;
};

export const resolveSeoMetadata = (
  rawSettings: Partial<PlatformSettingsRecord> | null | undefined,
  currentHref?: string,
  seoContext?: RouteSeoContext | null,
): ResolvedSeoMetadata => {
  const settings = normalizePlatformSettings(rawSettings);
  const href = getCurrentHref(currentHref);
  const pathname = (() => {
    try {
      return new URL(href).pathname;
    } catch {
      return "/";
    }
  })();
  const canonicalFallback = stripUrlForCanonical(href);
  const siteTitle = settings.site_title.trim() || settings.platform_name.trim() || DEFAULT_PLATFORM_NAME;
  const metaDescription = settings.meta_description.trim() || DEFAULT_META_DESCRIPTION;
  const metaKeywords = settings.meta_keywords.trim();
  const resolvedFaviconUrl = resolveBrandAssetUrl(settings.favicon_url.trim(), href);
  const resolvedOgImageUrl = resolveBrandAssetUrl(settings.og_image_url.trim(), href);
  const resolvedTwitterImageUrl = resolveBrandAssetUrl(settings.twitter_image_url.trim(), href);
  const fallbackShareImageUrl = resolveUrl(DEFAULT_SHARE_IMAGE_PATH, href);
  const faviconUrl = resolvedFaviconUrl || resolveUrl(DEFAULT_FAVICON_PATH, href);
  const ogTitle = settings.og_title.trim() || siteTitle;
  const ogDescription = settings.og_description.trim() || metaDescription;
  const ogImageUrl = resolvedOgImageUrl || resolvedTwitterImageUrl || fallbackShareImageUrl;
  const twitterTitle = settings.twitter_title.trim() || ogTitle;
  const twitterDescription = settings.twitter_description.trim() || ogDescription;
  const twitterImageUrl = resolvedTwitterImageUrl || resolvedOgImageUrl || fallbackShareImageUrl;
  const robotsDirective = settings.robots_directive.trim() || DEFAULT_PLATFORM_SETTINGS.robots_directive;
  const routeOverride =
    seoContext?.routeOverride ??
    getRouteSeoOverride(pathname, settings.platform_name.trim() || DEFAULT_PLATFORM_NAME, settings.website_content);
  const configuredCanonicalUrl = resolveCanonicalUrl(settings.canonical_url.trim(), href) || canonicalFallback;
  const routeIsIndexable = Boolean(routeOverride?.robotsDirective && !/noindex/i.test(routeOverride.robotsDirective));
  const canonicalUrl = (() => {
    if (!routeIsIndexable) return configuredCanonicalUrl;

    try {
      const configuredUrl = new URL(configuredCanonicalUrl);
      const fallbackUrl = new URL(canonicalFallback);

      return configuredUrl.pathname === fallbackUrl.pathname ? configuredCanonicalUrl : canonicalFallback;
    } catch {
      return canonicalFallback;
    }
  })();
  const preferRouteTitle = pathname !== "/" || !settings.site_title.trim();
  const preferRouteDescription = pathname !== "/" || !settings.meta_description.trim();
  const preferRouteKeywords = pathname !== "/" || !settings.meta_keywords.trim();
  const preferRouteOgTitle = pathname !== "/" || !settings.og_title.trim();
  const preferRouteOgDescription = pathname !== "/" || !settings.og_description.trim();
  const preferRouteTwitterTitle = pathname !== "/" || !settings.twitter_title.trim();
  const preferRouteTwitterDescription = pathname !== "/" || !settings.twitter_description.trim();
  const resolvedSiteTitle = preferRouteTitle ? routeOverride?.siteTitle || siteTitle : siteTitle;
  const resolvedMetaDescription = preferRouteDescription
    ? routeOverride?.metaDescription || metaDescription
    : metaDescription;
  const resolvedMetaKeywords = preferRouteKeywords ? routeOverride?.metaKeywords || metaKeywords : metaKeywords;
  const resolvedOgTitle = preferRouteOgTitle ? routeOverride?.siteTitle || ogTitle : ogTitle;
  const resolvedOgDescription = preferRouteOgDescription
    ? routeOverride?.metaDescription || ogDescription
    : ogDescription;
  const resolvedTwitterTitle = preferRouteTwitterTitle ? routeOverride?.siteTitle || twitterTitle : twitterTitle;
  const resolvedTwitterDescription = preferRouteTwitterDescription
    ? routeOverride?.metaDescription || twitterDescription
    : twitterDescription;

  return {
    siteTitle: resolvedSiteTitle,
    metaDescription: resolvedMetaDescription,
    metaKeywords: resolvedMetaKeywords,
    faviconUrl,
    ogTitle: resolvedOgTitle,
    ogDescription: resolvedOgDescription,
    ogImageUrl,
    twitterCardType: settings.twitter_card_type,
    twitterTitle: resolvedTwitterTitle,
    twitterDescription: resolvedTwitterDescription,
    twitterImageUrl,
    canonicalUrl,
    robotsDirective: routeOverride?.robotsDirective || robotsDirective,
  };
};
