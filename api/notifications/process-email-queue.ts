import { query } from "../_lib/db.js";

type RequestHeaderValue = string | string[] | undefined;

type ApiRequest = {
  headers?: Record<string, RequestHeaderValue>;
  method?: string;
};

type ApiResponse = {
  end: (body?: string) => void;
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => ApiResponse;
};

type EmailDeliveryRow = {
  id: string;
  notification_id: string;
  notification_type: string;
  payload: Record<string, unknown> | null;
  recipient_email: string;
  retry_count: number;
  subject: string;
};

const MAX_ATTEMPTS = 6;
const STALE_PROCESSING_MINUTES = 15;
const DEFAULT_PLATFORM_NAME = "Init Option";
const DEFAULT_SUPPORT_EMAIL = "support@initoption.com";

const getHeaderValue = (headers: Record<string, RequestHeaderValue> | undefined, headerName: string) => {
  if (!headers) return "";

  const direct = headers[headerName];
  if (Array.isArray(direct)) return direct[0] ?? "";
  if (typeof direct === "string") return direct;

  const matchedKey = Object.keys(headers).find((key) => key.toLowerCase() === headerName.toLowerCase());
  if (!matchedKey) return "";

  const matchedValue = headers[matchedKey];
  if (Array.isArray(matchedValue)) return matchedValue[0] ?? "";
  return typeof matchedValue === "string" ? matchedValue : "";
};

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.status(statusCode).end(JSON.stringify(payload));
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getBaseUrl = (request: ApiRequest) => {
  const configuredUrl = process.env.APP_BASE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  const forwardedProto = getHeaderValue(request.headers, "x-forwarded-proto") || "https";
  const forwardedHost = getHeaderValue(request.headers, "x-forwarded-host") || getHeaderValue(request.headers, "host");
  return forwardedHost ? `${forwardedProto}://${forwardedHost.replace(/\/+$/, "")}` : "http://localhost:3000";
};

const normalizePath = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "/notifications";
  if (/^https?:\/\//i.test(value)) return value.trim();
  return value.startsWith("/") ? value : `/${value}`;
};

type AccentTheme = {
  label: string;
  heroStart: string;
  heroMid: string;
  heroEnd: string;
  border: string;
  button: string;
  buttonText: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  panelBg: string;
  panelBorder: string;
  panelText: string;
};

type HighlightEntry = {
  label: string;
  value: string;
};

const getAccentTheme = (notificationType: string): AccentTheme => {
  if (notificationType === "email_verification_code" || notificationType === "email_verified") {
    return {
      badgeBg: "#31240f",
      badgeBorder: "#ffb648",
      badgeText: "#fff1d7",
      border: "#7d5a1e",
      button: "#f59e0b",
      buttonText: "#0b1017",
      heroEnd: "#120d05",
      heroMid: "#35230d",
      heroStart: "#5a3710",
      label: "Email verification",
      panelBg: "#fff7ed",
      panelBorder: "#fed7aa",
      panelText: "#7c2d12",
    };
  }

  if (notificationType.startsWith("deposit") || notificationType.startsWith("withdrawal") || notificationType === "trade_result") {
    return {
      badgeBg: "#0f2740",
      badgeBorder: "#2a7ed8",
      badgeText: "#d9ecff",
      border: "#265787",
      button: "#2d8cff",
      buttonText: "#ffffff",
      heroEnd: "#08111c",
      heroMid: "#0e2440",
      heroStart: "#13385d",
      label: "Finance update",
      panelBg: "#eff6ff",
      panelBorder: "#bfdbfe",
      panelText: "#0f172a",
    };
  }

  if (notificationType.startsWith("tournament")) {
    return {
      badgeBg: "#1a2552",
      badgeBorder: "#6c8dff",
      badgeText: "#e3e9ff",
      border: "#3f57b4",
      button: "#5a78ff",
      buttonText: "#ffffff",
      heroEnd: "#090f20",
      heroMid: "#172a5b",
      heroStart: "#253876",
      label: "Tournament update",
      panelBg: "#eef2ff",
      panelBorder: "#c7d2fe",
      panelText: "#312e81",
    };
  }

  if (notificationType.startsWith("kyc")) {
    return {
      badgeBg: "#232d39",
      badgeBorder: "#77879b",
      badgeText: "#edf3ff",
      border: "#55657d",
      button: "#64748b",
      buttonText: "#ffffff",
      heroEnd: "#0c1116",
      heroMid: "#202833",
      heroStart: "#313d4d",
      label: "Security update",
      panelBg: "#f8fafc",
      panelBorder: "#cbd5e1",
      panelText: "#0f172a",
    };
  }

  if (
    notificationType === "welcome_bonus" ||
    notificationType === "deposit_bonus" ||
    notificationType === "promo_code_activated" ||
    notificationType === "referral_commission"
  ) {
    return {
      badgeBg: "#14301f",
      badgeBorder: "#2bb673",
      badgeText: "#ddfff0",
      border: "#2b7d59",
      button: "#1da85d",
      buttonText: "#ffffff",
      heroEnd: "#08140e",
      heroMid: "#103522",
      heroStart: "#165234",
      label: "Bonus update",
      panelBg: "#ecfdf5",
      panelBorder: "#a7f3d0",
      panelText: "#14532d",
    };
  }

  return {
    badgeBg: "#2f2414",
    badgeBorder: "#c9892d",
    badgeText: "#fff2db",
    border: "#7b6238",
    button: "#ea8a19",
    buttonText: "#ffffff",
    heroEnd: "#100d0a",
    heroMid: "#2b2013",
    heroStart: "#4b3117",
    label: "Platform update",
    panelBg: "#fff7ed",
    panelBorder: "#fdba74",
    panelText: "#7c2d12",
  };
};

const asRecord = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

const cleanText = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

const parseNumberish = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const formatCurrency = (value: unknown) => {
  const amount = parseNumberish(value);
  if (amount === null) return null;

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: Math.abs(amount % 1) < 0.001 ? 0 : 2,
    style: "currency",
  }).format(amount);
};

const formatNotificationType = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDirection = (value: unknown) => {
  const direction = cleanText(value);
  if (!direction) return null;
  if (direction.toLowerCase() === "higher") return "Higher";
  if (direction.toLowerCase() === "lower") return "Lower";
  if (direction.toLowerCase() === "call") return "Call";
  if (direction.toLowerCase() === "put") return "Put";
  return direction;
};

const formatPlacement = (value: unknown) => {
  const placement = parseNumberish(value);
  return placement === null ? null : `#${placement}`;
};

const shorten = (value: string | null, maxLength = 28) => {
  if (!value) return null;
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 3))}...` : value;
};

const pushHighlight = (entries: HighlightEntry[], label: string, value: string | null) => {
  if (!value) return;
  if (entries.some((entry) => entry.label === label && entry.value === value)) return;
  entries.push({ label, value });
};

const buildHighlights = (notificationType: string, payload: Record<string, unknown>) => {
  const highlights: HighlightEntry[] = [];

  if (notificationType === "email_verification_code") {
    const expiresInMinutes = parseNumberish(payload.verification_code_expires_in_minutes);
    pushHighlight(highlights, "Verification Code", cleanText(payload.verification_code));
    pushHighlight(highlights, "Email", cleanText(payload.email));
    pushHighlight(highlights, "Expires In", expiresInMinutes === null ? null : `${expiresInMinutes} minutes`);
  }

  if (notificationType === "email_verified") {
    pushHighlight(highlights, "Email", cleanText(payload.email));
    pushHighlight(highlights, "Status", "Verified");
  }

  if (notificationType.startsWith("deposit") || notificationType.startsWith("withdrawal")) {
    pushHighlight(highlights, "Amount", formatCurrency(payload.credited_amount ?? payload.amount));
    pushHighlight(highlights, "Method", cleanText(payload.method));
    pushHighlight(highlights, "Destination", shorten(cleanText(payload.destination), 24));
    pushHighlight(highlights, "Status", cleanText(payload.status));
  }

  if (notificationType === "trade_result") {
    pushHighlight(highlights, "Profit / Loss", formatCurrency(payload.profit));
    pushHighlight(highlights, "Market", cleanText(payload.asset_symbol));
    pushHighlight(highlights, "Direction", formatDirection(payload.direction));
    pushHighlight(highlights, "Stake", formatCurrency(payload.amount));
  }

  if (notificationType.startsWith("tournament")) {
    pushHighlight(highlights, "Tournament", shorten(cleanText(payload.tournament_title), 26));
    pushHighlight(highlights, "Prize", formatCurrency(payload.amount ?? payload.prize_pool));
    pushHighlight(highlights, "Placement", formatPlacement(payload.placement));
    pushHighlight(highlights, "Entry Fee", formatCurrency(payload.entry_fee));
  }

  if (
    notificationType === "welcome_bonus" ||
    notificationType === "deposit_bonus" ||
    notificationType === "promo_code_activated" ||
    notificationType === "referral_commission"
  ) {
    pushHighlight(highlights, "Amount", formatCurrency(payload.amount));
    pushHighlight(highlights, "Bonus Code", cleanText(payload.code));
    pushHighlight(highlights, "Method", cleanText(payload.method));
  }

  if (notificationType.startsWith("kyc")) {
    pushHighlight(highlights, "Verification", cleanText(payload.kyc_status)?.toUpperCase() ?? formatNotificationType(notificationType));
  }

  pushHighlight(highlights, "Reference", cleanText(payload.trade_id) ?? cleanText(payload.deposit_request_id) ?? cleanText(payload.withdrawal_request_id));
  pushHighlight(highlights, "Account", cleanText(payload.user_id));

  if (highlights.length === 0) {
    pushHighlight(highlights, "Notification Type", formatNotificationType(notificationType));
  }

  return highlights.slice(0, 4);
};

const getActionCopy = (notificationType: string) => {
  if (notificationType === "email_verification_code") {
    return "Return to your account settings, enter the 6-digit code, and confirm your email to unlock automated account emails.";
  }

  if (notificationType === "email_verified") {
    return "Your email is confirmed. Automated account alerts can now be delivered to this address.";
  }

  if (notificationType.startsWith("deposit") || notificationType.startsWith("withdrawal")) {
    return "Open your wallet and balance history to review the full payment timeline and any follow-up actions.";
  }

  if (notificationType === "trade_result") {
    return "Open your trading history to review the closed position, payout, and account impact.";
  }

  if (notificationType.startsWith("tournament")) {
    return "Open the tournament desk to check standings, prize status, and any new competition updates.";
  }

  if (notificationType.startsWith("kyc")) {
    return "Open account settings to review your verification status and upload anything else if required.";
  }

  return "Open your dashboard to review the full notification details inside your account center.";
};

const renderBrandHtml = ({
  logoUrl,
  platformName,
  theme,
}: {
  logoUrl: string | null;
  platformName: string;
  theme: AccentTheme;
}) => {
  const brandName = escapeHtml(platformName);
  const logoMarkup = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${brandName}" style="display:block;max-height:42px;max-width:150px;border:0;outline:none;text-decoration:none;" />`
    : `<div style="height:42px;width:42px;border-radius:14px;background:${theme.badgeBg};border:1px solid ${theme.badgeBorder};color:${theme.badgeText};font-size:18px;font-weight:800;line-height:42px;text-align:center;">${escapeHtml(platformName.charAt(0).toUpperCase())}</div>`;

  return `<table role="presentation" cellspacing="0" cellpadding="0">
    <tr>
      <td valign="middle">${logoMarkup}</td>
      <td valign="middle" style="padding-left:12px;">
        <div style="font-size:16px;font-weight:800;letter-spacing:0.01em;color:#ffffff;">${brandName}</div>
        <div style="margin-top:4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#c7d5ea;">Notification Desk</div>
      </td>
    </tr>
  </table>`;
};

const renderDisplayValueHtml = (value: string) => {
  if (!value.includes("@")) return escapeHtml(value);

  const [localPart, domainPart] = value.split("@");
  if (!localPart || !domainPart) return escapeHtml(value);

  return [
    `<span style="white-space:nowrap;">${escapeHtml(localPart)}</span>`,
    `<span style="white-space:nowrap;">&#64;</span>`,
    `<span style="white-space:nowrap;">${escapeHtml(domainPart)}</span>`,
  ].join("");
};

const buildHighlightsHtml = (highlights: HighlightEntry[], theme: AccentTheme) => {
  if (highlights.length === 0) return "";

  const rows: string[] = [];

  for (let index = 0; index < highlights.length; index += 2) {
    const pair = highlights.slice(index, index + 2);
    const cells = pair
      .map((entry, pairIndex) => {
        const paddingLeft = pairIndex === 1 ? "padding-left:12px;" : "";
        const paddingTop = index > 0 ? "padding-top:12px;" : "";

        return `<td width="50%" valign="top" style="${paddingLeft}${paddingTop}">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${theme.panelBg};border:1px solid ${theme.panelBorder};border-radius:18px;">
            <tr>
              <td style="padding:14px 16px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">${escapeHtml(entry.label)}</div>
                <div style="margin-top:8px;font-size:18px;font-weight:800;line-height:1.35;color:${theme.panelText};">${renderDisplayValueHtml(entry.value)}</div>
              </td>
            </tr>
          </table>
        </td>`;
      })
      .join("");

    const fillerCell = pair.length === 1 ? `<td width="50%" style="${index > 0 ? "padding-top:12px;" : ""}padding-left:12px;"></td>` : "";
    rows.push(`<tr>${cells}${fillerCell}</tr>`);
  }

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;">${rows.join("")}</table>`;
};

const buildEmailContent = ({
  baseUrl,
  delivery,
  logoUrl,
  platformName,
  supportEmail,
}: {
  baseUrl: string;
  delivery: EmailDeliveryRow;
  logoUrl: string | null;
  platformName: string;
  supportEmail: string;
}) => {
  const payload = asRecord(delivery.payload);
  const title = cleanText(payload.title) ?? delivery.subject;
  const message = cleanText(payload.message) ?? "You have a new account notification waiting in your dashboard.";
  const websiteUrl = baseUrl;
  const ctaUrl = websiteUrl;
  const manageAlertsUrl = websiteUrl;
  const resolvedLogoUrl = logoUrl ? (/^https?:\/\//i.test(logoUrl) ? logoUrl : `${baseUrl}${normalizePath(logoUrl)}`) : null;
  const theme = getAccentTheme(delivery.notification_type);
  const highlights = buildHighlights(delivery.notification_type, payload);
  const heroHighlight = highlights[0] ?? { label: "Notification Type", value: formatNotificationType(delivery.notification_type) };
  const detailHighlights = highlights.length > 1 ? highlights.slice(1) : highlights;
  const preheader = cleanText(payload.tournament_title) ?? cleanText(payload.asset_symbol) ?? message;
  const actionCopy = getActionCopy(delivery.notification_type);
  const highlightsHtml = buildHighlightsHtml(detailHighlights, theme);

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#ffffff;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#ffffff;">
      <tr>
        <td align="center" style="padding:26px 14px 42px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;">
            <tr>
              <td style="padding:0 0 14px 6px;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#7b8aa2;">
                Automated account email
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:28px;">
                  <tr>
                    <td style="padding:0;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,${theme.heroStart} 0%,${theme.heroMid} 52%,${theme.heroEnd} 100%);border-radius:28px 28px 0 0;">
                        <tr>
                          <td style="padding:28px 30px 16px 30px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                              <tr>
                                <td valign="top">${renderBrandHtml({ logoUrl: resolvedLogoUrl, platformName, theme })}</td>
                                <td align="right" valign="top">
                                  <div style="display:inline-block;border-radius:999px;background:${theme.badgeBg};border:1px solid ${theme.badgeBorder};padding:9px 14px;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${theme.badgeText};">
                                    ${escapeHtml(theme.label)}
                                  </div>
                                </td>
                              </tr>
                            </table>

                            <div style="margin-top:28px;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#cfdcf2;">
                              Live account alert
                            </div>
                            <div style="margin-top:12px;font-size:34px;line-height:1.08;font-weight:800;color:#ffffff;">
                              ${escapeHtml(title)}
                            </div>
                            <div style="margin-top:14px;max-width:560px;font-size:16px;line-height:1.75;color:#dbe8fb;">
                              ${escapeHtml(message)}
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;background:rgba(7,12,18,0.28);border:1px solid rgba(255,255,255,0.12);border-radius:22px;">
                              <tr>
                                <td valign="top" style="padding:18px 20px;">
                                  <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#aab9cf;">
                                    ${escapeHtml(heroHighlight.label)}
                                  </div>
                                  <div style="margin-top:10px;font-size:30px;line-height:1.15;font-weight:800;color:#ffffff;">
                                    ${escapeHtml(heroHighlight.value)}
                                  </div>
                                </td>
                                <td align="right" valign="top" style="padding:18px 20px;">
                                  <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#aab9cf;">
                                    Channel
                                  </div>
                                  <div style="margin-top:10px;font-size:15px;line-height:1.5;font-weight:700;color:#ffffff;">
                                    Email + in-app
                                  </div>
                                  <div style="margin-top:8px;font-size:12px;line-height:1.6;color:#c4d5ec;">
                                    ${escapeHtml(formatNotificationType(delivery.notification_type))}
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:28px 30px 10px 30px;">
                      <div style="font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;">
                        Account details
                      </div>
                      ${highlightsHtml}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px 30px 0 30px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${theme.panelBg};border:1px solid ${theme.panelBorder};border-radius:22px;">
                        <tr>
                          <td style="padding:18px 20px;">
                            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;">
                              Next step
                            </div>
                            <div style="margin-top:10px;font-size:15px;line-height:1.7;color:#334155;">
                              ${escapeHtml(actionCopy)}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:24px 30px 14px 30px;">
                      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;border-radius:999px;background:${theme.button};padding:15px 26px;font-size:15px;font-weight:800;color:${theme.buttonText};text-decoration:none;">
                        Open in ${escapeHtml(platformName)}
                      </a>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 30px 30px 30px;">
                      <div style="font-size:13px;line-height:1.8;color:#64748b;">
                        Open the website here: <a href="${escapeHtml(manageAlertsUrl)}" style="color:${theme.button};font-weight:700;text-decoration:none;">${escapeHtml(manageAlertsUrl)}</a>.
                        <br />
                        Need help? Visit <a href="${escapeHtml(websiteUrl)}" style="color:${theme.button};font-weight:700;text-decoration:none;">${escapeHtml(platformName)}</a>.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 8px 0 8px;font-size:12px;line-height:1.8;color:#94a3b8;">
                This email was sent automatically because email alerts are enabled on your ${escapeHtml(platformName)} account.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    title,
    "",
    message,
    "",
    ...highlights.map((entry) => `${entry.label}: ${entry.value}`),
    highlights.length > 0 ? "" : "",
    actionCopy,
    "",
    `Open website: ${ctaUrl}`,
    `Website: ${manageAlertsUrl}`,
    "",
    `This email was sent automatically by ${platformName}.`,
    `Visit: ${websiteUrl}`,
  ]
    .filter((line, index, array) => !(line === "" && array[index - 1] === ""))
    .join("\n");

  return {
    html,
    subject: delivery.subject,
    text,
  };
};

const getRetryDelayMinutes = (attempt: number) => Math.min(60, 2 ** Math.max(attempt - 1, 0));

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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API returned ${response.status}: ${errorBody}`);
  }

  const payload = (await response.json()) as { id?: string };
  return payload.id ?? null;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  const authHeader = getHeaderValue(request.headers, "authorization");

  if (configuredSecret && authHeader !== `Bearer ${configuredSecret}`) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  const emailFromAddress = process.env.EMAIL_FROM_ADDRESS?.trim();
  if (!emailFromAddress) {
    sendJson(response, 500, { error: "Missing EMAIL_FROM_ADDRESS." });
    return;
  }

  try {
    const baseUrl = getBaseUrl(request);
    const nowIso = new Date().toISOString();
    const staleProcessingBefore = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60_000).toISOString();

    const settingsRows = await query(
      "select platform_name, support_email, logo_url from platform_settings order by updated_at desc limit 1",
    );

    const platformSettings = settingsRows[0] ?? null;
    const platformName = typeof platformSettings?.platform_name === "string" ? platformSettings.platform_name : DEFAULT_PLATFORM_NAME;
    const logoUrl = typeof platformSettings?.logo_url === "string" && platformSettings.logo_url.trim() ? platformSettings.logo_url.trim() : null;
    const supportEmail = typeof platformSettings?.support_email === "string" ? platformSettings.support_email : DEFAULT_SUPPORT_EMAIL;

    await query(
      "update notification_email_deliveries set status = $1, updated_at = $2 where status = $3 and updated_at <= $4",
      ["pending", nowIso, "processing", staleProcessingBefore],
    );

    const pendingRows = await query(
      `select id, notification_id, notification_type, payload, recipient_email, retry_count, subject
         from notification_email_deliveries
        where status = $1 and next_attempt_at <= $2
        order by created_at asc
        limit 20`,
      ["pending", nowIso],
    );

    const pendingDeliveries = pendingRows as unknown as EmailDeliveryRow[];
    if (pendingDeliveries.length === 0) {
      sendJson(response, 200, {
        processed: 0,
        sent: 0,
        skipped: 0,
      });
      return;
    }

    const deliveryIds = pendingDeliveries.map((delivery) => delivery.id);
    const claimedRows = await query(
      `update notification_email_deliveries
          set status = $1, last_attempt_at = $2, updated_at = $3
        where id = any($4) and status = $5
        returning id, notification_id, notification_type, payload, recipient_email, retry_count, subject`,
      ["processing", nowIso, nowIso, deliveryIds, "pending"],
    );

    const claimedDeliveries = claimedRows as unknown as EmailDeliveryRow[];
    let sentCount = 0;
    let skippedCount = 0;

    for (const delivery of claimedDeliveries) {
      try {
        const { html, subject, text } = buildEmailContent({
          baseUrl,
          delivery,
          logoUrl,
          platformName,
          supportEmail,
        });

        const providerMessageId = await sendViaResend({
          from: emailFromAddress,
          html,
          subject,
          text,
          to: delivery.recipient_email,
        });

        await query(
          `update notification_email_deliveries
              set last_error = $1, provider_message_id = $2, retry_count = $3, sent_at = $4, status = $5, updated_at = $6
            where id = $7`,
          [null, providerMessageId, delivery.retry_count, new Date().toISOString(), "sent", new Date().toISOString(), delivery.id],
        );

        sentCount += 1;
      } catch (error) {
        const nextAttempt = Number(delivery.retry_count ?? 0) + 1;
        const finalFailure = nextAttempt >= MAX_ATTEMPTS;
        const retryAt = new Date(Date.now() + getRetryDelayMinutes(nextAttempt) * 60_000).toISOString();

        await query(
          `update notification_email_deliveries
              set last_error = $1, next_attempt_at = $2, retry_count = $3, status = $4, updated_at = $5
            where id = $6`,
          [
            error instanceof Error ? error.message : "Unknown email delivery failure.",
            retryAt,
            nextAttempt,
            finalFailure ? "failed" : "pending",
            new Date().toISOString(),
            delivery.id,
          ],
        );

        skippedCount += 1;
      }
    }

    sendJson(response, 200, {
      processed: claimedDeliveries.length,
      sent: sentCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error("Failed to process notification email queue", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Email queue processing failed.",
    });
  }
}
