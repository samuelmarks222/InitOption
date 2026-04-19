import {
  buildTournamentEventSchema,
  buildTournamentListingSeo,
  type TournamentStructuredDataInput,
} from "./publicTournaments.js";
import { PUBLIC_PAGE_LIST, getPublicPageByPath } from "./publicPages.js";
import { normalizeWebsiteContent } from "./websiteContent.js";

const AUTH_PATHS = new Set(["/login", "/register"]);
const PRIVATE_PREFIXES = ["/admin", "/dashboard", "/trade", "/deposit", "/withdraw", "/settings", "/notifications", "/traders"];
const TOURNAMENTS_INDEX_PATH = "/tournaments";
const DEFAULT_SHARE_IMAGE_PATH = "/share-icon.png";
const HOME_TITLE_TEMPLATE = "{platformName} - Trade with up to 95% Profit | Fast Withdrawals";
const HOME_DESCRIPTION_TEMPLATE =
  "Trade OTC markets with {platformName}. Get a 70% welcome bonus, real-time charts, instant demo, and weekly tournaments. Start trading today.";
const HOME_KEYWORDS =
  "trading platform, online trading, OTC trading, high profit trading, real-time charts, demo account, trading tournaments, fast withdrawals, welcome bonus, web terminal, mobile trading";

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
  seoContext?: RouteSeoContext | null;
  websiteContentRaw?: unknown;
}

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
  const homeSeo = getRouteSeoOverride("/", platformName, websiteContentRaw);

  const items: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: platformName,
      url: siteOrigin,
      logo: resolvedLogoUrl,
      description: metaDescription,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: platformName,
      url: siteOrigin,
      description: metaDescription,
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
    items.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
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
