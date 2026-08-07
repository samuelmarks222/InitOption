import crypto from "crypto";
import { verifyWebhook, type WebhookEvent } from "@clerk/backend/webhooks";
import { verifyToken } from "@clerk/backend";

// Clerk user ids look like "user_2xYz..." which are not valid UUIDs, but the
// Neon schema keys public.users / public.profiles on a uuid primary key.
// Map each Clerk id deterministically to a UUID v5 so the same Clerk user
// always resolves to the same DB row (and RLS casts of app.current_user_id
// to uuid in SECURITY DEFINER functions keep working).
const UUID_V5_NAMESPACE = Buffer.from("8f2d1a0e-6b3c-4d4e-9a9a-1a2b3c4d5e6f", "hex");

export const clerkUserIdToUuid = (clerkUserId: string): string => {
  const hash = crypto
    .createHash("sha1")
    .update(Buffer.concat([UUID_V5_NAMESPACE, Buffer.from(clerkUserId, "utf8")]))
    .digest();

  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;

  const hex = hash.subarray(0, 16).toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
};

type ClerkRequestHeaders = Record<string, string | string[] | undefined>;

// Extracts the "sub" (Clerk user id) from a verified Clerk session JWT carried
// in the Authorization header. Returns null when unauthenticated/invalid.
export const authenticateRequest = async (
  headers: ClerkRequestHeaders,
  bearerHandler: (raw: string) => string | null = (raw) =>
    typeof raw === "string" && raw.startsWith("Bearer ") ? raw.slice(7).trim() : null,
): Promise<string | null> => {
  const raw = headers["authorization"] ?? headers["Authorization"];
  const token = Array.isArray(raw) ? bearerHandler(raw[0] ?? "") : bearerHandler(raw ?? "");

  if (!token) return null;

  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("Missing required environment variable: CLERK_SECRET_KEY");
  }

  try {
    const payload = await verifyToken(token, { secretKey, clockSkewInMs: 5000 });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    return payload.sub;
  } catch {
    return null;
  }
};

// Verifies a Clerk webhook request using the Standard Webhooks (Svix) scheme
// and returns the parsed event. Reads the signing secret from
// CLERK_WEBHOOK_SECRET (falling back to CLERK_WEBHOOK_SIGNING_SECRET).
export const verifyClerkWebhook = async ({
  rawBody,
  headers: incomingHeaders,
}: {
  rawBody: string;
  headers: ClerkRequestHeaders;
}): Promise<WebhookEvent> => {
  const secret =
    process.env.CLERK_WEBHOOK_SECRET?.trim() ||
    process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim();

  if (!secret) {
    throw new Error("Missing required environment variable: CLERK_WEBHOOK_SECRET");
  }

  const headers = {
    get: (name: string): string | null => {
      const key = name.toLowerCase();
      const value = incomingHeaders[key] ?? incomingHeaders[name];
      if (Array.isArray(value)) return value[0] ?? null;
      return value ?? null;
    },
  };

  const request = {
    headers,
    text: async () => rawBody,
  } as unknown as Request;

  return verifyWebhook(request, { signingSecret: secret });
};