import {
  DEFAULT_FAVICON_PATH,
  DEFAULT_PLATFORM_NAME,
  DEFAULT_SHARE_IMAGE_PATH,
  normalizePlatformSettings,
  resolveSeoMetadata,
  type PlatformSettingsRecord,
} from "./platformMetadataShared.js";
import { stripHtmlTags } from "./blogPosts.js";
import { buildStructuredData, type RouteSeoContext } from "./routeSeo.js";

export const PLATFORM_METADATA_START_MARKER = '<meta name="platform-metadata-start" content="true">';
export const PLATFORM_METADATA_END_MARKER = '<meta name="platform-metadata-end" content="true">';
const STRUCTURED_DATA_FLAG = "data-platform-structured-data";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderStructuredDataScript = (payload: Record<string, unknown>) =>
  `<script type="application/ld+json" ${STRUCTURED_DATA_FLAG}="true">${JSON.stringify(payload).replaceAll("</script>", "<\\/script>")}</script>`;

const renderVoidTag = (tagName: "meta" | "link", attributes: Record<string, string | undefined>) => {
  const serializedAttributes = Object.entries(attributes)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([key, value]) => ` ${key}="${escapeHtml(value ?? "")}"`)
    .join("");

  return `<${tagName}${serializedAttributes}>`;
};

const renderSeoBodyFallback = (seoContext?: RouteSeoContext | null) => {
  const blogPost = seoContext?.blogPost ?? null;
  if (!blogPost) return "";

  const contentText = stripHtmlTags(blogPost.contentHtml).slice(0, 6000);
  const categoryName = blogPost.categories[0]?.name || "Trading guide";
  const summary = blogPost.metaDescription || blogPost.excerpt;

  return `
    <main data-seo-prerender="blog-post" style="min-height:100vh;background:#101521;color:#f8fbff;font-family:Arial,sans-serif;padding:32px 18px;">
      <article style="max-width:900px;margin:0 auto;line-height:1.75;">
        <a href="/blog" style="color:#21c77a;text-decoration:none;font-weight:700;">Init Option Blog</a>
        <p style="margin:20px 0 0;color:#9fb0c7;font-size:13px;text-transform:uppercase;letter-spacing:.14em;">${escapeHtml(categoryName)}</p>
        <h1 style="margin:12px 0 0;font-size:42px;line-height:1.12;color:#fff;">${escapeHtml(blogPost.title)}</h1>
        <p style="margin:18px 0 0;font-size:18px;color:#d7e2f1;">${escapeHtml(summary)}</p>
        <p style="margin:26px 0 0;color:#eef4ff;">${escapeHtml(contentText)}</p>
      </article>
    </main>
  `;
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
  seoContext?: RouteSeoContext | null,
) => {
  const settings = normalizePlatformSettings(rawSettings);
  const resolvedSeo = resolveSeoMetadata(settings, currentHref, seoContext);
  const platformName = settings.platform_name.trim() || DEFAULT_PLATFORM_NAME;
  const faviconUrl = resolvedSeo.faviconUrl || settings.favicon_url.trim() || DEFAULT_FAVICON_PATH;
  const shareImageUrl = resolvedSeo.ogImageUrl || resolvedSeo.twitterImageUrl || DEFAULT_SHARE_IMAGE_PATH;
  const customMetaTags = renderCustomMetaTags(settings.custom_meta_tags);
  const customThemeColorDefined = settings.custom_meta_tags.toLowerCase().includes("theme-color");
  const structuredData = buildStructuredData({
    currentHref: currentHref || "https://example.com/",
    metaDescription: resolvedSeo.metaDescription,
    platformName,
    logoUrl: shareImageUrl,
    supportEmail: settings.support_email,
    seoContext,
    websiteContentRaw: settings.website_content,
  });

  const tags = [
    `<title>${escapeHtml(resolvedSeo.siteTitle)}</title>`,
    renderVoidTag("meta", { name: "description", content: resolvedSeo.metaDescription }),
    renderVoidTag("meta", { name: "author", content: platformName }),
    renderVoidTag("meta", { name: "application-name", content: platformName }),
    renderVoidTag("meta", { name: "language", content: "en" }),
    renderVoidTag("meta", { name: "robots", content: resolvedSeo.robotsDirective }),
    renderVoidTag("meta", { property: "og:type", content: "website" }),
    renderVoidTag("meta", { property: "og:locale", content: "en_US" }),
    renderVoidTag("meta", { property: "og:title", content: resolvedSeo.ogTitle }),
    renderVoidTag("meta", { property: "og:description", content: resolvedSeo.ogDescription }),
    renderVoidTag("meta", { property: "og:url", content: resolvedSeo.canonicalUrl }),
    renderVoidTag("meta", { property: "og:site_name", content: platformName }),
    renderVoidTag("meta", { name: "twitter:card", content: resolvedSeo.twitterCardType }),
    renderVoidTag("meta", { name: "twitter:title", content: resolvedSeo.twitterTitle }),
    renderVoidTag("meta", { name: "twitter:description", content: resolvedSeo.twitterDescription }),
    renderVoidTag("link", { rel: "canonical", href: resolvedSeo.canonicalUrl }),
    renderVoidTag("link", { rel: "icon", type: "image/png", href: faviconUrl }),
    renderVoidTag("link", { rel: "shortcut icon", href: faviconUrl }),
    renderVoidTag("link", { rel: "apple-touch-icon", href: faviconUrl }),
    renderVoidTag("link", { rel: "alternate", hreflang: "en", href: resolvedSeo.canonicalUrl }),
    renderVoidTag("link", { rel: "alternate", hreflang: "x-default", href: resolvedSeo.canonicalUrl }),
    renderVoidTag("link", { rel: "manifest", href: "/manifest.json" }),
    renderVoidTag("link", { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" }),
  ];

  if (!customThemeColorDefined) {
    tags.splice(4, 0, renderVoidTag("meta", { name: "theme-color", content: settings.chart_bg_color || "#0E1217" }));
  }

  if (resolvedSeo.metaKeywords.trim()) {
    tags.splice(2, 0, renderVoidTag("meta", { name: "keywords", content: resolvedSeo.metaKeywords }));
  }

  if (shareImageUrl.trim()) {
    tags.push(renderVoidTag("meta", { property: "og:image", content: shareImageUrl }));
    tags.push(renderVoidTag("meta", { property: "og:image:width", content: "512" }));
    tags.push(renderVoidTag("meta", { property: "og:image:height", content: "512" }));
    tags.push(renderVoidTag("meta", { property: "og:image:alt", content: `${platformName} icon` }));
  }

  if ((resolvedSeo.twitterImageUrl || shareImageUrl).trim()) {
    tags.push(renderVoidTag("meta", { name: "twitter:image", content: resolvedSeo.twitterImageUrl || shareImageUrl }));
    tags.push(renderVoidTag("meta", { name: "twitter:image:alt", content: `${platformName} icon` }));
  }

  if (customMetaTags) {
    tags.push(customMetaTags);
  }

  structuredData.forEach((entry) => {
    tags.push(renderStructuredDataScript(entry));
  });

  return tags.join("\n    ");
};

export const injectPlatformMetadataIntoHtml = (
  htmlTemplate: string,
  rawSettings: Partial<PlatformSettingsRecord> | null | undefined,
  currentHref?: string,
  seoContext?: RouteSeoContext | null,
) => {
  const headMarkup = renderPlatformHeadMarkup(rawSettings, currentHref, seoContext);
  const markerPattern =
    /<meta name="platform-metadata-start" content="true"\s*\/?>[\s\S]*?<meta name="platform-metadata-end" content="true"\s*\/?>/i;
  const replacement = `${PLATFORM_METADATA_START_MARKER}
    ${headMarkup}
    ${PLATFORM_METADATA_END_MARKER}`;

  const htmlWithHead = markerPattern.test(htmlTemplate)
    ? htmlTemplate.replace(markerPattern, replacement)
    : htmlTemplate.replace("</head>", `    ${headMarkup}\n  </head>`);
  const bodyFallback = renderSeoBodyFallback(seoContext);

  if (!bodyFallback) return htmlWithHead;

  return htmlWithHead.replace(/<div id="root"><\/div>/i, `<div id="root">${bodyFallback}</div>`);
};
