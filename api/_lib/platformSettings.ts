import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PLATFORM_SETTINGS,
  normalizePlatformSettings,
  resolveSeoMetadata,
  type PlatformSettingsRecord,
} from "../../src/lib/platformMetadataShared.js";
import {
  buildTournamentDetailSeo,
  buildTournamentListingSeo,
  buildTournamentNotFoundSeo,
  toTournamentStructuredData,
} from "../../src/lib/publicTournaments.js";
import type { RouteSeoContext } from "../../src/lib/routeSeo.js";
import { injectPlatformMetadataIntoHtml } from "../../src/lib/serverPlatformMetadata.js";
import { fetchAllPublishedBlogPostsForSeo, fetchPublicBlogPost, fetchPublicBlogPosts } from "./blog.js";
import { fetchWithTimeout, resolveWithTimeout } from "./fetchWithTimeout.js";
import { fetchPublicTournaments, findPublicTournamentBySlug } from "./publicTournaments.js";

type RequestHeaderValue = string | string[] | undefined;

type ApiRequestLike = {
  headers?: Record<string, RequestHeaderValue>;
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SOURCE_BOOTSTRAP_PATTERNS = ["/src/boot.ts", "/src/main.tsx"];
const DYNAMIC_SEO_TIMEOUT_MS = 3500;

const getStringFromValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const getHeaderValue = (headers: Record<string, RequestHeaderValue> | undefined, headerName: string) => {
  if (!headers) return "";
  const directMatch = headers[headerName];
  if (directMatch) return getStringFromValue(directMatch);

  const matchedKey = Object.keys(headers).find((key) => key.toLowerCase() === headerName.toLowerCase());
  return matchedKey ? getStringFromValue(headers[matchedKey]) : "";
};

const getForwardedHost = (request: ApiRequestLike) =>
  getHeaderValue(request.headers, "x-forwarded-host") || getHeaderValue(request.headers, "host") || "localhost";

export const isLocalHostRequest = (request: ApiRequestLike) => {
  const host = getForwardedHost(request).split(":")[0].trim().toLowerCase();
  return LOCAL_HOSTS.has(host) || host.endsWith(".local");
};

export const hasSourceBootstrap = (htmlTemplate: string) =>
  SOURCE_BOOTSTRAP_PATTERNS.some((pattern) => htmlTemplate.includes(pattern));

export const getSupabaseConfig = () => {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  return {
    anonKey,
    url,
  };
};

export const fetchPlatformSettings = async () => {
  const { anonKey, url } = getSupabaseConfig();

  if (!url || !anonKey) {
    return DEFAULT_PLATFORM_SETTINGS;
  }

  const endpoint = new URL("/rest/v1/platform_settings", url);
  endpoint.searchParams.set("select", "*");
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("order", "created_at.asc.nullslast");

  try {
    const response = await fetchWithTimeout(endpoint, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase settings fetch failed with ${response.status}`);
    }

    const payload = (await response.json()) as Partial<PlatformSettingsRecord>[];
    return normalizePlatformSettings(payload[0] ?? DEFAULT_PLATFORM_SETTINGS);
  } catch (error) {
    console.warn("Platform settings fetch failed. Falling back to defaults.", error);
    return DEFAULT_PLATFORM_SETTINGS;
  }
};

export const buildRequestUrl = (request: ApiRequestLike) => {
  const forwardedProto = getHeaderValue(request.headers, "x-forwarded-proto") || "https";
  const forwardedHost = getForwardedHost(request);
  const pathnameParam = getStringFromValue(request.query?.__pathname);
  const pathname = pathnameParam ? `/${pathnameParam.replace(/^\/+/, "")}` : "/";
  const url = new URL(pathname, `${forwardedProto}://${forwardedHost}`);

  Object.entries(request.query ?? {}).forEach(([key, value]) => {
    if (key === "__pathname") return;

    const appendValue = (entry: string) => {
      if (entry.length === 0) return;
      url.searchParams.append(key, entry);
    };

    if (Array.isArray(value)) {
      value.forEach((entry) => appendValue(entry ?? ""));
      return;
    }

    appendValue(value ?? "");
  });

  return url.toString();
};

let cachedBuiltHtmlTemplate: string | null = null;
let cachedLocalHtmlTemplate: string | null = null;

const getHtmlTemplateCandidatePaths = () => [
  path.join(process.cwd(), "dist", "index.html"),
  path.resolve(moduleDir, "../../dist/index.html"),
  path.join(process.cwd(), ".vercel", "output", "static", "index.html"),
  path.resolve(moduleDir, "../../.vercel/output/static/index.html"),
  path.join(process.cwd(), "index.html"),
];

export const loadHtmlTemplate = async (request?: ApiRequestLike) => {
  const allowSourceTemplate = request ? isLocalHostRequest(request) : process.env.NODE_ENV !== "production";
  const cachedTemplate = allowSourceTemplate ? cachedLocalHtmlTemplate : cachedBuiltHtmlTemplate;

  if (cachedTemplate) {
    return cachedTemplate;
  }

  const candidatePaths = getHtmlTemplateCandidatePaths();

  for (const candidatePath of candidatePaths) {
    try {
      const htmlTemplate = await readFile(candidatePath, "utf8");

      if (!allowSourceTemplate && hasSourceBootstrap(htmlTemplate)) {
        continue;
      }

      if (hasSourceBootstrap(htmlTemplate)) {
        cachedLocalHtmlTemplate = htmlTemplate;
      } else {
        cachedBuiltHtmlTemplate = htmlTemplate;
      }

      return htmlTemplate;
    } catch {
      // Try the next candidate path.
    }
  }

  if (!allowSourceTemplate) {
    throw new Error("Unable to locate a production-safe HTML template for SEO injection.");
  }

  throw new Error("Unable to locate an HTML template for SEO injection.");
};

export const renderSeoHtml = async (request: ApiRequestLike) => {
  const currentHref = buildRequestUrl(request);
  const [htmlTemplate, platformSettings] = await Promise.all([loadHtmlTemplate(request), fetchPlatformSettings()]);
  const seoContext = await resolveWithTimeout(
    resolveDynamicSeoContext(currentHref, platformSettings.platform_name),
    null,
    DYNAMIC_SEO_TIMEOUT_MS,
    "Dynamic SEO context",
  );

  return injectPlatformMetadataIntoHtml(htmlTemplate, platformSettings, currentHref, seoContext);
};

export const buildSeoPayload = async (request: ApiRequestLike) => {
  const settings = await fetchPlatformSettings();
  const currentHref = buildRequestUrl(request);
  const seoContext = await resolveDynamicSeoContext(currentHref, settings.platform_name);

  return {
    resolved: resolveSeoMetadata(settings, currentHref, seoContext),
    settings,
  };
};

const resolveDynamicSeoContext = async (
  currentHref: string,
  platformName: string,
): Promise<RouteSeoContext | null> => {
  let url: URL;

  try {
    url = new URL(currentHref);
  } catch {
    return null;
  }

  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (pathname === "/tournaments") {
      const tournaments = await fetchPublicTournaments();
      return {
        routeOverride: buildTournamentListingSeo(platformName),
        tournaments: tournaments
          .filter((tournament) => tournament.status !== "cancelled")
          .map((tournament) => toTournamentStructuredData(tournament)),
      };
    }

    if (pathname === "/blog") {
      const blogPayload = await fetchPublicBlogPosts(1, 6);
      return {
        blogPosts: blogPayload.posts,
      };
    }

    if (pathname.startsWith("/blog/")) {
      const slug = pathname.slice("/blog/".length).trim();
      if (!slug) {
        const blogPayload = await fetchPublicBlogPosts(1, 6);
        return {
          blogPosts: blogPayload.posts,
        };
      }

      const blogPostPayload = await fetchPublicBlogPost(slug);
      if (!blogPostPayload.post) {
        return {
          routeOverride: {
            siteTitle: `Article Not Found | ${platformName}`,
            metaDescription: `The blog article you requested could not be found on ${platformName}.`,
            robotsDirective: "noindex, nofollow",
          },
        };
      }

      return {
        routeOverride: {
          siteTitle: blogPostPayload.post.metaTitle || `${blogPostPayload.post.title} | ${platformName} Blog`,
          metaDescription: blogPostPayload.post.metaDescription,
          metaKeywords: blogPostPayload.post.categories.map((category) => category.name).join(", "),
          robotsDirective: "index, follow",
        },
        blogPost: blogPostPayload.post,
        blogPosts: await fetchAllPublishedBlogPostsForSeo(),
      };
    }

    if (!pathname.startsWith("/tournaments/")) {
      return null;
    }

    const slug = pathname.slice("/tournaments/".length).trim();
    if (!slug) {
      const tournaments = await fetchPublicTournaments();
      return {
        routeOverride: buildTournamentListingSeo(platformName),
        tournaments: tournaments
          .filter((tournament) => tournament.status !== "cancelled")
          .map((tournament) => toTournamentStructuredData(tournament)),
      };
    }

    const tournament = await findPublicTournamentBySlug(slug);
    if (!tournament) {
      return {
        routeOverride: buildTournamentNotFoundSeo(platformName),
      };
    }

    return {
      routeOverride: buildTournamentDetailSeo(tournament, platformName),
      tournament: toTournamentStructuredData(tournament),
    };
  } catch (error) {
    console.warn("Dynamic SEO context failed. Falling back to static metadata.", error);
    return null;
  }
};
