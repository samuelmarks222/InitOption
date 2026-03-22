import {
  DEFAULT_PLATFORM_NAME,
  normalizePlatformSettings,
  resolveSeoMetadata,
  type PlatformSettingsRecord,
} from "./platformMetadataShared.ts";

export const PLATFORM_METADATA_START_MARKER = '<meta name="platform-metadata-start" content="true">';
export const PLATFORM_METADATA_END_MARKER = '<meta name="platform-metadata-end" content="true">';

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderVoidTag = (tagName: "meta" | "link", attributes: Record<string, string | undefined>) => {
  const serializedAttributes = Object.entries(attributes)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([key, value]) => ` ${key}="${escapeHtml(value ?? "")}"`)
    .join("");

  return `<${tagName}${serializedAttributes}>`;
};

const SAFE_RAW_CUSTOM_TAGS = /^(?:\s*<(?:meta|link)\b[^<>]*\/?>\s*)+$/i;

const renderCustomMetaTags = (rawTags: string) => {
  const trimmed = rawTags.trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const items = Array.isArray(parsed) ? parsed : [parsed];

    return items
      .flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];

        const descriptor = item as Record<string, unknown>;
        const explicitTag = typeof descriptor.tag === "string" ? descriptor.tag.toLowerCase() : "";
        const tagName = explicitTag === "link" || descriptor.rel || descriptor.href ? "link" : "meta";

        if (tagName !== "meta" && tagName !== "link") return [];

        const attributes = Object.entries(descriptor).reduce<Record<string, string>>((accumulator, [key, value]) => {
          if (key === "tag" || value === null || value === undefined) return accumulator;
          if (["string", "number", "boolean"].includes(typeof value)) {
            accumulator[key] = String(value);
          }
          return accumulator;
        }, {});

        return [renderVoidTag(tagName, attributes)];
      })
      .join("\n    ");
  } catch {
    return SAFE_RAW_CUSTOM_TAGS.test(trimmed) ? trimmed : "";
  }
};

export const renderPlatformHeadMarkup = (
  rawSettings: Partial<PlatformSettingsRecord> | null | undefined,
  currentHref?: string,
) => {
  const settings = normalizePlatformSettings(rawSettings);
  const resolvedSeo = resolveSeoMetadata(settings, currentHref);
  const platformName = settings.platform_name.trim() || DEFAULT_PLATFORM_NAME;
  const faviconUrl = settings.favicon_url.trim() || "/favicon.ico";
  const customMetaTags = renderCustomMetaTags(settings.custom_meta_tags);

  const tags = [
    `<title>${escapeHtml(resolvedSeo.siteTitle)}</title>`,
    renderVoidTag("meta", { name: "description", content: resolvedSeo.metaDescription }),
    renderVoidTag("meta", { name: "author", content: platformName }),
    renderVoidTag("meta", { name: "robots", content: resolvedSeo.robotsDirective }),
    renderVoidTag("meta", { property: "og:type", content: "website" }),
    renderVoidTag("meta", { property: "og:title", content: resolvedSeo.ogTitle }),
    renderVoidTag("meta", { property: "og:description", content: resolvedSeo.ogDescription }),
    renderVoidTag("meta", { property: "og:url", content: resolvedSeo.canonicalUrl }),
    renderVoidTag("meta", { property: "og:site_name", content: platformName }),
    renderVoidTag("meta", { name: "twitter:card", content: resolvedSeo.twitterCardType }),
    renderVoidTag("meta", { name: "twitter:title", content: resolvedSeo.twitterTitle }),
    renderVoidTag("meta", { name: "twitter:description", content: resolvedSeo.twitterDescription }),
    renderVoidTag("link", { rel: "canonical", href: resolvedSeo.canonicalUrl }),
    renderVoidTag("link", { rel: "icon", type: "image/x-icon", href: faviconUrl }),
  ];

  if (resolvedSeo.metaKeywords.trim()) {
    tags.splice(2, 0, renderVoidTag("meta", { name: "keywords", content: resolvedSeo.metaKeywords }));
  }

  if (resolvedSeo.ogImageUrl.trim()) {
    tags.push(renderVoidTag("meta", { property: "og:image", content: resolvedSeo.ogImageUrl }));
  }

  if (resolvedSeo.twitterImageUrl.trim()) {
    tags.push(renderVoidTag("meta", { name: "twitter:image", content: resolvedSeo.twitterImageUrl }));
  }

  if (customMetaTags) {
    tags.push(customMetaTags);
  }

  return tags.join("\n    ");
};

export const injectPlatformMetadataIntoHtml = (
  htmlTemplate: string,
  rawSettings: Partial<PlatformSettingsRecord> | null | undefined,
  currentHref?: string,
) => {
  const headMarkup = renderPlatformHeadMarkup(rawSettings, currentHref);
  const markerPattern =
    /<meta name="platform-metadata-start" content="true"\s*\/?>[\s\S]*?<meta name="platform-metadata-end" content="true"\s*\/?>/i;
  const replacement = `${PLATFORM_METADATA_START_MARKER}
    ${headMarkup}
    ${PLATFORM_METADATA_END_MARKER}`;

  if (markerPattern.test(htmlTemplate)) {
    return htmlTemplate.replace(markerPattern, replacement);
  }

  return htmlTemplate.replace("</head>", `    ${headMarkup}\n  </head>`);
};
