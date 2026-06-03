import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { type AuthError, type Session, type User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { type TablesUpdate } from "@/integrations/supabase/types";
import { clearAuthRestorePath, getAuthRestorePath } from "@/lib/authRedirect";
import { shouldNormalizeSeededLiveBalance } from "@/lib/live-balance";
import type { AuthProfile, ProfileUpdateInput } from "@/types/profile";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  loading: boolean;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  signUp: (email: string, password: string, username?: string, referredByCode?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
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
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_SESSION_RESTORE_TIMEOUT_MS = 3500;
const OAUTH_SESSION_RESTORE_TIMEOUT_MS = 8000;

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

const getSanitizedUserMetadata = (authUser?: User | null) => {
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

const getEmailVerifiedAt = (authUser?: User | null) => {
  if (!authUser) return null;

  return (
    readString(asObjectRecord(authUser.user_metadata).platform_email_verified_at) ??
    readString(authUser.email_confirmed_at) ??
    readString(authUser.confirmed_at)
  );
};

const deriveProfileIdentity = (authUser: User | null | undefined, userId: string) => {
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const activeProfileUserIdRef = useRef<string | null>(null);

  const ensureProfileRow = useCallback(async (userId: string, authUser?: User | null) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }

    const identity = deriveProfileIdentity(authUser, userId);
    const insertPayload: TablesUpdate<"profiles"> & { id: string } = {
      id: userId,
      display_name: identity.displayName,
      username: identity.username,
    };

    const insertResponse = await supabase
      .from("profiles")
      .insert(insertPayload as never)
      .select("*")
      .maybeSingle();

    if (insertResponse.error) {
      const retryResponse = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (retryResponse.error) {
        throw retryResponse.error;
      }

      if (retryResponse.data) {
        return retryResponse.data;
      }

      throw insertResponse.error;
    }

    return insertResponse.data;
  }, []);

  const fetchProfile = useCallback(async (userId: string, authUser?: User | null) => {
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

        void supabase
          .from("profiles")
          .update({
            balance: 0,
            welcome_bonus_granted_at: null,
          } as TablesUpdate<"profiles">)
          .eq("id", userId)
          .eq("balance", 10000)
          .eq("total_deposit", 0)
          .eq("total_trades", 0)
          .then(({ error }) => {
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
    if (user) await fetchProfile(user.id, user);
  }, [fetchProfile, user]);

  const refreshAuthUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    if (!data.user) return;

    setUser(data.user);
    setSession((current) => (current ? { ...current, user: data.user } : current));

    if (activeProfileUserIdRef.current === data.user.id) {
      await fetchProfile(data.user.id, data.user);
    }
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: ProfileUpdateInput) => {
    if (!user) return;

    await ensureProfileRow(user.id, user);

    const profileUpdates: TablesUpdate<"profiles"> = {};
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
      profileUpdates.phone_country = updates.phoneCountry ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "phoneCountryCode")) {
      profileUpdates.phone_country_code = updates.phoneCountryCode ?? null;
    }

    delete metadataUpdates.avatar_url;
    delete metadataUpdates.username;
    delete metadataUpdates.kyc_status;
    delete metadataUpdates.kyc_documents;
    delete metadataUpdates.platform_email_verified_at;

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", user.id);
      if (error) {
        if (!isMissingProfileCountryColumnError(error)) throw error;

        const fallbackProfileUpdates = { ...(profileUpdates as Record<string, unknown>) };
        delete fallbackProfileUpdates.nationality;
        delete fallbackProfileUpdates.phone_country;
        delete fallbackProfileUpdates.phone_country_code;

        if (Object.keys(fallbackProfileUpdates).length > 0) {
          const { error: retryError } = await supabase
            .from("profiles")
            .update(fallbackProfileUpdates as TablesUpdate<"profiles">)
            .eq("id", user.id);

          if (retryError) throw retryError;
        }
      }
    }

    saveProfileCache(user.id, metadataUpdates);

    if (Object.keys(metadataUpdates).length > 0) {
      const sanitizedMetadata = getSanitizedUserMetadata(user);
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...sanitizedMetadata,
          ...metadataUpdates,
        },
      });

      if (error) throw error;
      if (data.user) setUser(data.user);
    }

    await fetchProfile(user.id, {
      ...user,
      user_metadata: {
        ...(user.user_metadata ?? {}),
        ...metadataUpdates,
      },
      email: user.email,
    } as User);
  }, [ensureProfileRow, fetchProfile, user]);

  const sendEmailVerificationCode = useCallback(async () => {
    const { data, error } = await supabase.rpc("send_email_verification_code");
    if (error) throw error;

    const payload = asObjectRecord(data);

    return {
      cooldownSeconds: typeof payload.cooldown_seconds === "number" ? payload.cooldown_seconds : null,
      email: readString(payload.email),
      expiresAt: readString(payload.expires_at),
      status: readString(payload.status),
    };
  }, []);

  const verifyEmailCode = useCallback(async (code: string) => {
    const { data, error } = await supabase.rpc("verify_email_with_code", {
      p_code: code,
    });
    if (error) throw error;

    await refreshAuthUser();

    const payload = asObjectRecord(data);

    return {
      email: readString(payload.email),
      status: readString(payload.status),
      verifiedAt: readString(payload.verified_at),
    };
  }, [refreshAuthUser]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const isOAuthRedirect =
      window.location.pathname === "/auth/callback" ||
      searchParams.has("code") ||
      searchParams.has("error") ||
      searchParams.has("error_description") ||
      hashParams.has("access_token") ||
      hashParams.has("error") ||
      hashParams.has("error_description");
    let fallbackTimeout: ReturnType<typeof setTimeout> | undefined;
    let isActive = true;

    const clearFallbackTimeout = () => {
      if (!fallbackTimeout) return;
      clearTimeout(fallbackTimeout);
      fallbackTimeout = undefined;
    };

    fallbackTimeout = setTimeout(() => {
      if (!isActive) return;
      console.warn("Auth session restore timed out. Continuing with a guest session.");
      setLoading(false);
    }, isOAuthRedirect ? OAUTH_SESSION_RESTORE_TIMEOUT_MS : AUTH_SESSION_RESTORE_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (event === "SIGNED_IN") clearFallbackTimeout();

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        activeProfileUserIdRef.current = nextSession?.user?.id ?? null;

        if (nextSession?.user) {
          clearFallbackTimeout();
          setProfile((current) => (current?.id === nextSession.user.id ? current : null));
          setTimeout(() => {
            void fetchProfile(nextSession.user.id, nextSession.user);
          }, 0);
          setLoading(false);
        } else {
          setProfile(null);
          if (!isOAuthRedirect) {
            clearFallbackTimeout();
            setLoading(false);
          }
        }
      }
    );

    void supabase.auth.getSession()
      .then(({ data: { session: nextSession } }) => {
        if (!isActive) return;

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        activeProfileUserIdRef.current = nextSession?.user?.id ?? null;

        if (nextSession?.user) {
          clearFallbackTimeout();
          setProfile((current) => (current?.id === nextSession.user.id ? current : null));
          void fetchProfile(nextSession.user.id, nextSession.user);
          setLoading(false);
        } else if (!isOAuthRedirect) {
          clearFallbackTimeout();
          setProfile(null);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!isActive) return;

        clearFallbackTimeout();
        console.error("Failed to restore auth session", error);
        activeProfileUserIdRef.current = null;
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      });

    return () => {
      isActive = false;
      subscription.unsubscribe();
      clearFallbackTimeout();
    };
  }, [fetchProfile]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => {
          void fetchProfile(user.id, user);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchProfile, user]);

  const getEmailConfirmationRedirectUrl = () => {
    const restorePath = getAuthRestorePath();
    const nextPath = restorePath || "/trade";
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  };

  const toAuthError = (message: string, status = 400) =>
    ({
      name: "AuthApiError",
      message,
      status,
    }) as AuthError;

  const signUpWithSupabaseConfirmation = async (
    email: string,
    password: string,
    username?: string,
    referredByCode?: string,
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split("@")[0],
          referred_by_code: referredByCode ? referredByCode.trim().toUpperCase() : undefined,
        },
        emailRedirectTo: getEmailConfirmationRedirectUrl(),
      },
    });

    return { error };
  };

  const signUp = async (email: string, password: string, username?: string, referredByCode?: string) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          username,
          referredByCode,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { code?: string; error?: string };

      if (response.ok) {
        return { error: null };
      }

      if (response.status === 501 && payload.code === "custom_email_unavailable") {
        return signUpWithSupabaseConfirmation(email, password, username, referredByCode);
      }

      return {
        error: toAuthError(payload.error || "Registration failed. Please try again.", response.status),
      };
    } catch {
      return signUpWithSupabaseConfirmation(email, password, username, referredByCode);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch {
      return {
        error: toAuthError("Login is taking longer than expected. Please try again in a moment.", 503),
      };
    }
  };

  const signInWithGoogle = async () => {
    const redirectPath = getAuthRestorePath() || "/trade";
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
        }
      });

      return { error };
    } catch {
      return {
        error: toAuthError("Google sign-in is taking longer than expected. Please try again in a moment.", 503),
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthRestorePath();
    activeProfileUserIdRef.current = null;
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      return { error };
    } catch {
      return {
        error: toAuthError("Password reset request failed. Please try again.", 503),
      };
    }
  };

  const emailVerifiedAt = getEmailVerifiedAt(user);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
