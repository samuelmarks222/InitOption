export {
  DEFAULT_META_DESCRIPTION,
  DEFAULT_PLATFORM_NAME,
  DEFAULT_PLATFORM_SETTINGS,
  SITE_LOGO_STORAGE_KEY,
  SITE_PLATFORM_NAME_STORAGE_KEY,
  normalizePlatformSettings,
  resolveSeoMetadata,
  type PlatformSettingsRecord,
  type ResolvedSeoMetadata,
  type TwitterCardType,
} from "./platformMetadataShared.ts";

import {
  DEFAULT_PLATFORM_NAME,
  DEFAULT_PLATFORM_SETTINGS,
  SITE_LOGO_STORAGE_KEY,
  SITE_PLATFORM_NAME_STORAGE_KEY,
  normalizePlatformSettings,
  resolveSeoMetadata,
  type PlatformSettingsRecord,
} from "./platformMetadataShared.ts";

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

const CUSTOM_META_FLAG = "data-platform-custom-meta";

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

export const readStoredPlatformName = () => {
  if (typeof window === "undefined") return DEFAULT_PLATFORM_NAME;
  return (
    window.localStorage.getItem(SITE_PLATFORM_NAME_STORAGE_KEY) ||
    document.documentElement.dataset.platformName ||
    DEFAULT_PLATFORM_NAME
  );
};

export const readStoredLogoUrl = () =>
  typeof window !== "undefined" ? window.localStorage.getItem(SITE_LOGO_STORAGE_KEY) : null;

export const applyPlatformSettingsToDocument = (
  rawSettings: Partial<PlatformSettingsRecord> | null | undefined,
  currentHref?: string,
) => {
  if (typeof document === "undefined") return null;

  const settings = normalizePlatformSettings(rawSettings);
  const resolvedSeo = resolveSeoMetadata(settings, currentHref);

  document.title = resolvedSeo.siteTitle;
  document.documentElement.dataset.platformName = settings.platform_name;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SITE_PLATFORM_NAME_STORAGE_KEY, settings.platform_name);
  }

  if (settings.logo_url.trim()) {
    document.documentElement.style.setProperty("--site-logo", `url(${settings.logo_url})`);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SITE_LOGO_STORAGE_KEY, settings.logo_url);
    }
  } else {
    document.documentElement.style.removeProperty("--site-logo");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SITE_LOGO_STORAGE_KEY);
    }
  }

  if (settings.favicon_url.trim()) {
    upsertLinkElement("icon", `${settings.favicon_url}?v=${Date.now()}`);
  }

  upsertMetaElement("name", "description", resolvedSeo.metaDescription);
  upsertMetaElement("name", "keywords", resolvedSeo.metaKeywords, true);
  upsertMetaElement("name", "robots", resolvedSeo.robotsDirective);
  upsertMetaElement("property", "og:type", "website");
  upsertMetaElement("property", "og:title", resolvedSeo.ogTitle);
  upsertMetaElement("property", "og:description", resolvedSeo.ogDescription);
  upsertMetaElement("property", "og:image", resolvedSeo.ogImageUrl, true);
  upsertMetaElement("property", "og:url", resolvedSeo.canonicalUrl);
  upsertMetaElement("property", "og:site_name", settings.platform_name);
  upsertMetaElement("name", "twitter:card", resolvedSeo.twitterCardType);
  upsertMetaElement("name", "twitter:title", resolvedSeo.twitterTitle);
  upsertMetaElement("name", "twitter:description", resolvedSeo.twitterDescription);
  upsertMetaElement("name", "twitter:image", resolvedSeo.twitterImageUrl, true);
  upsertLinkElement("canonical", resolvedSeo.canonicalUrl);
  applyCustomMetaTags(settings.custom_meta_tags);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("brand_updated"));
  }
  return resolvedSeo;
};
