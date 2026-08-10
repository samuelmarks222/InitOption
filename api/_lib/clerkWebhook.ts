import crypto from "crypto";
import { type DecodedIdToken, getAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import { getApps, initializeApp, cert } from "firebase-admin/app";

// We keep these export names (authenticateRequest / clerkUserIdToUuid / verifyClerkWebhook)
// so the many api callers stay unchanged. Under the hood they now trust a Firebase
// ID token instead of a Clerk session token.

const UUID_V5_NAMESPACE = Buffer.from("8f2d1a0e-6b3c-4d4e-9a9a-1a2b3c4d5e6f", "hex");

// Kept for naming compatibility; maps ANY auth-provider uid to a stable uuid.
export const clerkUserIdToUuid = (uid: string): string => {
  const hash = crypto
    .createHash("sha1")
    .update(Buffer.concat([UUID_V5_NAMESPACE, Buffer.from(uid, "utf8")]))
    .digest();

  const b = hash.subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;

  const hex = b.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
};

let _adminAuth: AdminAuth | null = null;
let _initError: Error | null = null;

function getAdminAuth(): AdminAuth {
  if (_adminAuth) return _adminAuth;
  if (_initError) throw _initError;
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    try {
      initializeApp(
        projectId && clientEmail && privateKey
          ? { credential: cert({ projectId, clientEmail, privateKey }) }
          : { projectId },
      );
    } catch (e) {
      _initError = e instanceof Error ? e : new Error("firebase-admin init failed");
      throw _initError;
    }
  }
  _adminAuth = getAuth();
  return _adminAuth;
}

type AuthRequestHeaders = Record<string, string | string[] | undefined>;

const bearerFromHeader = (raw: string | string[] | undefined): string | null => {
  if (typeof raw === "string") return raw.startsWith("Bearer ") ? raw.slice(7).trim() : null;
  if (Array.isArray(raw)) return bearerFromHeader(raw[0]);
  return null;
};

// Verifies a Firebase ID token from the Authorization header and returns the
// Firebase uid. Returns null when absent/invalid or when Firebase isn't
// configured (so the API degrades gracefully instead of crashing).
export const authenticateRequest = async (
  headers: AuthRequestHeaders,
  bearerHandler: (raw: string) => string | null = bearerFromHeader,
): Promise<string | null> => {
  const raw = headers["authorization"] ?? headers["Authorization"];
  const token = Array.isArray(raw) ? bearerHandler(raw[0] ?? "") : bearerHandler(raw ?? "");

  if (!token) return null;

  if (!process.env.FIREBASE_PROJECT_ID) {
    return null;
  }

  try {
    const auth = getAdminAuth();
    let payload: DecodedIdToken;
    try {
      payload = await auth.verifyIdToken(token, true);
    } catch {
      payload = await auth.verifyIdToken(token, false);
    }
    const uid = payload.uid ?? payload.sub;
    if (typeof uid !== "string" || uid.length === 0) return null;
    return uid;
  } catch (e) {
    console.error("Firebase token verification failed:", e);
    return null;
  }
};

export const verifyClerkWebhook = async (): Promise<never> => {
  // Clerk account removed; legacy Clerk webhook endpoint is inactive.
  throw new Error("Clerk webhooks are no longer handled on this deployment.");
};
