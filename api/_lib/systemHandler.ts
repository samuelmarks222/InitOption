import { buildRequestUrl, buildSeoPayload, fetchPlatformSettings } from "./platformSettings.js";
import { fetchAllPublishedBlogPostsForSeo, fetchPublicBlogSitemapEntries } from "./blog.js";
import { fetchPublicTournaments } from "./publicTournaments.js";
import { readJsonRequestBody } from "./sasapay.js";
import { getSupabaseAdminClient, getSupabaseUserClient } from "./supabaseAdmin.js";
import { buildTournamentPath } from "../../src/lib/publicTournaments.js";
import { getHeaderValue } from "../../src/lib/cryptoWebhook.js";
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

type AdminAuthUser = {
  created_at?: string;
  email?: string | null;
  id: string;
  user_metadata?: Record<string, unknown> | null;
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

const resolveSignupBaseUrl = (request: ApiRequest) => {
  const configuredUrl = process.env.APP_BASE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  const proto = getHeaderValue(request.headers ?? {}, "x-forwarded-proto") || "https";
  const host = getHeaderValue(request.headers ?? {}, "x-forwarded-host") || getHeaderValue(request.headers ?? {}, "host");
  return host ? `${proto}://${host.replace(/\/+$/, "")}` : "http://localhost:3000";
};

const parseBearerToken = (authorizationHeader: string) => {
  const trimmed = authorizationHeader.trim();
  if (!trimmed) return null;

  const [scheme, token] = trimmed.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
};

const isSupportedKycStatus = (value: string | null): value is SupportedKycStatus =>
  value === "Pending" || value === "Verified" || value === "Rejected";

const deriveProfileIdentity = (authUser: AdminAuthUser) => {
  const metadata = asObjectRecord(authUser.user_metadata);
  const emailFallback = asString(authUser.email)?.split("@")[0] ?? `user_${authUser.id.slice(0, 8)}`;
  const username =
    asString(metadata.username) ??
    asString(metadata.display_name) ??
    asString(metadata.full_name) ??
    asString(metadata.name) ??
    emailFallback;
  const displayName =
    asString(metadata.display_name) ??
    asString(metadata.full_name) ??
    asString(metadata.name) ??
    username;

  return { displayName, username };
};

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

const hasAnyKycDocument = (documents: ReturnType<typeof normalizeKycDocuments>) =>
  Boolean(documents.front?.url || documents.back?.url);

const listAllAuthUsers = async (adminClient: ReturnType<typeof getSupabaseAdminClient>) => {
  const users: AdminAuthUser[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const response = await adminClient.auth.admin.listUsers({ page, perPage });

    if (response.error) {
      throw response.error;
    }

    const batch = (response.data.users ?? []) as AdminAuthUser[];
    const nextPage = "nextPage" in response.data ? response.data.nextPage : null;
    users.push(...batch);

    if (!nextPage || batch.length < perPage) {
      break;
    }

    page = nextPage;
  }

  return users;
};

const recoverKycDocumentsFromStorage = async (
  adminClient: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  currentDocuments: ReturnType<typeof normalizeKycDocuments>,
) => {
  if (hasAnyKycDocument(currentDocuments)) {
    return currentDocuments;
  }

  try {
    const storageResponse = await adminClient.storage.from("branding").list(`kyc/${userId}`, {
      limit: 100,
    });

    if (storageResponse.error) {
      return currentDocuments;
    }

    const recoveredDocuments = {
      ...currentDocuments,
    };

    const files = [...(storageResponse.data ?? [])].sort((left, right) => {
      const leftTime = new Date(left.updated_at ?? left.created_at ?? 0).getTime();
      const rightTime = new Date(right.updated_at ?? right.created_at ?? 0).getTime();
      return rightTime - leftTime;
    });

    for (const file of files) {
      const fileName = asString(file.name);

      if (!fileName) {
        continue;
      }

      const normalizedFileName = fileName.toLowerCase();
      const slot = normalizedFileName.startsWith("front_")
        ? "front"
        : normalizedFileName.startsWith("back_")
          ? "back"
          : null;

      if (!slot || recoveredDocuments[slot]?.url) {
        continue;
      }

      const path = `kyc/${userId}/${fileName}`;
      const publicUrl = adminClient.storage.from("branding").getPublicUrl(path).data.publicUrl;
      const fileMetadata = asObjectRecord((file as unknown as Record<string, unknown>).metadata);

      recoveredDocuments[slot] = {
        fallback: false,
        mimeType: asString(fileMetadata.mimetype) ?? guessMimeTypeFromFilename(fileName),
        name: fileName,
        path,
        uploadedAt: asString(file.updated_at) ?? asString(file.created_at) ?? new Date().toISOString(),
        url: publicUrl,
      };
    }

    return recoveredDocuments;
  } catch (error) {
    console.error(`Failed to inspect KYC storage for user ${userId}`, error);
    return currentDocuments;
  }
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
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("deposit_bonus_offers")
      .select("bonus_percent")
      .eq("status", "active")
      .order("bonus_percent", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    response.status(200).json({
      depositBonusEnabled: Boolean(data),
      depositBonusPercent: Number(data?.bonus_percent ?? DEFAULT_PUBLIC_BONUS_PAYLOAD.depositBonusPercent),
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

const sendViaResend = async ({
  from,
  html,
  subject,
  text,
  to,
}: {
  from: string;
  html: string;
  subject: string;
  text: string;
  to: string;
}) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      html,
      subject,
      text,
      to: [to],
    }),
  });

  if (!resendResponse.ok) {
    const errorBody = await resendResponse.text();
    throw new Error(`Resend API returned ${resendResponse.status}: ${errorBody}`);
  }
};

const buildSignupConfirmationEmail = ({
  actionLink,
  email,
  platformName,
  supportEmail,
}: {
  actionLink: string;
  email: string;
  platformName: string;
  supportEmail: string;
}) => {
  const safeActionLink = escapeHtml(actionLink);
  const safeEmail = escapeHtml(email);
  const safePlatformName = escapeHtml(platformName);
  const safeSupportEmail = escapeHtml(supportEmail);
  const subject = `Confirm your ${platformName} email`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;">
            <tr>
              <td style="padding:28px 28px 10px 28px;">
                <div style="font-size:18px;font-weight:700;color:#111827;">${safePlatformName}</div>
                <h1 style="margin:22px 0 0 0;font-size:24px;line-height:1.25;color:#111827;">Confirm your email</h1>
                <p style="margin:12px 0 0 0;font-size:15px;line-height:1.7;color:#4b5563;">
                  You used <strong>${safeEmail}</strong> to create an account. Click the button below to activate your account.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 8px 28px;">
                <a href="${safeActionLink}" style="display:inline-block;border-radius:10px;background:#10b981;padding:13px 18px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                  Confirm email
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 26px 28px;">
                <p style="margin:0;font-size:13px;line-height:1.7;color:#6b7280;">
                  If the button does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:8px 0 0 0;font-size:12px;line-height:1.6;word-break:break-all;color:#2563eb;">
                  ${safeActionLink}
                </p>
                <p style="margin:18px 0 0 0;font-size:12px;line-height:1.7;color:#9ca3af;">
                  If you did not create this account, you can ignore this email. Need help? Contact ${safeSupportEmail}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `${platformName} - Confirm your email`,
    "",
    `You used ${email} to create an account.`,
    "Open this link to activate your account:",
    actionLink,
    "",
    `If you did not create this account, ignore this email. Need help? Contact ${supportEmail}.`,
  ].join("\n");

  return { html, subject, text };
};

const handleAuthSignup = async (request: ApiRequest, response: ApiResponse) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, max-age=0");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const emailFromAddress = process.env.EMAIL_FROM_ADDRESS?.trim();
  if (!emailFromAddress || !process.env.RESEND_API_KEY?.trim()) {
    response.status(501).json({
      code: "custom_email_unavailable",
      error: "Custom signup email is not configured.",
    });
    return;
  }

  const body = (await readJsonRequestBody(request as never)) as SignupPayload;
  const email = normalizeEmail(body.email);
  const password = asString(body.password) ?? "";
  const username = asString(body.username) ?? email.split("@")[0] ?? "trader";
  const referredByCode = (asString(body.referredByCode) ?? "").toUpperCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ error: "Enter a valid email address." });
    return;
  }

  if (password.length < 6) {
    response.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  const [adminClient, platformSettings] = [getSupabaseAdminClient() as any, await fetchPlatformSettings()];
  const platformName = platformSettings.platform_name || DEFAULT_PLATFORM_NAME;
  const supportEmail = platformSettings.support_email || DEFAULT_SUPPORT_EMAIL;
  const redirectTo = `${resolveSignupBaseUrl(request)}/auth/callback?next=${encodeURIComponent("/trade")}`;

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: {
        username,
        referred_by_code: referredByCode || undefined,
      },
      redirectTo,
    },
  });

  if (error) {
    const message = typeof error.message === "string" ? error.message : "Could not create account.";
    const alreadyRegistered = /already|registered|exists/i.test(message);
    response.status(alreadyRegistered ? 409 : 400).json({
      error: alreadyRegistered ? "This email is already registered. Please sign in instead." : message,
    });
    return;
  }

  const actionLink = asString(data?.properties?.action_link);
  if (!actionLink) {
    throw new Error("Supabase did not return a confirmation link.");
  }

  const emailContent = buildSignupConfirmationEmail({
    actionLink,
    email,
    platformName,
    supportEmail,
  });

  await sendViaResend({
    from: emailFromAddress,
    to: email,
    ...emailContent,
  });

  response.status(200).json({
    email,
    status: "confirmation_sent",
  });
};

const requireKycReviewer = async (accessToken: string) => {
  const userClient = getSupabaseUserClient(accessToken);
  const authResponse = await userClient.auth.getUser();

  if (authResponse.error || !authResponse.data.user?.id) {
    throw new Error("Invalid authentication token.");
  }

  const reviewerId = authResponse.data.user.id;
  const rolesResponse = await userClient.from("user_roles").select("role").eq("user_id", reviewerId);

  if (rolesResponse.error) {
    throw rolesResponse.error;
  }

  const roles = new Set((rolesResponse.data ?? []).map((row) => row.role));

  if (!roles.has("admin") && !roles.has("support_agent") && !roles.has("finance_manager")) {
    throw new Error("Only support, finance, or super admin staff can review KYC.");
  }
};

const notifyKycStatusChange = async ({
  adminClient,
  adminNote,
  status,
  userId,
}: {
  adminClient: ReturnType<typeof getSupabaseAdminClient>;
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
    await adminClient.rpc("create_notification_internal", {
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
  const authHeader = getHeaderValue(request.headers ?? {}, "authorization");
  const accessToken = parseBearerToken(authHeader);

  if (!accessToken) {
    response.status(401).json({ error: "Missing Bearer token." });
    return;
  }

  if (!userId || !isSupportedKycStatus(status)) {
    response.status(400).json({ error: "userId and a valid KYC status are required." });
    return;
  }

  await requireKycReviewer(accessToken);

  const adminClient = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const profileResponse = await adminClient
    .from("profiles")
    .select("id, kyc_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileResponse.error) {
    throw profileResponse.error;
  }

  if (!profileResponse.data) {
    throw new Error("User profile not found.");
  }

  const updateResponse = await adminClient
    .from("profiles")
    .update({
      kyc_status: status,
      updated_at: now,
    } as never)
    .eq("id", userId)
    .select("id, kyc_status")
    .maybeSingle();

  if (updateResponse.error) {
    throw updateResponse.error;
  }

  if (!updateResponse.data) {
    throw new Error("KYC review could not be saved. Refresh and try again.");
  }

  await notifyKycStatusChange({
    adminClient,
    adminNote,
    status,
    userId,
  });

  response.status(200).json({
    status: updateResponse.data.kyc_status,
    user_id: updateResponse.data.id,
  });
};

const handleAdminUsers = async (request: ApiRequest, response: ApiResponse) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authHeader = getHeaderValue(request.headers ?? {}, "authorization");
  const accessToken = parseBearerToken(authHeader);

  if (!accessToken) {
    response.status(401).json({ error: "Missing Bearer token." });
    return;
  }

  await requireKycReviewer(accessToken);

  const adminClient = getSupabaseAdminClient();
  const profilesResponse = await adminClient
    .from("profiles")
    .select(
      "id, username, display_name, balance, total_trades, total_wins, total_profit, created_at, total_deposit, total_trade_volume_30d, trade_count_30d, vip_tier_override, kyc_status, kyc_documents",
    )
    .order("created_at", { ascending: false })
    .limit(250);

  if (profilesResponse.error) {
    throw profilesResponse.error;
  }

  const users: AdminUserFeedItem[] = (profilesResponse.data ?? []).map((profile) => {
    const storedDocuments = normalizeKycDocuments(profile.kyc_documents);

    return {
      balance: Number(profile.balance ?? 0),
      currentTier: profile.vip_tier_override ?? "standard",
      id: profile.id,
      kycDocuments: storedDocuments,
      kycStatus: ((profile.kyc_status as SupportedKycStatus | null) ?? "Pending") as SupportedKycStatus,
      manualOverride: profile.vip_tier_override ?? null,
      name: profile.display_name || profile.username || "Unnamed user",
      registrationDate: profile.created_at
        ? new Date(profile.created_at).toLocaleDateString("en-GB")
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
