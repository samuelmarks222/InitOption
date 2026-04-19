import { buildRequestUrl, fetchPlatformSettings } from "./_lib/platformSettings.js";
import { fetchPublicTournaments } from "./_lib/publicTournaments.js";
import { buildTournamentPath } from "../src/lib/publicTournaments.js";
import { getSitemapEntries } from "../src/lib/routeSeo.js";

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
    const lastModified = new Date().toISOString();
    const tournaments = await fetchPublicTournaments();
    const tournamentEntries = tournaments
      .filter((tournament) => tournament.status !== "cancelled")
      .map((tournament) => ({
        path: buildTournamentPath(tournament),
        changefreq: tournament.status === "active" ? "daily" : "weekly",
        priority: tournament.status === "upcoming" || tournament.status === "active" ? "0.8" : "0.7",
      }));
    const urls = getSitemapEntries(siteOrigin, tournamentEntries)
      .map(
        (entry) => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
      )
      .join("\n");

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    response.setHeader("Content-Type", "application/xml; charset=utf-8");
    response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

    if (request.method === "HEAD") {
      response.status(200);
      response.end();
      return;
    }

    response.status(200).send(body);
  } catch (error) {
    console.error("Failed to render sitemap.xml", error);
    response.status(500).send("Failed to render sitemap.xml");
  }
}
