import { buildRequestUrl, buildSeoPayload, fetchPlatformSettings } from "./platformSettings.js";
import { fetchAllPublishedBlogPostsForSeo, fetchPublicBlogSitemapEntries } from "./blog.js";
import { fetchPublicTournaments } from "./publicTournaments.js";
import { readJsonRequestBody } from "./sasapay.js";
import { query, queryOne, rpc } from "./db.js";
import { authenticateRequest, clerkUserIdToUuid } from "./clerkWebhook.js";
import { buildTournamentPath } from "../../src/lib/publicTournaments.js";
import {
  DEFAULT_FAVICON_PATH,
  DEFAULT_SHARE_IMAGE_PATH,
  resolveBrandAssetUrl,
} from "../../src/lib/platformMetadataShared.js";
import { getSitemapEntries } from "../../src/lib/routeSeo.js";

type ApiRequest = {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  end: (body?: string) => void;
  json: (body: unknown) => void;
  send: (body: string) => void;
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => ApiResponse;
};

type KycReviewPayload = {
  adminNote?: string | null;
  status?: string;
  userId?: string;
};

type SignupPayload = {
  email?: unknown;
  password?: unknown;
  referredByCode?: unknown;
  username?: unknown;
};

type AdminUserFeedItem = {
  balance: number;
  currentTier: string;
  id: string;
  kycDocuments: Record<string, unknown>;
  kycStatus: SupportedKycStatus;
  manualOverride: string | null;
  name: string;
  registrationDate: string;
  totalDeposit: number;
  totalProfit: number;
  totalTrades: number;
  totalWins: number;
  trades30d: number;
  username: string;
  volume30d: number;
};

type SupportedKycStatus = "Pending" | "Verified" | "Rejected";

const DEFAULT_PUBLIC_BONUS_PAYLOAD = {
  depositBonusEnabled: true,
  depositBonusPercent: 70,
};
const DEFAULT_PLATFORM_NAME = "Init Option";
const DEFAULT_SUPPORT_EMAIL = "support@initoption.com";

const getQueryString = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const asString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const asObjectRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeEmail = (value: unknown) => (asString(value) ?? "").toLowerCase();

const isSupportedKycStatus = (value: string | null): value is SupportedKycStatus =>
  value === "Pending" || value === "Verified" || value === "Rejected";

const guessMimeTypeFromFilename = (fileName: string | null) => {
  const normalized = (fileName ?? "").trim().toLowerCase();

  if (normalized.endsWith(".pdf")) return "application/pdf";
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
  if (normalized.endsWith(".webp")) return "image/webp";

  return "application/octet-stream";
};

const normalizeKycDocuments = (value: unknown) => {
  const source = asObjectRecord(value);

  const normalizeDocument = (slot: "front" | "back") => {
    const item = asObjectRecord(source[slot]);
    const url = asString(item.url);

    if (!url) {
      return null;
    }

    return {
      fallback: Boolean(item.fallback),
      mimeType: asString(item.mimeType) ?? guessMimeTypeFromFilename(asString(item.name)),
      name: asString(item.name) ?? `${slot} document`,
      path: asString(item.path) ?? undefined,
      uploadedAt: asString(item.uploadedAt) ?? new Date().toISOString(),
      url,
    };
  };

  return {
    back: normalizeDocument("back"),
    front: normalizeDocument("front"),
  };
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

const buildManifest = async (request: ApiRequest) => {
  const settings = await fetchPlatformSettings();
  const currentHref = buildRequestUrl(request);
  const iconUrl =
    resolveBrandAssetUrl(settings.favicon_url || "", currentHref) ||
    resolveBrandAssetUrl(settings.logo_url || "", currentHref) ||
    resolveBrandAssetUrl(DEFAULT_FAVICON_PATH, currentHref);
  const maskableIconUrl =
    resolveBrandAssetUrl(settings.logo_url || "", currentHref) ||
    resolveBrandAssetUrl(DEFAULT_SHARE_IMAGE_PATH, currentHref) ||
    iconUrl;

  return {
    name: settings.platform_name || "Init Option",
    short_name: settings.platform_name || "Init Option",
    description:
      settings.meta_description?.trim() ||
      "Init Option is a modern trading platform with real-time charts, instant demo access, and fast web and mobile execution.",
    id: "/",
    lang: "en-US",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    background_color: settings.chart_bg_color || "#0E1217",
    theme_color: settings.chart_bg_color || "#0E1217",
    icons: iconUrl
      ? [
          {
            src: iconUrl,
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: maskableIconUrl,
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ]
      : [],
  };
};

const handlePublicBonus = async (request: ApiRequest, response: ApiResponse) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, max-age=0");

  if (request.method === "HEAD") {
    response.status(200);
    response.end();
    return;
  }

  try {
    const bonusRow = await queryOne(
      "select bonus_percent from deposit_bonus_offers where status = $1 order by bonus_percent desc limit 1",
      ["active"],
    );

    response.status(200).json({
      depositBonusEnabled: Boolean(bonusRow),
      depositBonusPercent: Number(bonusRow?.bonus_percent ?? DEFAULT_PUBLIC_BONUS_PAYLOAD.depositBonusPercent),
    });
  } catch (error) {
    console.error("Failed to read public bonus settings", error);
    response.status(200).json(DEFAULT_PUBLIC_BONUS_PAYLOAD);
  }
};

const handleRobots = async (request: ApiRequest, response: ApiResponse) => {
  const siteOrigin = await resolveSiteOrigin(request);
  const body = [
    "User-agent: *",
    "Allow: /",
    "Allow: /api/blog/",
    "Allow: /api/blog",
    "Disallow: /admin/",
    "Disallow: /api/",
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
};

const handleSitemap = async (request: ApiRequest, response: ApiResponse) => {
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
  const blogEntries = await fetchPublicBlogSitemapEntries();
  const urls = getSitemapEntries(siteOrigin, [...tournamentEntries, ...blogEntries])
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
};

const handleRss = async (request: ApiRequest, response: ApiResponse) => {
  const siteOrigin = await resolveSiteOrigin(request);
  const posts = await fetchAllPublishedBlogPostsForSeo();
  const xmlEscape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const items = posts
    .map(
      (post) => `  <item>
    <title>${xmlEscape(post.title)}</title>
    <link>${siteOrigin}/blog/${xmlEscape(post.slug)}</link>
    <guid>${siteOrigin}/blog/${xmlEscape(post.slug)}</guid>
    <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
    <description>${xmlEscape(post.metaDescription || post.excerpt)}</description>
  </item>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Init Option Blog</title>
  <link>${siteOrigin}/blog</link>
  <description>Trading strategies, platform updates, tournament results, and funding guides from Init Option.</description>
  <language>en-us</language>
${items}
</channel>
</rss>`;

  response.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  if (request.method === "HEAD") {
    response.status(200);
    response.end();
    return;
  }

  response.status(200).send(body);
};

const handleManifest = async (request: ApiRequest, response: ApiResponse) => {
  const body = JSON.stringify(await buildManifest(request));

  response.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  response.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  if (request.method === "HEAD") {
    response.status(200);
    response.end();
    return;
  }

  response.status(200).send(body);
};

const handleSeo = async (request: ApiRequest, response: ApiResponse) => {
  const payload = await buildSeoPayload(request);

  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, max-age=0");

  if (request.method === "HEAD") {
    response.status(200);
    response.end();
    return;
  }

  response.status(200).json(payload);
};

const handleAuthSignup = async (request: ApiRequest, response: ApiResponse) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, max-age=0");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const body = (await readJsonRequestBody(request as never)) as SignupPayload;
  const email = normalizeEmail(body.email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ error: "Enter a valid email address." });
    return;
  }

  // Account creation now happens through Clerk (see AuthContext.signUp).
  // Return the standard "custom email unavailable" code so the client
  // falls back to the Clerk sign-up flow instead of the legacy Supabase Auth path.
  response.status(501).json({
    code: "custom_email_unavailable",
    error: "Custom signup email is not configured. Using the default sign-up flow.",
  });
};

const requireKycReviewer = async (clerkUserId: string) => {
  const reviewerId = clerkUserIdToUuid(clerkUserId);
  const roleRows = await query("select role from user_roles where user_id = $1", [reviewerId]);
  const roles = new Set((roleRows ?? []).map((row) => String(row.role)));

  if (!roles.has("admin") && !roles.has("support_agent") && !roles.has("finance_manager")) {
    throw new Error("Only support, finance, or super admin staff can review KYC.");
  }
};

const notifyKycStatusChange = async ({
  adminNote,
  status,
  userId,
}: {
  adminNote: string | null;
  status: SupportedKycStatus;
  userId: string;
}) => {
  if (status === "Pending") return;

  const notificationType = status === "Verified" ? "kyc_approved" : "kyc_rejected";
  const title = status === "Verified" ? "Verification approved" : "Verification rejected";
  const message =
    status === "Verified"
      ? "Your verification documents were approved. Your account is now verified."
      : `Your verification was rejected.${adminNote ? ` ${adminNote}` : " Please upload clearer documents and try again."}`;

  try {
    await rpc("create_notification_internal", {
      p_data: {
        admin_note: adminNote,
        kyc_status: status,
      },
      p_external_key: `kyc_status:${userId}:${status.toLowerCase()}`,
      p_link_url: "/trade",
      p_message: message,
      p_title: title,
      p_type: notificationType,
      p_user_id: userId,
    });
  } catch (error) {
    console.error("KYC notification failed", error);
  }
};

const handleAdminReviewKyc = async (request: ApiRequest, response: ApiResponse) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = (await readJsonRequestBody(request as never)) as KycReviewPayload;
  const userId = asString(body.userId);
  const status = asString(body.status);
  const adminNote = asString(body.adminNote);

  const clerkUserId = await authenticateRequest(request.headers);
  if (!clerkUserId) {
    response.status(401).json({ error: "Missing or invalid Bearer token." });
    return;
  }

  if (!userId || !isSupportedKycStatus(status)) {
    response.status(400).json({ error: "userId and a valid KYC status are required." });
    return;
  }

  await requireKycReviewer(clerkUserId);

  const targetUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    ? userId
    : clerkUserIdToUuid(userId);

  const profileRow = await queryOne(
    "select id, kyc_status from profiles where id = $1",
    [targetUserId],
  ) as { id: string; kyc_status: string | null } | null;

  if (!profileRow) {
    throw new Error("User profile not found.");
  }

  const now = new Date().toISOString();
  const updatedRow = await queryOne(
    "update profiles set kyc_status = $1, updated_at = $2 where id = $3 returning id, kyc_status",
    [status, now, targetUserId],
  ) as { id: string; kyc_status: string | null } | null;

  if (!updatedRow) {
    throw new Error("KYC review could not be saved. Refresh and try again.");
  }

  await notifyKycStatusChange({
    adminNote,
    status,
    userId: targetUserId,
  });

  response.status(200).json({
    status: updatedRow.kyc_status,
    user_id: updatedRow.id,
  });
};

const handleAdminUsers = async (request: ApiRequest, response: ApiResponse) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const clerkUserId = await authenticateRequest(request.headers);
  if (!clerkUserId) {
    response.status(401).json({ error: "Missing or invalid Bearer token." });
    return;
  }

  await requireKycReviewer(clerkUserId);

  const profileRows = await query(
    `select id, username, display_name, balance, total_trades, total_wins, total_profit,
            created_at, total_deposit, total_trade_volume_30d, trade_count_30d,
            vip_tier_override, kyc_status, kyc_documents
       from profiles
      order by created_at desc
      limit 250`,
  ) as Array<{
    balance: unknown;
    created_at: unknown;
    display_name: string | null;
    id: string;
    kyc_documents: unknown;
    kyc_status: string | null;
    total_deposit: unknown;
    total_profit: unknown;
    total_trade_volume_30d: unknown;
    total_trades: unknown;
    total_wins: unknown;
    trade_count_30d: unknown;
    username: string | null;
    vip_tier_override: string | null;
  }>;

  const users: AdminUserFeedItem[] = (profileRows ?? []).map((profile) => {
    const storedDocuments = normalizeKycDocuments(profile.kyc_documents);

    return {
      balance: Number(profile.balance ?? 0),
      currentTier: profile.vip_tier_override ?? (
        Number(profile.balance ?? 0) >= 10000 && Number(profile.total_trades ?? 0) >= 50 ? "vip" :
        Number(profile.balance ?? 0) >= 5000 && Number(profile.total_trades ?? 0) >= 10 ? "pro" :
        "standard"
      ),
      id: profile.id,
      kycDocuments: storedDocuments,
      kycStatus: ((profile.kyc_status as SupportedKycStatus | null) ?? "Pending") as SupportedKycStatus,
      manualOverride: profile.vip_tier_override ?? null,
      name: profile.display_name || profile.username || "Unnamed user",
      registrationDate: profile.created_at
        ? new Date(profile.created_at as string).toLocaleDateString("en-GB")
        : "-",
      totalDeposit: Number(profile.total_deposit ?? 0),
      totalProfit: Number(profile.total_profit ?? 0),
      totalTrades: Number(profile.total_trades ?? 0),
      totalWins: Number(profile.total_wins ?? 0),
      trades30d: Number(profile.trade_count_30d ?? 0),
      username: profile.username || profile.id.slice(0, 8),
      volume30d: Number(profile.total_trade_volume_30d ?? 0),
    };
  });

  response.status(200).json({ users });
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const resource = getQueryString(request.query?.resource).trim().toLowerCase();

  try {
    switch (resource) {
      case "admin-users":
        await handleAdminUsers(request, response);
        return;
      case "admin-review-kyc":
        await handleAdminReviewKyc(request, response);
        return;
      case "auth-signup":
        await handleAuthSignup(request, response);
        return;
      case "public-bonus":
        await handlePublicBonus(request, response);
        return;
      case "robots":
        await handleRobots(request, response);
        return;
      case "rss":
        await handleRss(request, response);
        return;
      case "seo":
        await handleSeo(request, response);
        return;
      case "sitemap":
        await handleSitemap(request, response);
        return;
      case "site.webmanifest":
        await handleManifest(request, response);
        return;
      default:
        response.status(404).json({ error: "Not found." });
    }
  } catch (error) {
    console.error(`Failed to render system resource: ${resource}`, error);
    if (resource === "robots") {
      response.status(500).send("Failed to render robots.txt");
      return;
    }
    if (resource === "rss") {
      response.status(500).send("Failed to render rss.xml");
      return;
    }
    if (resource === "seo") {
      response.status(500).json({ error: "Failed to read SEO settings." });
      return;
    }
    if (resource === "sitemap") {
      response.status(500).send("Failed to render sitemap.xml");
      return;
    }
    if (resource === "site.webmanifest") {
      response.status(500).send("Failed to render site.webmanifest");
      return;
    }

    response.status(500).json({ error: "Failed to load system resource." });
  }
}
