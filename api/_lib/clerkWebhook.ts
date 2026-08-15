// We keep these export names (authenticateRequest / clerkUserIdToUuid / verifyClerkWebhook)
// so the many api callers stay unchanged. Under the hood they now trust an Appwrite
// user JWT (created client-side via account.createJWT()) instead of a Firebase ID token.
//
// Identity: existing rows in public.users/profiles are keyed by a deterministic UUID
// (clerkUserIdToUuid(providerUid)). Appwrite user ids differ from the legacy Firebase
// uids, so authenticateRequest resolves an Appwrite user to the canonical UUID using:
//   1. an explicit appwrite_user_id binding (after first adoption)
//   2. a case-insensitive email match against public.users (adopts existing accounts)
//   3. a fresh deterministic UUID derived from the Appwrite uid (brand-new users)
// clerkUserIdToUuid stays exported and is now idempotent for values that are already
// UUIDs, so existing callers that pass the authenticated result through it are safe.

import crypto from "node:crypto";
import { Client, Account } from "node-appwrite";

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const UUID_V5_NAMESPACE = Buffer.from("8f2d1a0e-6b3c-4d4e-9a9a-1a2b3c4d5e6f", "hex");

// Maps ANY auth-provider uid to a stable uuid. Pass-through when the input already
// is a UUID (the canonical ids returned by authenticateRequest), so callers that do
// clerkUserIdToUuid(authenticateRequest(...)) behave correctly under Appwrite too.
export const clerkUserIdToUuid = (uid: string): string => {
  if (UUID_PATTERN.test(uid)) return uid.toLowerCase();

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

type AuthRequestHeaders = Record<string, string | string[] | undefined>;

const bearerFromHeader = (raw: string | string[] | undefined): string | null => {
  if (typeof raw === "string") return raw.startsWith("Bearer ") ? raw.slice(7).trim() : null;
  if (Array.isArray(raw)) return bearerFromHeader(raw[0]);
  return null;
};

const appwriteEndpoint = () =>
  process.env.APPWRITE_ENDPOINT ??
  process.env.VITE_APPWRITE_ENDPOINT ??
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  "";

const appwriteProjectId = () =>
  process.env.APPWRITE_PROJECT_ID ??
  process.env.VITE_APPWRITE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ??
  "";

const appwriteConfigured = () => {
  const endpoint = appwriteEndpoint().trim();
  const projectId = appwriteProjectId().trim();
  return endpoint.length > 0 && projectId.length > 0 && !projectId.startsWith("REPLACE");
};

// Verifies the Appwrite JWT against Appwrite itself (Account.get with the JWT bound
// as the request credential). Returns the verified Appwrite user, or null when the
// token is missing / invalid / Appwrite isn't configured (graceful degrade).
const getVerifiedAppwriteUser = async (token: string) => {
  if (!appwriteConfigured()) return null;
  try {
    const client = new Client()
      .setEndpoint(appwriteEndpoint())
      .setProject(appwriteProjectId())
      .setJWT(token);
    const user = await new Account(client).get();
    return user ? { id: user.$id, email: user.email || null } : null;
  } catch (e) {
    console.error("Appwrite JWT verification failed:", e);
    return null;
  }
};

// Resolves an Appwrite user to the canonical public.users id (a UUID) used as the
// primary key by every table. Adopts legacy accounts by email on first sign-in.
const resolveCanonicalUserId = async (appwriteUserId: string, email: string | null): Promise<string> => {
  const { queryOne, query } = await import("./db.js");

  const bound = await queryOne("select id from public.users where appwrite_user_id = $1", [appwriteUserId]);
  if (bound) return String(bound.id);

  if (email) {
    const existing = await queryOne("select id from public.users where lower(email) = lower($1) limit 1", [email]);
    if (existing) {
      const id = String(existing.id);
      await query("update public.users set appwrite_user_id = $1, updated_at = now() where id = $2", [
        appwriteUserId,
        id,
      ]);
      return id;
    }
  }

  const newId = clerkUserIdToUuid(appwriteUserId);
  await query(
    `insert into public.users (id, email, appwrite_user_id, created_at, updated_at)
     values ($1, $2, $3, now(), now())
     on conflict (id) do nothing`,
    [newId, email, appwriteUserId],
  );
  return newId;
};

// Verifies the Bearer token (an Appwrite user JWT) and returns the canonical user id
// (public.users.id UUID). Returns null when absent/invalid or when Appwrite isn't
// configured (so the API degrades gracefully instead of crashing).
export const authenticateRequest = async (
  headers: AuthRequestHeaders,
  bearerHandler: (raw: string) => string | null = bearerFromHeader,
): Promise<string | null> => {
  const raw = headers["authorization"] ?? headers["Authorization"];
  const token = Array.isArray(raw) ? bearerHandler(raw[0] ?? "") : bearerHandler(raw ?? "");

  if (!token) return null;
  if (!appwriteConfigured()) return null;

  const user = await getVerifiedAppwriteUser(token);
  if (!user) return null;

  return resolveCanonicalUserId(user.id, user.email);
};

export const verifyClerkWebhook = async (): Promise<never> => {
  // Clerk account removed; legacy Clerk webhook endpoint is inactive.
  throw new Error("Clerk webhooks are no longer handled on this deployment.");
};