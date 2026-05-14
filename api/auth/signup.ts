import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonRequestBody } from "../_lib/sasapay.js";
import { getSupabaseAdminClient } from "../_lib/supabaseAdmin.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

type SignupPayload = {
  email?: unknown;
  password?: unknown;
  username?: unknown;
  referredByCode?: unknown;
};

const DEFAULT_PLATFORM_NAME = "Init Option";

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const getHeaderValue = (headers: ApiRequest["headers"], headerName: string) => {
  const direct = headers[headerName];
  if (Array.isArray(direct)) return direct[0] ?? "";
  if (typeof direct === "string") return direct;

  const matchedKey = Object.keys(headers).find((key) => key.toLowerCase() === headerName.toLowerCase());
  if (!matchedKey) return "";

  const matchedValue = headers[matchedKey];
  if (Array.isArray(matchedValue)) return matchedValue[0] ?? "";
  return typeof matchedValue === "string" ? matchedValue : "";
};

const getBaseUrl = (request: ApiRequest) => {
  const configuredUrl = process.env.APP_BASE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  const proto = getHeaderValue(request.headers, "x-forwarded-proto") || "https";
  const host = getHeaderValue(request.headers, "x-forwarded-host") || getHeaderValue(request.headers, "host");
  return host ? `${proto}://${host.replace(/\/+$/, "")}` : "http://localhost:3000";
};

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeEmail = (value: unknown) => asString(value).toLowerCase();

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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
};

const buildConfirmationEmail = ({
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
  const safePlatformName = escapeHtml(platformName);
  const safeActionLink = escapeHtml(actionLink);
  const safeEmail = escapeHtml(email);
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

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const emailFromAddress = process.env.EMAIL_FROM_ADDRESS?.trim();
  if (!emailFromAddress || !process.env.RESEND_API_KEY?.trim()) {
    sendJson(response, 501, {
      code: "custom_email_unavailable",
      error: "Custom signup email is not configured.",
    });
    return;
  }

  try {
    const body = (await readJsonRequestBody(request)) as SignupPayload;
    const email = normalizeEmail(body.email);
    const password = asString(body.password);
    const username = asString(body.username) || email.split("@")[0] || "trader";
    const referredByCode = asString(body.referredByCode).toUpperCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendJson(response, 400, { error: "Enter a valid email address." });
      return;
    }

    if (password.length < 6) {
      sendJson(response, 400, { error: "Password must be at least 6 characters." });
      return;
    }

    const adminClient = getSupabaseAdminClient() as any;
    const baseUrl = getBaseUrl(request);
    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent("/trade")}`;
    const settingsResponse = await adminClient
      .from("platform_settings")
      .select("platform_name, support_email")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const platformName = asString(settingsResponse.data?.platform_name) || DEFAULT_PLATFORM_NAME;
    const supportEmail = asString(settingsResponse.data?.support_email) || "support@initoption.com";

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
      sendJson(response, alreadyRegistered ? 409 : 400, {
        error: alreadyRegistered ? "This email is already registered. Please sign in instead." : message,
      });
      return;
    }

    const actionLink = asString(data?.properties?.action_link);
    if (!actionLink) {
      throw new Error("Supabase did not return a confirmation link.");
    }

    const emailContent = buildConfirmationEmail({
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

    sendJson(response, 200, {
      email,
      status: "confirmation_sent",
    });
  } catch (error) {
    console.error("Signup confirmation email failed", error);
    sendJson(response, 500, { error: "Could not send the confirmation email. Please try again." });
  }
}
