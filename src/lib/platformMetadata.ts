export {
  DEFAULT_FAVICON_PATH,
  DEFAULT_META_DESCRIPTION,
  DEFAULT_PLATFORM_NAME,
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_SHARE_IMAGE_PATH,
  SITE_LOGO_STORAGE_KEY,
  SITE_PLATFORM_NAME_STORAGE_KEY,
  normalizePlatformSettings,
  resolveSeoMetadata,
  type PlatformSettingsRecord,
  type ResolvedSeoMetadata,
  type TwitterCardType,
} from "./platformMetadataShared";

import {
  DEFAULT_PLATFORM_NAME,
  DEFAULT_PLATFORM_SETTINGS,
  SITE_LOGO_STORAGE_KEY,
  SITE_PLATFORM_NAME_STORAGE_KEY,
  normalizePlatformSettings,
  resolveBrandAssetUrl,
  resolveSeoMetadata,
  type PlatformSettingsRecord,
} from "./platformMetadataShared";
import { buildStructuredData, type RouteSeoContext } from "./routeSeo";

const findMetaElement = (attributeName: "name" | "property", attributeValue: string) =>
  Array.from(document.head.querySelectorAll("meta")).find(
    (element) => element.getAttribute(attributeName) === attributeValue,
  ) ?? null;

const upsertMetaElement = (
  attributeName: "name" | "property",
  attributeValue: string,
  content: string,
  removeWhenEmpty = false,
) => {
  const existing = findMetaElement(attributeName, attributeValue);

  if (!content.trim()) {
    if (removeWhenEmpty) existing?.remove();
    return;
  }

  const element = existing ?? document.createElement("meta");
  element.setAttribute(attributeName, attributeValue);
  element.setAttribute("content", content);

  if (!existing) document.head.appendChild(element);
};

const upsertLinkElement = (rel: string, href: string, removeWhenEmpty = false) => {
  const existing =
    Array.from(document.head.querySelectorAll("link")).find((element) => element.getAttribute("rel") === rel) ?? null;

  if (!href.trim()) {
    if (removeWhenEmpty) existing?.remove();
    return;
  }

  const element = existing ?? document.createElement("link");
  element.setAttribute("rel", rel);
  element.setAttribute("href", href);

  if (!existing) document.head.appendChild(element);
};

const upsertManagedLinkElement = (
  selector: string,
  attributes: Record<string, string>,
  removeWhenEmpty = false,
) => {
  const existing = document.head.querySelector(selector);
  const href = attributes.href?.trim() ?? "";

  if (!href) {
    if (removeWhenEmpty && existing) {
      existing.remove();
    }
    return;
  }

  const element = (existing as HTMLLinkElement | null) ?? document.createElement("link");

  Object.entries(attributes).forEach(([key, value]) => {
    if (value.trim()) {
      element.setAttribute(key, value);
    }
  });

  if (!existing) document.head.appendChild(element);
};

const CUSTOM_META_FLAG = "data-platform-custom-meta";
const STRUCTURED_DATA_FLAG = "data-platform-structured-data";

const createCustomElementFromDescriptor = (descriptor: Record<string, unknown>) => {
  const explicitTag = typeof descriptor.tag === "string" ? descriptor.tag.toLowerCase() : "";
  const tagName = explicitTag === "link" || descriptor.rel || descriptor.href ? "link" : "meta";

  if (tagName !== "meta" && tagName !== "link") return null;

  const element = document.createElement(tagName);

  Object.entries(descriptor).forEach(([key, value]) => {
    if (key === "tag" || value === null || value === undefined) return;
    if (["string", "number", "boolean"].includes(typeof value)) {
      element.setAttribute(key, String(value));
    }
  });

  return element;
};

const parseCustomMetaTags = (rawTags: string) => {
  const trimmed = rawTags.trim();
  if (!trimmed) return [] as HTMLElement[];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const items = Array.isArray(parsed) ? parsed : [parsed];

    return items.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const element = createCustomElementFromDescriptor(item as Record<string, unknown>);
      return element ? [element] : [];
    });
  } catch {
    const template = document.createElement("template");
    template.innerHTML = trimmed;

    return Array.from(template.content.children).flatMap((child) => {
      if (!(child instanceof HTMLElement)) return [];
      const tagName = child.tagName.toLowerCase();
      if (tagName !== "meta" && tagName !== "link") return [];
      return [child.cloneNode(true) as HTMLElement];
    });
  }
};

const applyCustomMetaTags = (rawTags: string) => {
  document.head
    .querySelectorAll(`[${CUSTOM_META_FLAG}="true"]`)
    .forEach((element) => element.remove());

  parseCustomMetaTags(rawTags).forEach((element) => {
    element.setAttribute(CUSTOM_META_FLAG, "true");
    document.head.appendChild(element);
  });
};

const applyStructuredData = (
  websiteContentRaw: unknown,
  currentHref: string,
  metaDescription: string,
  platformName: string,
  logoUrl: string | null,
  seoContext?: RouteSeoContext | null,
) => {
  document.head
    .querySelectorAll(`script[${STRUCTURED_DATA_FLAG}="true"]`)
    .forEach((element) => element.remove());

  buildStructuredData({
    currentHref,
    metaDescription,
    platformName,
    logoUrl: logoUrl ?? undefined,
    seoContext,
    websiteContentRaw,
  }).forEach((entry) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute(STRUCTURED_DATA_FLAG, "true");
    script.textContent = JSON.stringify(entry);
    document.head.appendChild(script);
  });
};

export const readStoredPlatformName = () => {
  if (typeof window === "undefined") return DEFAULT_PLATFORM_NAME;
  return (
    window.localStorage.getItem(SITE_PLATFORM_NAME_STORAGE_KEY) ||
    document.documentElement.dataset.platformName ||
    DEFAULT_PLATFORM_NAME
  );
};

export const readStoredLogoUrl = () => {
  if (typeof window === "undefined") return null;

  const storedLogoUrl = window.localStorage.getItem(SITE_LOGO_STORAGE_KEY) ?? "";
  return resolveBrandAssetUrl(storedLogoUrl, window.location.href) || null;
};

export const applyPlatformSettingsToDocument = (
  rawSettings: Partial<PlatformSettingsRecord> | null | undefined,
  currentHref?: string,
  seoContext?: RouteSeoContext | null,
) => {
  if (typeof document === "undefined") return null;

  const settings = normalizePlatformSettings(rawSettings);
  const resolvedSeo = resolveSeoMetadata(settings, currentHref, seoContext);
  const resolvedCurrentHref =
    currentHref ?? (typeof window !== "undefined" ? window.location.href : "https://example.com/");
  const customThemeColorDefined = settings.custom_meta_tags.toLowerCase().includes("theme-color");

  document.title = resolvedSeo.siteTitle;
  document.documentElement.dataset.platformName = settings.platform_name;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SITE_PLATFORM_NAME_STORAGE_KEY, settings.platform_name);
  }

  const resolvedLogoUrl = resolveBrandAssetUrl(
    settings.logo_url.trim(),
    resolvedCurrentHref,
  );

  if (resolvedLogoUrl) {
    document.documentElement.style.setProperty("--site-logo", `url(${resolvedLogoUrl})`);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SITE_LOGO_STORAGE_KEY, resolvedLogoUrl);
    }
  } else {
    document.documentElement.style.removeProperty("--site-logo");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SITE_LOGO_STORAGE_KEY);
    }
  }

  upsertManagedLinkElement('link[rel="icon"]', {
    rel: "icon",
    type: "image/png",
    href: resolvedSeo.faviconUrl,
  });
  upsertManagedLinkElement('link[rel="shortcut icon"]', {
    rel: "shortcut icon",
    href: resolvedSeo.faviconUrl,
  });
  upsertManagedLinkElement('link[rel="apple-touch-icon"]', {
    rel: "apple-touch-icon",
    href: resolvedSeo.faviconUrl,
  });

  upsertMetaElement("name", "description", resolvedSeo.metaDescription);
  upsertMetaElement("name", "keywords", resolvedSeo.metaKeywords, true);
  upsertMetaElement("name", "robots", resolvedSeo.robotsDirective);
  if (!customThemeColorDefined) {
    upsertMetaElement("name", "theme-color", settings.chart_bg_color || DEFAULT_PLATFORM_SETTINGS.chart_bg_color);
  }
  upsertMetaElement("property", "og:type", "website");
  upsertMetaElement("property", "og:title", resolvedSeo.ogTitle);
  upsertMetaElement("property", "og:description", resolvedSeo.ogDescription);
  upsertMetaElement("property", "og:image", resolvedSeo.ogImageUrl, true);
  upsertMetaElement("property", "og:image:width", resolvedSeo.ogImageUrl ? "512" : "", true);
  upsertMetaElement("property", "og:image:height", resolvedSeo.ogImageUrl ? "512" : "", true);
  upsertMetaElement("property", "og:image:alt", resolvedSeo.ogImageUrl ? `${settings.platform_name || DEFAULT_PLATFORM_SETTINGS.platform_name} icon` : "", true);
  upsertMetaElement("property", "og:url", resolvedSeo.canonicalUrl);
  upsertMetaElement("property", "og:site_name", settings.platform_name);
  upsertMetaElement("name", "twitter:card", resolvedSeo.twitterCardType);
  upsertMetaElement("name", "twitter:title", resolvedSeo.twitterTitle);
  upsertMetaElement("name", "twitter:description", resolvedSeo.twitterDescription);
  upsertMetaElement("name", "twitter:image", resolvedSeo.twitterImageUrl, true);
  upsertMetaElement("name", "twitter:image:alt", resolvedSeo.twitterImageUrl ? `${settings.platform_name || DEFAULT_PLATFORM_SETTINGS.platform_name} icon` : "", true);
  upsertLinkElement("canonical", resolvedSeo.canonicalUrl);
  applyCustomMetaTags(settings.custom_meta_tags);
  applyStructuredData(
    settings.website_content,
    resolvedCurrentHref,
    resolvedSeo.metaDescription,
    settings.platform_name,
    resolvedLogoUrl,
    seoContext,
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("brand_updated"));
  }
  return resolvedSeo;
};
