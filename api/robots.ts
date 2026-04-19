import { buildRequestUrl, fetchPlatformSettings } from "./_lib/platformSettings.js";

type ApiRequest = {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  end: (body?: string) => void;
  send: (body: string) => void;
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => ApiResponse;
};

const resolveSiteOrigin = async (request: ApiRequest) => {
  const settings = await fetchPlatformSettings();
  const fallbackHref = buildRequestUrl(request);

  try {
    return new URL(settings.canonical_url || fallbackHref).origin;
  } catch {
    return new URL(fallbackHref).origin;
  }
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const siteOrigin = await resolveSiteOrigin(request);
    const body = [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin/",
      "Disallow: /api/",
      "Disallow: /dashboard",
      "Disallow: /trade",
      "Disallow: /deposit",
      "Disallow: /withdraw",
      "Disallow: /settings",
      "Disallow: /notifications",
      "Disallow: /traders/",
      `Sitemap: ${siteOrigin}/sitemap.xml`,
    ].join("\n");

    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

    if (request.method === "HEAD") {
      response.status(200);
      response.end();
      return;
    }

    response.status(200).send(body);
  } catch (error) {
    console.error("Failed to render robots.txt", error);
    response.status(500).send("Failed to render robots.txt");
  }
}

