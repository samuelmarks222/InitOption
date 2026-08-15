import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  signInEmail,
  signUpEmail,
  signInWithGoogleRedirect,
  resolveGoogleRedirectResult,
  signOut as appwriteSignOut,
  getIdToken,
  subscribeAuthState,
  sendPasswordReset,
  completePasswordReset,
  updateDisplayName,
  account as appwriteAccount,
  type AuthUserLike,
} from "@/integrations/appwrite/authService";
import { clearAuthRestorePath } from "@/lib/authRedirect";
import { shouldNormalizeSeededLiveBalance } from "@/lib/live-balance";
import type { AuthProfile, ProfileUpdateInput } from "@/types/profile";

interface AuthContextType {
  user: { id: string; email: string | null; user_metadata: Record<string, unknown> } | null;
  session: { user: { id: string } | null } | null;
  profile: AuthProfile | null;
  loading: boolean;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  signUp: (email: string, password: string, username?: string, referredByCode?: string) => Promise<{ error: { message: string; status?: number } | null }>;
  signIn: (email: string, password: string) => Promise<{ error: { message: string; status?: number } | null }>;
  signInWithGoogle: () => Promise<{ error: { message: string; status?: number } | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendEmailVerificationCode: () => Promise<{
    cooldownSeconds: number | null;
    email: string | null;
    expiresAt: string | null;
    status: string | null;
  }>;
  updateProfile: (updates: ProfileUpdateInput) => Promise<void>;
  verifyEmailCode: (code: string) => Promise<{
    email: string | null;
    status: string | null;
    verifiedAt: string | null;
  }>;
  resetPassword: (email: string) => Promise<{ error: { message: string; status?: number } | null }>;
  verifyPasswordResetCode: (email: string, code: string) => Promise<{ error: { message: string; status?: number } | null }>;
  updatePasswordAfterReset: (newPassword: string) => Promise<{ error: { message: string; status?: number } | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_SESSION_RETRIES = 3;
const SESSION_RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const getProfileCacheKey = (userId: string) => `profile_cache_${userId}`;

const sanitizeDbOwnedProfileFields = (value: Record<string, unknown>) => {
  const nextValue = { ...value };
  let changed = false;

  [
    "avatar_url",
    "username",
    "kyc_status",
    "kyc_documents",
    "kycStatus",
    "kycDocuments",
  ].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(nextValue, key)) {
      delete nextValue[key];
      changed = true;
    }
  });

  return { nextValue, changed };
};

const getSanitizedUserMetadata = (authUser?: { user_metadata?: Record<string, unknown> } | null) => {
  const metadata = { ...(authUser?.user_metadata ?? {}) } as Record<string, unknown>;
  return sanitizeDbOwnedProfileFields(metadata).nextValue;
};

const loadProfileCache = (userId: string) => {
  try {
    const raw = localStorage.getItem(getProfileCacheKey(userId));
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const { nextValue, changed } = sanitizeDbOwnedProfileFields(parsed);

    if (changed) {
      localStorage.setItem(getProfileCacheKey(userId), JSON.stringify(nextValue));
    }

    return nextValue;
  } catch {
    return {};
  }
};

const saveProfileCache = (userId: string, updates: Record<string, unknown>) => {
  const current = loadProfileCache(userId);
  const { nextValue } = sanitizeDbOwnedProfileFields({ ...current, ...updates });
  localStorage.setItem(getProfileCacheKey(userId), JSON.stringify(nextValue));
};

const createProfileFallback = (userId: string): AuthProfile => {
  const now = new Date().toISOString();

  return {
    avatar_url: null,
    balance: 0,
    created_at: now,
    display_name: null,
    email: null,
    id: userId,
    nationality: null,
    phone_country: null,
    phone_country_code: null,
    kyc_documents: null,
    kyc_status: null,
    referral_code: "",
    referral_earnings: 0,
    referred_by: null,
    reserved_withdrawal_balance: 0,
    total_deposit: 0,
    total_profit: 0,
    total_trade_volume_30d: 0,
    total_trades: 0,
    total_wins: 0,
    trade_count_30d: 0,
    updated_at: now,
    username: null,
    vip_tier: null,
    vip_tier_override: null,
    welcome_bonus_granted_at: null,
  };
};

const asObjectRecord = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

const readString = (value: unknown) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : null);

const isMissingProfileCountryColumnError = (error: unknown) => {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  return /(nationality|phone_country|phone_country_code)/iu.test(message) && /(column|schema|not found|does not exist)/iu.test(message);
};

const getEmailVerifiedAt = (authUser?: { email_confirmed_at?: string | null; user_metadata?: Record<string, unknown> } | null) => {
  if (!authUser) return null;

  return (
    readString(asObjectRecord(authUser.user_metadata).platform_email_verified_at) ??
    readString(authUser.email_confirmed_at) ??
    null
  );
};

const deriveProfileIdentity = (authUser: { user_metadata?: Record<string, unknown>; email?: string | null } | null | undefined, userId: string) => {
  const metadata = asObjectRecord(authUser?.user_metadata);
  const emailFallback = readString(authUser?.email)?.split("@")[0] ?? `user_${userId.slice(0, 8)}`;
  const username =
    readString(metadata.username) ??
    readString(metadata.display_name) ??
    readString(metadata.full_name) ??
    readString(metadata.name) ??
    emailFallback;
  const displayName =
    readString(metadata.display_name) ??
    readString(metadata.full_name) ??
    readString(metadata.name) ??
    username;

  return { displayName, username };
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// API helper for profile operations.
// Sends the Appwrite JWT (instead of a Clerk/Firebase session token) as the
// bearer credential. The /api routes verify this token server-side.
const apiFetch = async (path: string, opts: RequestInit = {}): Promise<unknown> => {
  let token: string | null = null;
  try {
    token = await getIdToken(false);
  } catch {
    token = null;
  }
  const headers = new Headers(opts.headers as Record<string, string>);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", "application/json");

  const res = await fetch(`/api${path}`, { ...opts, headers });
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error: { message: string; status?: number } = {
      message: (payload as any)?.error || res.statusText,
      status: res.status,
    };
    throw error;
  }
  return (payload as any).data ?? payload;
};

function firebaseUserToAppUser(fbUser: AuthUserLike | null): {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
} | null {
  if (!fbUser) return null;
  const email = fbUser.email ?? fbUser.providerData?.[0]?.email ?? null;
  const metadata: Record<string, unknown> = {
    username:
      fbUser.displayName ??
      fbUser.providerData?.[0]?.['displayName'] ??
      fbUser.email?.split("@")?.[0] ??
      null,
    display_name:
      fbUser.displayName ??
      fbUser.providerData?.[0]?.['displayName'] ??
      null,
    ...(fbUser.metadata as any),
    ...(fbUser.user_metadata as Record<string, unknown> | undefined),
  };
  return {
    id: fbUser.uid,
    email,
    user_metadata: metadata,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<AuthUserLike | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string | null; user_metadata: Record<string, unknown> } | null>(
    firebaseUserToAppUser(null),
  );
  const [session, setSession] = useState<{ user: { id: string } | null } | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const activeProfileUserIdRef = useRef<string | null>(null);
  const isIntentionalSignOutRef = useRef(false);

  // Sync Firebase auth state -> app user object
  useEffect(() => {
    if (!isLoaded) return;

    const appUser = firebaseUserToAppUser(firebaseUser);

    if (appUser) {
      setUser(appUser);
      setSession({ user: { id: appUser.id } });
      activeProfileUserIdRef.current = appUser.id;

      void fetchProfile(appUser.id, appUser);
      setLoading(false);
    } else {
      setUser(null);
      setSession(null);
      setProfile(null);
      activeProfileUserIdRef.current = null;
      setLoading(false);
    }
  }, [isLoaded, firebaseUser]);

  // Initialise the auth-state listener once, and finish any Google sign-in
  // redirect that is returning to the app.
  useEffect(() => {
    if (!appwriteAccount) {
      setIsLoaded(true);
      setLoading(false);
      return;
    }
    const unsub = subscribeAuthState((user, _ready) => {
      setFirebaseUser(user);
      setIsLoaded(true);
    });

    void resolveGoogleRedirectResult()
      .then(({ user: redirectUser, error: redirectError }) => {
        if (redirectError) {
          console.error("[auth] Failed to complete Google redirect sign-in", redirectError);
        }
        if (redirectUser) {
          void persistToken();
          window.dispatchEvent(new Event("firebase-auth-state-change"));
        }
      })
      .catch((e) => {
        console.error("[auth] Unexpected error resolving Google redirect", e);
      });

    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureProfileRow = useCallback(async (userId: string, authUser?: { user_metadata?: Record<string, unknown>; email?: string | null } | null) => {
    try {
      const data = await apiFetch(`/profile`);
      if (data) return data;
    } catch (e: any) {
      if (e.status === 404) {
        // Profile doesn't exist, create it
        const identity = deriveProfileIdentity(authUser, userId);
        const result = await apiFetch(`/profile`, {
          method: "POST",
          body: JSON.stringify({
            id: userId,
            email: authUser?.email ?? null,
            display_name: identity.displayName,
            username: identity.username,
          }),
        });
        return result;
      }
      throw e;
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string, authUser?: { user_metadata?: Record<string, unknown>; email?: string | null } | null) => {
    try {
      const data = await ensureProfileRow(userId, authUser);

      if (activeProfileUserIdRef.current !== userId) {
        return;
      }

      const mergedProfile: AuthProfile = {
        ...createProfileFallback(userId),
        ...getSanitizedUserMetadata(authUser),
        ...loadProfileCache(userId),
        ...(data ?? {}),
        email: authUser?.email ?? null,
      };

      if (shouldNormalizeSeededLiveBalance(mergedProfile)) {
        mergedProfile.balance = 0;
        mergedProfile.welcome_bonus_granted_at = null;

        void apiFetch(`/profile`, {
          method: "PATCH",
          body: JSON.stringify({
            balance: 0,
            welcome_bonus_granted_at: null,
          }),
        }).catch((error) => {
          if (error) {
            console.error("Failed to clear legacy seeded live balance", error);
          }
        });
      }

      if (activeProfileUserIdRef.current !== userId) {
        return;
      }

      setProfile(mergedProfile);
    } catch (error) {
      console.error("Failed to fetch profile", error);

      if (activeProfileUserIdRef.current !== userId) {
        return;
      }

      const fallbackProfile: AuthProfile = {
        ...createProfileFallback(userId),
        ...getSanitizedUserMetadata(authUser),
        ...loadProfileCache(userId),
        email: authUser?.email ?? null,
      };

      if (shouldNormalizeSeededLiveBalance(fallbackProfile)) {
        fallbackProfile.balance = 0;
        fallbackProfile.welcome_bonus_granted_at = null;
      }

      setProfile(fallbackProfile);
    }
  }, [ensureProfileRow]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id, { user_metadata: user.user_metadata, email: user.email });
  }, [fetchProfile, user]);

  const updateProfile = useCallback(async (updates: ProfileUpdateInput) => {
    if (!user) return;

    await ensureProfileRow(user.id, user);

    const profileUpdates: Record<string, unknown> = {};
    const metadataUpdates: Record<string, unknown> = { ...updates };

    if (Object.prototype.hasOwnProperty.call(updates, "avatar_url")) {
      profileUpdates.avatar_url = updates.avatar_url ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "username")) {
      const trimmedUsername = String(updates.username ?? "").trim();
      profileUpdates.username = trimmedUsername || null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "kyc_status")) {
      profileUpdates.kyc_status = updates.kyc_status ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "kyc_documents")) {
      profileUpdates.kyc_documents = updates.kyc_documents ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "nationality")) {
      profileUpdates.nationality = updates.nationality ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "phoneCountry")) {
      profileUpdates.phone_country = (updates as any).phoneCountry ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "phoneCountryCode")) {
      profileUpdates.phone_country_code = (updates as any).phoneCountryCode ?? null;
    }

    delete metadataUpdates.avatar_url;
    delete metadataUpdates.username;
    delete metadataUpdates.kyc_status;
    delete metadataUpdates.kyc_documents;
    delete metadataUpdates.platform_email_verified_at;

    if (Object.keys(profileUpdates).length > 0) {
      try {
        await apiFetch(`/profile`, {
          method: "PATCH",
          body: JSON.stringify(profileUpdates),
        });
      } catch (error) {
        if (!isMissingProfileCountryColumnError(error)) throw error;

        const fallbackProfileUpdates = { ...profileUpdates } as Record<string, unknown>;
        delete fallbackProfileUpdates.nationality;
        delete fallbackProfileUpdates.phone_country;
        delete fallbackProfileUpdates.phone_country_code;

        if (Object.keys(fallbackProfileUpdates).length > 0) {
          await apiFetch(`/profile`, {
            method: "PATCH",
            body: JSON.stringify(fallbackProfileUpdates),
          });
        }
      }
    }

    saveProfileCache(user.id, metadataUpdates);

    // Update the Appwrite user's display name with profile edits (best-effort).
    if (Object.keys(metadataUpdates).length > 0) {
      try {
        const displayName = metadataUpdates.username as string | undefined;
        if (displayName) {
          await updateDisplayName(displayName).catch(() => undefined);
        }
      } catch (error) {
        console.error("Failed to update Appwrite user metadata", error);
      }
    }

    await fetchProfile(user.id, {
      user_metadata: { ...(user.user_metadata ?? {}), ...metadataUpdates },
      email: user.email,
    } as { user_metadata: Record<string, unknown>; email: string | null });
  }, [ensureProfileRow, fetchProfile, user]);

  const sendEmailVerificationCode = useCallback(async () => {
    const result = await apiFetch(`/rpc/send_email_verification_code`, {
      method: "POST",
    }).catch(() => null);

    if (!result) {
      return {
        cooldownSeconds: null,
        email: null,
        expiresAt: null,
        status: null,
      };
    }

    const payload = asObjectRecord(result);

    return {
      cooldownSeconds: typeof payload.cooldown_seconds === "number" ? payload.cooldown_seconds : null,
      email: readString(payload.email),
      expiresAt: readString(payload.expires_at),
      status: readString(payload.status),
    };
  }, []);

  const verifyEmailCode = useCallback(async (code: string) => {
    const result = await apiFetch(`/rpc/verify_email_with_code`, {
      method: "POST",
      body: JSON.stringify({ p_code: code }),
    });

    const payload = asObjectRecord(result);

    return {
      email: readString(payload.email),
      status: readString(payload.status),
      verifiedAt: readString(payload.verified_at),
    };
  }, []);

  const refreshAuthUser = useCallback(async () => {
    const appUser = firebaseUserToAppUser(firebaseUser);
    if (!appUser) return;

    setUser(appUser);
    setSession({ user: { id: appUser.id } });

    if (activeProfileUserIdRef.current === appUser.id) {
      await fetchProfile(appUser.id, appUser);
    }
  }, [fetchProfile, firebaseUser]);

  // Listen for Firebase auth state changes
  useEffect(() => {
    if (!isLoaded) return;

    const handler = () => {
      if (!isIntentionalSignOutRef.current) {
        void refreshAuthUser();
      }
      isIntentionalSignOutRef.current = false;
    };

    window.addEventListener("firebase-auth-state-change", handler);
    return () => window.removeEventListener("firebase-auth-state-change", handler);
  }, [isLoaded, refreshAuthUser]);

  const toAuthError = (message: string, status = 400) =>
    ({ message, status }) as { message: string; status: number };

  const persistToken = useCallback(async () => {
    try {
      const token = await getIdToken(true);
      if (token) {
        localStorage.setItem("session_token", token);
      } else {
        localStorage.removeItem("session_token");
      }
    } catch {
      localStorage.removeItem("session_token");
    }
  }, []);

  const signUp = async (email: string, password: string, username?: string, referredByCode?: string) => {
    if (!isLoaded) {
      return { error: toAuthError("Authentication provider is not ready. Reload the page and try again.", 500) };
    }

    const displayName = username ?? email.split("@")[0] ?? "trader";

    try {
      const { user: fbUser, error } = await signUpEmail(email, password, displayName);
      if (error) return { error: toAuthError(error.message, 400) };

      // Attach referral code (best-effort) as a custom claim-friendly metadata
      // field stored on the profile row via the API after sign-in.
      if (fbUser && referredByCode) {
        void fbUser
          .getIdToken(true)
          .then((token) =>
            fetch("/api/profile/referral", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ code: referredByCode.trim().toUpperCase() }),
            }).catch(() => undefined),
          )
          .catch(() => undefined);
      }

      void persistToken();
      return { error: null };
    } catch (error: any) {
      const message = error?.message || "Registration failed. Please try again.";
      return { error: toAuthError(message, error?.status || 400) };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isLoaded) {
      return { error: toAuthError("Authentication provider is not ready. Reload the page and try again.", 500) };
    }

    try {
      const { error } = await signInEmail(email, password);
      if (error) return { error: toAuthError(error.message, 400) };
      void persistToken();
      return { error: null };
    } catch (error: any) {
      const message = error?.message || "Login failed. Please try again.";
      return { error: toAuthError(message, error?.status || 400) };
    }
  };

  const signInWithGoogle = async () => {
    if (!isLoaded) {
      return { error: toAuthError("Authentication provider is not ready. Reload the page and try again.", 500) };
    }

    try {
      const { error } = await signInWithGoogleRedirect();
      if (error) return { error: toAuthError(error.message, 400) };
      // The redirect flow navigates the whole tab to Google, so no manual
      // navigation is needed here. On return, resolveGoogleRedirectResult
      // in the AuthProvider init effect completes the sign-in, and the
      // restore path is honoured by the auth restore helpers.
      return { error: null };
    } catch (error: any) {
      const message =
        error?.message || error?.code || "Google sign-in failed. Please try again.";
      return { error: toAuthError(message, 500) };
    }
  };

  const signOut = async () => {
    isIntentionalSignOutRef.current = true;
    await appwriteSignOut();
    localStorage.removeItem("session_token");
    clearAuthRestorePath();
    activeProfileUserIdRef.current = null;
    setUser(null);
    setSession(null);
    setProfile(null);
    window.location.replace(window.location.origin + "/login");
  };

  const resetPassword = async (email: string) => {
    if (!appwriteAccount) return { error: toAuthError("Authentication provider is not ready.", 500) };
    try {
      const redirectUrl = `${window.location.origin}/forgot`;
      const { error } = await sendPasswordReset(email, redirectUrl);
      if (error) return { error: toAuthError(error.message, 400) };
      return { error: null };
    } catch (error: any) {
      return { error: toAuthError(error?.message || "Password reset failed.", 503) };
    }
  };

  const verifyPasswordResetCode = async (email: string, code: string) => {
    try {
      // Appwrite sends a reset link (userId + secret) instead of a 6-digit code.
      // The code field in this UI is a placeholder; the actual secret arrives
      // via the URL query string on the /forgot page. We accept any non-empty
      // code here; the real application happens in updatePasswordAfterReset.
      if (code.length >= 4) return { error: null };
      return { error: toAuthError("Invalid reset code.", 400) };
    } catch (error: any) {
      return { error: toAuthError(error?.message || "Password reset verification failed.", 503) };
    }
  };

  const updatePasswordAfterReset = async (newPassword: string) => {
    try {
      // Read userId + secret from the Appwrite recovery link query params.
      const params = new URLSearchParams(window.location.search);
      const userId = params.get("userId") ?? params.get("user_id");
      const secret = params.get("secret");
      if (!userId || !secret) {
        return { error: toAuthError("Password reset link is invalid or expired.", 400) };
      }
      const { error } = await completePasswordReset(userId, secret, newPassword);
      if (error) return { error: toAuthError(error.message, 400) };
      return { error: null };
    } catch (error: any) {
      return { error: toAuthError(error?.message || "Password update failed.", 503) };
    }
  };

  const emailVerifiedAt = getEmailVerifiedAt(firebaseUser);
  const emailVerified = Boolean(emailVerifiedAt);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        emailVerified,
        emailVerifiedAt,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
        sendEmailVerificationCode,
        updateProfile,
        verifyEmailCode,
        resetPassword,
        verifyPasswordResetCode,
        updatePasswordAfterReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
