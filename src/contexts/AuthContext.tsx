import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import { toast } from "sonner";
import { clearAuthRestorePath, getAuthRestorePath } from "@/lib/authRedirect";
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

// API helper for profile operations
const apiFetch = async (path: string, opts: RequestInit = {}): Promise<unknown> => {
  const token = localStorage.getItem("clerk_session_token");
  const headers = new Headers(opts.headers as Record<string, string>);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", "application/json");

  const res = await fetch(`/api${path}`, { ...opts, headers });
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error: { message: string; status?: number } = {
      message: payload.error || res.statusText,
      status: res.status,
    };
    throw error;
  }
  return payload.data ?? payload;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken, signOut: clerkSignOut } = useClerkAuth();
  const clerk = useClerk();

  const [user, setUser] = useState<{ id: string; email: string | null; user_metadata: Record<string, unknown> } | null>(null);
  const [session, setSession] = useState<{ user: { id: string } | null } | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const activeProfileUserIdRef = useRef<string | null>(null);
  const isIntentionalSignOutRef = useRef(false);

  // Sync Clerk user -> app user object
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && clerkUser) {
      const appUser = {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || null,
        user_metadata: { ...(clerkUser.publicMetadata ?? {}), ...(clerkUser.unsafeMetadata ?? {}) },
      };

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
  }, [isLoaded, isSignedIn, clerkUser]);

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

    // Update Clerk user metadata
    if (Object.keys(metadataUpdates).length > 0) {
      try {
        await clerk.user?.update({
          publicMetadata: {
            ...(clerkUser?.publicMetadata ?? {}),
            ...metadataUpdates,
          },
        });
      } catch (error) {
        console.error("Failed to update Clerk user metadata", error);
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
    if (!clerkUser) return;

    const appUser = {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || null,
      user_metadata: { ...(clerkUser.publicMetadata ?? {}), ...(clerkUser.unsafeMetadata ?? {}) },
    };

    setUser(appUser);
    setSession({ user: { id: appUser.id } });

    if (activeProfileUserIdRef.current === appUser.id) {
      await fetchProfile(appUser.id, appUser);
    }
  }, [fetchProfile]);

  // Listen for Clerk auth state changes
  useEffect(() => {
    if (!isLoaded) return;

    const handleAuthChange = () => {
      void refreshAuthUser();
    };

    const handler = () => {
      if (!isIntentionalSignOutRef.current) {
        handleAuthChange();
      }
      isIntentionalSignOutRef.current = false;
    };

    window.addEventListener("clerk-auth-state-change", handler);
    return () => window.removeEventListener("clerk-auth-state-change", handler);
  }, [isLoaded, refreshAuthUser]);

  const toAuthError = (message: string, status = 400) =>
    ({ message, status }) as { message: string; status: number };

  const signUp = async (email: string, password: string, username?: string, referredByCode?: string) => {
    if (!isLoaded || !clerk.signUp) {
      return { error: toAuthError("Authentication provider is not ready. Reload the page and try again.", 500) };
    }

    if (!username) {
      const domain = email.split("@")[0] ?? "trader";
      username = domain;
    }

    try {
      const attempt = await clerk.signUp.create({
        emailAddress: email,
        password,
        publicMetadata: { username },
        unsafeMetadata: { referred_by_code: referredByCode ? referredByCode.trim().toUpperCase() : undefined },
      });

      if (attempt.status === "complete") {
        await clerk.signIn.setActive({ session: attempt.createdSessionId ?? undefined });
        const token = await getToken({ skipCache: true });
        if (token) localStorage.setItem("clerk_session_token", token);
        return { error: null };
      }

      // "missing_1" verification code (email not yet verified) is expected — Clerk
      // emailed the verification link; the session becomes active after the user
      // clicks the email verification link or enters the code.
      toast.info("Check your email to verify your account, then sign in.");
      return { error: null };
    } catch (error: any) {
      const message =
        error?.message ||
        error?.errors?.[0]?.message ||
        "Registration failed. Please try again.";
      return { error: toAuthError(message, error?.status || 400) };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isLoaded || !clerk.signIn) {
      return { error: toAuthError("Authentication provider is not ready. Reload the page and try again.", 500) };
    }

    try {
      const attempt = await clerk.signIn.create({
        identifier: email,
        password,
      });

      if (attempt.status === "complete") {
        await clerk.signIn.setActive({ session: attempt.createdSessionId ?? undefined });
        const token = await getToken({ skipCache: true });
        if (token) localStorage.setItem("clerk_session_token", token);
        return { error: null };
      }

      // Pending multi-factor or verification step — surface the next-required action.
      return { error: toAuthError(attempt.nextStrategy?.name || "Authentication flow requires additional steps.", 400) };
    } catch (error: any) {
      const message =
        error?.message ||
        error?.errors?.[0]?.message ||
        "Login failed. Please try again.";
      return { error: toAuthError(message, error?.status || 400) };
    }
  };

  const signInWithGoogle = async () => {
    if (!isLoaded || !clerk.signIn) {
      return { error: toAuthError("Authentication provider is not ready. Reload the page and try again.", 500) };
    }

    try {
      const redirectPath = getAuthRestorePath() || "/trade";
      await clerk.signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/auth/callback`,
        redirectTo: `${window.location.origin}${redirectPath}`,
      });
      return { error: null };
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === "string" ? error : "") ||
        "Google sign-in failed. Please try again.";
      return { error: toAuthError(message, 500) };
    }
  };

  const signOut = async () => {
    isIntentionalSignOutRef.current = true;
    await clerkSignOut();
    localStorage.removeItem("clerk_session_token");
    clearAuthRestorePath();
    activeProfileUserIdRef.current = null;
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        return {
          error: toAuthError(payload.error || "Password reset failed.", response.status),
        };
      }

      return { error: null };
    } catch {
      return {
        error: toAuthError("Password reset request failed. Please try again.", 503),
      };
    }
  };

  const verifyPasswordResetCode = async (email: string, code: string) => {
    // Clerk handles password reset codes differently — this is mainly for compatibility
    return { error: toAuthError("Password reset verification is handled by Clerk.", 400) };
  };

  const updatePasswordAfterReset = async (newPassword: string) => {
    try {
      await clerk.user?.update({ password: newPassword });
      return { error: null };
    } catch {
      return {
        error: toAuthError("Password update failed. Please try again.", 503),
      };
    }
  };

  const emailVerifiedAt = getEmailVerifiedAt(clerkUser);
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
