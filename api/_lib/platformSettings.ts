import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_PLATFORM_SETTINGS,
  normalizePlatformSettings,
  resolveSeoMetadata,
  type PlatformSettingsRecord,
} from "../../src/lib/platformMetadataShared.ts";
import { injectPlatformMetadataIntoHtml } from "../../src/lib/serverPlatformMetadata.ts";

type RequestHeaderValue = string | string[] | undefined;

type ApiRequestLike = {
  headers?: Record<string, RequestHeaderValue>;
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

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

const getSupabaseConfig = () => {
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

  const response = await fetch(endpoint, {
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
};

export const buildRequestUrl = (request: ApiRequestLike) => {
  const forwardedProto = getHeaderValue(request.headers, "x-forwarded-proto") || "https";
  const forwardedHost =
    getHeaderValue(request.headers, "x-forwarded-host") || getHeaderValue(request.headers, "host") || "localhost";
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

let cachedHtmlTemplate: string | null = null;

export const loadHtmlTemplate = async () => {
  if (cachedHtmlTemplate) return cachedHtmlTemplate;

  const candidatePaths = [path.join(process.cwd(), "dist", "index.html"), path.join(process.cwd(), "index.html")];

  for (const candidatePath of candidatePaths) {
    try {
      cachedHtmlTemplate = await readFile(candidatePath, "utf8");
      return cachedHtmlTemplate;
    } catch {
      // Try the next candidate path.
    }
  }

  throw new Error("Unable to locate an HTML template for SEO injection.");
};

export const renderSeoHtml = async (request: ApiRequestLike) => {
  const [htmlTemplate, platformSettings] = await Promise.all([loadHtmlTemplate(), fetchPlatformSettings()]);
  const currentHref = buildRequestUrl(request);

  return injectPlatformMetadataIntoHtml(htmlTemplate, platformSettings, currentHref);
};

export const buildSeoPayload = async (request: ApiRequestLike) => {
  const settings = await fetchPlatformSettings();
  const currentHref = buildRequestUrl(request);

  return {
    resolved: resolveSeoMetadata(settings, currentHref),
    settings,
  };
};
