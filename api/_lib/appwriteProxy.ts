import type { IncomingMessage, ServerResponse } from "node:http";

type ProxyRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ProxyResponse = ServerResponse<IncomingMessage>;

const APPWRITE_TARGET = (process.env.APPWRITE_PROXY_TARGET || "https://nyc.cloud.appwrite.io/v1")
  .replace(/\/v1\/?$/i, "")
  .replace(/\/+$/, "");

const FORWARDED_HEADER_DENYLIST = new Set([
  "host",
  "content-length",
  "connection",
  "transfer-encoding",
  "accept-encoding",
  "keep-alive",
  "upgrade",
  "proxy-connection",
  "x-vercel",
]);

const RESPONSE_HEADER_DENYLIST = new Set([
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-headers",
  "access-control-allow-methods",
  "access-control-expose-headers",
]);

const readBody = async (request: ProxyRequest): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const stripDomainFromSetCookie = (setCookie: string): string => {
  const parts = setCookie.split(";").map((part) => part.trim());
  const kept = parts.filter((part) => !/^domain=/i.test(part));
  return kept.join("; ");
};

const rewriteRedirectUri = (location: string): string => {
  try {
    const url = new URL(location);
    const isGoogle =
      url.hostname === "accounts.google.com" ||
      url.hostname.endsWith(".google.com") ||
      url.hostname.endsWith(".googleapis.com");
    if (isGoogle) {
      const redirectUri = url.searchParams.get("redirect_uri") || "";
      if (redirectUri.includes("nyc.cloud.appwrite.io/v1")) {
        const newUri = redirectUri.replace(
          "https://nyc.cloud.appwrite.io/v1",
          "https://www.initoption.com/api/appwrite/v1",
        );
        url.searchParams.set("redirect_uri", newUri);
      }
      return url.toString();
    }
    if (url.hostname === "nyc.cloud.appwrite.io" && url.pathname.startsWith("/v1")) {
      return location.replace(
        "https://nyc.cloud.appwrite.io/v1",
        "https://www.initoption.com/api/appwrite/v1",
      );
    }
    return location;
  } catch {
    return location;
  }
};

const buildUpstreamQuery = (request: ProxyRequest): string => {
  const query = request.query || {};
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key.toLowerCase() === "upstream") continue;
    if (key.toLowerCase() === "route") continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else if (value != null) {
      params.append(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

const buildUpstreamUrl = (request: ProxyRequest): string => {
  const upstream = (request.query?.upstream as string) || "";
  const upstreamPath = upstream.startsWith("/") ? upstream : `/${upstream}`;
  return `${APPWRITE_TARGET}${upstreamPath}${buildUpstreamQuery(request)}`;
};

export const handleAppwriteProxy = async (request: ProxyRequest, response: ProxyResponse) => {
  try {
    const upstreamUrl = buildUpstreamUrl(request);
    const method = (request.method || "GET").toUpperCase();

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
      if (!value) continue;
      if (FORWARDED_HEADER_DENYLIST.has(key.toLowerCase())) continue;
      headers[key] = Array.isArray(value) ? value.join(", ") : value;
    }

    let body: Buffer | undefined;
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      body = await readBody(request);
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers,
      body: body && body.length > 0 ? body : undefined,
      redirect: "manual",
    });

    response.statusCode = upstreamResponse.status;

    const setCookies: string[] = [];
    upstreamResponse.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === "set-cookie") {
        setCookies.push(value);
        return;
      }
      if (RESPONSE_HEADER_DENYLIST.has(lower)) return;
      response.setHeader(key, value);
    });

    for (const setCookie of setCookies) {
      response.appendHeader("Set-Cookie", stripDomainFromSetCookie(setCookie));
    }

    if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
      const location = upstreamResponse.headers.get("location");
      if (location) {
        response.setHeader("Location", rewriteRedirectUri(location));
      }
      response.end();
      return;
    }

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    response.end(buffer);
  } catch (error) {
    console.error("appwrite proxy failed", error);
    if (!response.headersSent) {
      response.statusCode = 502;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    response.end(JSON.stringify({ error: "Appwrite proxy upstream error" }));
  }
};
