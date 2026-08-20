// Appwrite authentication layer.
// Exposes the same surface as the (now-backup) Firebase authService so the
// app's AuthContext and api client can be pointed at Appwrite with minimal
// changes. Appwrite is the active auth provider; Firebase files remain in the
// repo as a backup until the full migration is verified.
import { ID, OAuthProvider } from "appwrite";
import { account, appwriteConfigPresent, type AppwriteUser } from "./config";

export type AppwriteAuthError = { message: string; code: string };

// Firebase-compatible shape consumed by AuthContext (uid/email/displayName/
// providerData/metadata + getIdToken). Keeps firebaseUserToAppUser working.
export interface AuthUserLike {
  uid: string;
  email: string | null;
  displayName: string | null;
  providerData: Array<{ email: string | null; displayName: string | null }>;
  metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const isBrowser = () => typeof window !== "undefined";

const toAuthUserLike = (user: AppwriteUser): AuthUserLike => {
  const metadata: Record<string, unknown> = {
    ...(user.name ? { display_name: user.name, username: user.name } : {}),
    ...(user.emailVerification
      ? { platform_email_verified_at: new Date().toISOString() }
      : {}),
  };
  return {
    uid: user.$id,
    email: user.email ?? null,
    displayName: user.name || null,
    providerData: [
      {
        email: user.email ?? null,
        displayName: user.name || null,
      },
    ],
    metadata,
    user_metadata: metadata,
    getIdToken: () => createJwtToken(),
  };
};

/* ------------------------------------------------------------------ */
/* Auth state subscription (no native listener in Appwrite web SDK; we  */
/* hydrate on subscribe and notify after every sign-in / sign-out).     */
/* ------------------------------------------------------------------ */
type AuthListener = (user: AuthUserLike | null, loading: boolean) => void;

const listeners = new Set<AuthListener>();
let cachedUser: AuthUserLike | null = null;
let hydrated = false;

const notify = (user: AuthUserLike | null, loading = false) => {
  cachedUser = user;
  for (const listener of listeners) {
    listener(user, loading);
  }
};

const hydrate = async (): Promise<AuthUserLike | null> => {
  if (!account) {
    notify(null);
    return null;
  }
  try {
    const user = await account.get();
    const mapped = toAuthUserLike(user);
    notify(mapped);
    return mapped;
  } catch {
    notify(null);
    return null;
  }
};

export function subscribeAuthState(
  cb: (user: AuthUserLike | null, loading: boolean) => void,
): (() => void) | null {
  if (!isBrowser() || !account) {
    cb(null, false);
    return null;
  }

  listeners.add(cb);

  if (!hydrated) {
    hydrated = true;
    void hydrate();
  } else {
    cb(cachedUser, false);
  }

  return () => {
    listeners.delete(cb);
  };
}

/* ------------------------------------------------------------------ */
/* Email / password                                                     */
/* ------------------------------------------------------------------ */
const mapError = (e: unknown): AppwriteAuthError => {
  const err = e as { message?: string; type?: string; code?: string; response?: { message?: string } };
  const raw = err?.response?.message ?? err?.message;
  const code = err?.type ?? err?.code ?? "appwrite/unknown";

  const msg =
    raw ||
    (code.includes("invalid_credentials")
      ? "Incorrect email or password."
      : code.includes("user_already_exists") || code.includes("user_already_registered")
        ? "This email is already registered. Try signing in."
        : "Authentication failed. Please try again.");

  return { message: msg, code };
};

export async function signInEmail(
  email: string,
  password: string,
): Promise<{ user: AuthUserLike | null; error: AppwriteAuthError | null }> {
  try {
    if (!appwriteConfigPresent) throw new Error("APPWRITE_CONFIG_MISSING");
    if (!account) throw new Error("Appwrite account is not initialized");
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();
    const mapped = toAuthUserLike(user);
    notify(mapped);
    return { user: mapped, error: null };
  } catch (e) {
    return { user: null, error: mapError(e) };
  }
}

export async function signUpEmail(
  email: string,
  password: string,
  username?: string,
): Promise<{ user: AuthUserLike | null; error: AppwriteAuthError | null }> {
  try {
    if (!appwriteConfigPresent) throw new Error("APPWRITE_CONFIG_MISSING");
    if (!account) throw new Error("Appwrite account is not initialized");
    const name = username ?? email.split("@")[0] ?? "trader";
    await account.create(ID.unique(), email, password, name);
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();
    const mapped = toAuthUserLike(user);
    notify(mapped);
    return { user: mapped, error: null };
  } catch (e) {
    return { user: null, error: mapError(e) };
  }
}

/* ------------------------------------------------------------------ */
/* Google OAuth (full-page redirect, not popup — avoids popup blockers) */
/* ------------------------------------------------------------------ */
export async function signInWithGoogleRedirect(): Promise<{ user: null; error: AppwriteAuthError | null }> {
  try {
    if (!appwriteConfigPresent) throw new Error("APPWRITE_CONFIG_MISSING");
    if (!account || !isBrowser()) throw new Error("Appwrite account is not initialized");
    const origin = window.location.origin;
    const successUrl = `${origin}/auth/callback`;
    const failureUrl = `${origin}/login`;
    const result = account.createOAuth2Session(OAuthProvider.Google, successUrl, failureUrl);
    if (typeof result === "string") {
      window.location.assign(result);
    }
    return { user: null, error: null };
  } catch (e) {
    return { user: null, error: mapError(e) };
  }
}

export async function resolveGoogleRedirectResult(): Promise<{ user: AuthUserLike | null; error: AppwriteAuthError | null }> {
  try {
    if (!appwriteConfigPresent) {
      return { user: null, error: { message: "Appwrite is not configured yet.", code: "APPWRITE_CONFIG_MISSING" } };
    }
    if (!account) {
      return { user: null, error: { message: "Appwrite account is not initialized", code: "appwrite/unknown" } };
    }
    const user = await account.get();
    const mapped = toAuthUserLike(user);
    notify(mapped);
    return { user: mapped, error: null };
  } catch (e) {
    return { user: null, error: mapError(e) };
  }
}

/* ------------------------------------------------------------------ */
/* Sign out                                                             */
/* ------------------------------------------------------------------ */
export async function signOut(): Promise<{ error: AppwriteAuthError | null }> {
  try {
    if (!account) return { error: null };
    await account.deleteSession("current");
    notify(null);
    return { error: null };
  } catch (e) {
    return { error: mapError(e) };
  }
}

/* ------------------------------------------------------------------ */
/* JWT (used as the Authorization bearer for /api calls)                */
/* ------------------------------------------------------------------ */
let _jwt: string | null = null;
let _jwtPromise: Promise<string | null> | null = null;

async function createJwtToken(forceRefresh = false): Promise<string | null> {
  if (!account) return null;
  if (_jwt && !forceRefresh) return _jwt;
  try {
    const { jwt } = await account.createJWT();
    _jwt = jwt;
    return jwt;
  } catch {
    return null;
  }
}

export function getIdToken(forceRefresh = false): Promise<string | null> {
  if (!appwriteConfigPresent) return Promise.resolve(null);
  if (_jwtPromise && !forceRefresh) return _jwtPromise;
  _jwtPromise = createJwtToken(forceRefresh).finally(() => {
    _jwtPromise = null;
  });
  return _jwtPromise;
}

export function getAppwriteIdToken(forceRefresh = false): Promise<string | null> {
  return getIdToken(forceRefresh);
}

export async function currentAppwriteUser(): Promise<AuthUserLike | null> {
  if (!account) return null;
  try {
    const user = await account.get();
    return toAuthUserLike(user);
  } catch {
    return null;
  }
}

// Forces a fresh account.get() and broadcasts the result to all auth-state
// listeners. Used by the OAuth callback page when the initial hydration run
// raced the session cookie being committed (common right after a redirect).
// Returns the resolved user (or null) once the call settles.
export async function refreshSession(): Promise<AuthUserLike | null> {
  if (!account) return null;
  try {
    const user = await account.get();
    const mapped = toAuthUserLike(user);
    notify(mapped);
    return mapped;
  } catch {
    notify(null);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Password recovery / update (Appwrite native)                         */
/* ------------------------------------------------------------------ */
export async function sendPasswordReset(email: string, redirectUrl: string): Promise<{ error: AppwriteAuthError | null }> {
  try {
    if (!account) throw new Error("Appwrite account is not initialized");
    await account.createRecovery(email, redirectUrl);
    return { error: null };
  } catch (e) {
    return { error: mapError(e) };
  }
}

export async function completePasswordReset(
  userId: string,
  secret: string,
  password: string,
): Promise<{ error: AppwriteAuthError | null }> {
  try {
    if (!account) throw new Error("Appwrite account is not initialized");
    await account.updateRecovery(userId, secret, password);
    return { error: null };
  } catch (e) {
    return { error: mapError(e) };
  }
}

export async function changePassword(password: string, oldPassword?: string): Promise<{ error: AppwriteAuthError | null }> {
  try {
    if (!account) throw new Error("Appwrite account is not initialized");
    await account.updatePassword(password, oldPassword);
    return { error: null };
  } catch (e) {
    return { error: mapError(e) };
  }
}

export async function disableCurrentAccount(): Promise<{ error: AppwriteAuthError | null }> {
  try {
    if (!account) throw new Error("Appwrite account is not initialized");
    await account.updateStatus();
    notify(null);
    return { error: null };
  } catch (e) {
    return { error: mapError(e) };
  }
}

export async function updateDisplayName(name: string): Promise<{ error: AppwriteAuthError | null }> {
  try {
    if (!account) throw new Error("Appwrite account is not initialized");
    await account.updateName(name);
    return { error: null };
  } catch (e) {
    return { error: mapError(e) };
  }
}

export { account, appwriteConfigPresent };
