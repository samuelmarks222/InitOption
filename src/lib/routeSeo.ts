import {
  buildTournamentEventSchema,
  buildTournamentListingSeo,
  type TournamentStructuredDataInput,
} from "./publicTournaments.js";
import type { BlogPostDefinition, BlogPostSummary } from "./blogPosts.js";
import { PUBLIC_PAGE_LIST, getPublicPageByPath } from "./publicPages.js";
import { normalizeWebsiteContent } from "./websiteContent.js";

const AUTH_PATHS = new Set(["/login", "/register"]);
const PRIVATE_PREFIXES = ["/admin", "/dashboard", "/trade", "/deposit", "/withdraw", "/settings", "/notifications", "/traders"];
const TOURNAMENTS_INDEX_PATH = "/tournaments";
const DEFAULT_SHARE_IMAGE_PATH = "/share-icon.png";
const HOME_TITLE_TEMPLATE = "{platformName} – Trading Platform: Free Demo, Live Trading & Fast Withdrawals";
const HOME_DESCRIPTION_TEMPLATE =
  "{platformName} is an OTC trading platform with real-time charts, instant demo trading, M-PESA and crypto funding, public tournaments, and fast withdrawals.";
const HOME_KEYWORDS =
  "Init Option, initoption, OTC trading platform, online trading, demo trading, real-time charts, M-PESA trading, crypto funding, trading tournaments, fast withdrawals, web terminal, mobile trading";

export interface RouteSeoOverride {
  siteTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  robotsDirective?: string;
}

export interface RouteSeoContext {
  routeOverride?: RouteSeoOverride | null;
  tournament?: TournamentStructuredDataInput | null;
  tournaments?: TournamentStructuredDataInput[] | null;
  blogPost?: BlogPostDefinition | null;
  blogPosts?: Array<BlogPostDefinition | BlogPostSummary> | null;
}

const normalizePathname = (pathname: string) => {
  if (!pathname || pathname === "/") return "/";
  return `/${pathname.replace(/^\/+/, "").replace(/\/+$/, "")}`;
};

const interpolate = (value: string, platformName: string) => value.replaceAll("{platformName}", platformName);

const isPrivatePath = (pathname: string) =>
  PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const isTournamentDetailPath = (pathname: string) => pathname.startsWith(`${TOURNAMENTS_INDEX_PATH}/`);

export const getRouteSeoOverride = (
  pathname: string,
  platformName: string,
  websiteContentRaw?: unknown,
): RouteSeoOverride | null => {
  const normalizedPathname = normalizePathname(pathname);
  const publicPage = getPublicPageByPath(normalizedPathname, websiteContentRaw, platformName);

  if (publicPage) {
    return {
      siteTitle: interpolate(publicPage.seoTitle, platformName),
      metaDescription: interpolate(publicPage.seoDescription, platformName),
      metaKeywords: publicPage.keywords,
      robotsDirective: "index, follow",
    };
  }

  if (normalizedPathname === TOURNAMENTS_INDEX_PATH) {
    return buildTournamentListingSeo(platformName);
  }

  if (isTournamentDetailPath(normalizedPathname)) {
    return {
      robotsDirective: "index, follow",
    };
  }

  if (normalizedPathname === "/") {
    return {
      siteTitle: interpolate(HOME_TITLE_TEMPLATE, platformName),
      metaDescription: interpolate(HOME_DESCRIPTION_TEMPLATE, platformName),
      metaKeywords: HOME_KEYWORDS,
      robotsDirective: "index, follow",
    };
  }

  if (AUTH_PATHS.has(normalizedPathname)) {
    return {
      siteTitle: `${normalizedPathname === "/login" ? "Sign in" : "Create account"} | ${platformName}`,
      metaDescription:
        `${normalizedPathname === "/login" ? "Access your" : "Create your"} ${platformName} account to use the trading platform and account tools.`,
      robotsDirective: "noindex, follow",
    };
  }

  if (isPrivatePath(normalizedPathname)) {
    return {
      robotsDirective: "noindex, nofollow",
    };
  }

  return {
    robotsDirective: "noindex, nofollow",
  };
};

interface StructuredDataContext {
  currentHref: string;
  platformName: string;
  metaDescription: string;
  logoUrl?: string;
  supportEmail?: string;
  seoContext?: RouteSeoContext | null;
  websiteContentRaw?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseRawWebsiteContent = (rawValue: unknown) => {
  if (typeof rawValue === "string" && rawValue.trim()) {
    try {
      const parsed = JSON.parse(rawValue) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return isRecord(rawValue) ? rawValue : {};
};

const resolveSocialHref = (url: string) => {
  const trimmed = url.trim();

  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;

  return `https://${trimmed.replace(/^\/+/, "")}`;
};

const buildBreadcrumbSchema = (
  pathname: string,
  platformName: string,
  siteOrigin: string,
  websiteContentRaw?: unknown,
) => {
  const publicPage = getPublicPageByPath(pathname, websiteContentRaw, platformName);
  if (!publicPage) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: platformName,
        item: siteOrigin,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: interpolate(publicPage.seoTitle, platformName),
        item: `${siteOrigin}${publicPage.path}`,
      },
    ],
  };
};

export const buildStructuredData = ({
  currentHref,
  platformName,
  metaDescription,
  logoUrl,
  supportEmail,
  seoContext,
  websiteContentRaw,
}: StructuredDataContext) => {
  let url: URL;

  try {
    url = new URL(currentHref);
  } catch {
    return [];
  }

  const pathname = normalizePathname(url.pathname);
  const siteOrigin = url.origin;
  const resolvedLogoUrl = logoUrl?.trim() ? logoUrl : new URL(DEFAULT_SHARE_IMAGE_PATH, siteOrigin).toString();
  const publicPage = getPublicPageByPath(pathname, websiteContentRaw, platformName);
  const tournament = seoContext?.tournament ?? null;
  const listingTournaments = (seoContext?.tournaments ?? []).filter((entry) => entry.status !== "cancelled");
  const websiteContent = normalizeWebsiteContent(websiteContentRaw, platformName);
  const rawWebsiteContent = parseRawWebsiteContent(websiteContentRaw);
  const homeSeo = getRouteSeoOverride("/", platformName, websiteContentRaw);
  const socialLinksSource = isRecord(rawWebsiteContent.socialLinks) ? rawWebsiteContent.socialLinks : {};
  const sameAsLinks = Array.isArray(socialLinksSource.items)
    ? socialLinksSource.items
        .flatMap((item) => {
          if (!isRecord(item) || typeof item.url !== "string") return [];
          const href = resolveSocialHref(item.url);
          return href ? [href] : [];
        })
    : [];

  const organizationEntry: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: platformName,
    url: siteOrigin,
    logo: resolvedLogoUrl,
    description: metaDescription,
  };

  const alternateBrandName = platformName.replace(/\s+/g, "");
  if (alternateBrandName && alternateBrandName !== platformName) {
    organizationEntry.alternateName = alternateBrandName;
  }

  if (supportEmail?.trim()) {
    organizationEntry.email = supportEmail.trim();
    organizationEntry.contactPoint = [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: supportEmail.trim(),
        availableLanguage: ["en"],
      },
    ];
  }

  if (sameAsLinks.length) {
    organizationEntry.sameAs = sameAsLinks;
  }

  const items: Record<string, unknown>[] = [
    organizationEntry,
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: platformName,
      alternateName: alternateBrandName !== platformName ? alternateBrandName : undefined,
      url: siteOrigin,
      description: metaDescription,
      inLanguage: "en",
    },
  ];

  if (pathname === "/") {
    items.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: homeSeo?.siteTitle || interpolate(HOME_TITLE_TEMPLATE, platformName),
      description: metaDescription,
      url: siteOrigin,
      isPartOf: {
        "@type": "WebSite",
        name: platformName,
        url: siteOrigin,
      },
      primaryImageOfPage: resolvedLogoUrl,
    });

    items.push({
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${platformName} OTC trading platform`,
      serviceType: "OTC Trading Platform",
      provider: {
        "@type": "Organization",
        name: platformName,
      },
      url: siteOrigin,
      description: metaDescription,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free demo account",
      },
    });

    items.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${platformName} public pages`,
      itemListElement: PUBLIC_PAGE_LIST.filter((page) => page.path !== "/site-map").map((page, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: interpolate(page.title, platformName),
        url: `${siteOrigin}${page.path}`,
      })),
    });

    items.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: websiteContent.faq.items.map((item) => ({
        "@type": "Question",
        name: interpolate(item.question, platformName),
        acceptedAnswer: {
          "@type": "Answer",
          text: interpolate(item.answer, platformName),
        },
      })),
    });
  }

  if (pathname === TOURNAMENTS_INDEX_PATH) {
    items.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Trading tournaments | ${platformName}`,
      description: metaDescription,
      url: currentHref,
    });
    items.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: platformName,
          item: siteOrigin,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Trading tournaments",
          item: `${siteOrigin}${TOURNAMENTS_INDEX_PATH}`,
        },
      ],
    });

    listingTournaments.forEach((entry) => {
      items.push(buildTournamentEventSchema(new URL(entry.path, siteOrigin).toString(), platformName, entry));
    });
  }

  if (publicPage) {
    const publicPageType =
      pathname === "/contact"
        ? "ContactPage"
        : pathname === "/blog" || pathname === "/site-map"
          ? "CollectionPage"
          : "WebPage";

    items.push({
      "@context": "https://schema.org",
      "@type": publicPageType,
      name: interpolate(publicPage.title, platformName),
      description: interpolate(publicPage.description, platformName),
      url: currentHref,
    });

    const breadcrumbSchema = buildBreadcrumbSchema(pathname, platformName, siteOrigin, websiteContentRaw);
    if (breadcrumbSchema) {
      items.push(breadcrumbSchema);
    }

    if (pathname === "/faq" && publicPage.faqItems?.length) {
      items.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: publicPage.faqItems.map((item) => ({
          "@type": "Question",
          name: interpolate(item.question, platformName),
          acceptedAnswer: {
            "@type": "Answer",
            text: interpolate(item.answer, platformName),
          },
        })),
      });
    }

    if (pathname === "/contact" && supportEmail?.trim()) {
      items.push({
        "@context": "https://schema.org",
        "@type": "ContactPoint",
        contactType: "customer support",
        email: supportEmail.trim(),
        url: currentHref,
        availableLanguage: ["en"],
      });
    }

    if (pathname === "/blog" && publicPage.relatedLinks?.length) {
      items.push({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${platformName} blog hub`,
        itemListElement: publicPage.relatedLinks
          .filter((item) => item.to)
          .map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            url: `${siteOrigin}${item.to}`,
          })),
      });
    }

    if (pathname === "/site-map") {
      items.push({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${platformName} public site map`,
        itemListElement: PUBLIC_PAGE_LIST.filter((page) => page.path !== "/site-map").map((page, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: interpolate(page.title, platformName),
          url: `${siteOrigin}${page.path}`,
        })),
      });
    }
  }

  if (isTournamentDetailPath(pathname) && tournament) {
    items.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${tournament.title} Tournament`,
      description: tournament.description || metaDescription,
      url: currentHref,
    });
    items.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: platformName,
          item: siteOrigin,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Trading tournaments",
          item: `${siteOrigin}${TOURNAMENTS_INDEX_PATH}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: tournament.title,
          item: currentHref,
        },
      ],
    });
    items.push(buildTournamentEventSchema(currentHref, platformName, tournament));
  }

  return items;
};

export interface SitemapEntryDefinition {
  path: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}

export const getSitemapEntries = (siteOrigin: string, extraEntries: SitemapEntryDefinition[] = []) => {
  const entries = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: TOURNAMENTS_INDEX_PATH, changefreq: "daily", priority: "0.8" },
    ...PUBLIC_PAGE_LIST.map((page) => ({
      path: page.path,
      changefreq: page.key === "faq" ? "weekly" : "monthly",
      priority: page.key === "how-it-works" || page.key === "trading-guide" ? "0.8" : "0.7",
    })),
    ...extraEntries,
  ];
  const deduplicated = Array.from(new Map(entries.map((entry) => [entry.path, entry])).values());

  return deduplicated.map((entry) => ({
    ...entry,
    url: `${siteOrigin}${entry.path}`,
  }));
};
