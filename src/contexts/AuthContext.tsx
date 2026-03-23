import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { type AuthError, type Session, type User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { type TablesUpdate } from "@/integrations/supabase/types";
import { getEffectiveLiveBalance, shouldNormalizeSeededLiveBalance } from "@/lib/live-balance";
import type { AuthProfile, ProfileUpdateInput } from "@/types/profile";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string, referredByCode?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: ProfileUpdateInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    kyc_documents: null,
    kyc_status: null,
    referral_code: "",
    referral_earnings: 0,
    referred_by: null,
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

  const fetchProfile = useCallback(async (userId: string, authUser?: User | null) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

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
      mergedProfile.balance = getEffectiveLiveBalance(mergedProfile);
      mergedProfile.welcome_bonus_granted_at = null;

      if (data) {
        void supabase
          .from("profiles")
          .update({
            balance: 0,
            welcome_bonus_granted_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
    }

    if (activeProfileUserIdRef.current !== userId) {
      return;
    }

    setProfile(mergedProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id, user);
  }, [fetchProfile, user]);

  const updateProfile = useCallback(async (updates: ProfileUpdateInput) => {
    if (!user) return;

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

    delete metadataUpdates.avatar_url;
    delete metadataUpdates.username;
    delete metadataUpdates.kyc_status;
    delete metadataUpdates.kyc_documents;

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", user.id);
      if (error) throw error;
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
  }, [fetchProfile, user]);

  useEffect(() => {
    const isOAuthRedirect = window.location.hash.includes("access_token") || window.location.hash.includes("error_description");
    let fallbackTimeout: ReturnType<typeof setTimeout>;

    if (isOAuthRedirect) {
      fallbackTimeout = setTimeout(() => setLoading(false), 3000);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (event === "SIGNED_IN" && fallbackTimeout) clearTimeout(fallbackTimeout);

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        activeProfileUserIdRef.current = nextSession?.user?.id ?? null;

        if (nextSession?.user) {
          setProfile((current) => (current?.id === nextSession.user.id ? current : null));
          setTimeout(() => {
            void fetchProfile(nextSession.user.id, nextSession.user);
          }, 0);
          setLoading(false);
        } else {
          setProfile(null);
          if (!isOAuthRedirect) setLoading(false);
        }
      }
    );

    void supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      activeProfileUserIdRef.current = nextSession?.user?.id ?? null;

      if (nextSession?.user) {
        setProfile((current) => (current?.id === nextSession.user.id ? current : null));
        void fetchProfile(nextSession.user.id, nextSession.user);
        setLoading(false);
      } else if (!isOAuthRedirect) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
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

  const signUp = async (email: string, password: string, username?: string, referredByCode?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split("@")[0],
          referred_by_code: referredByCode ? referredByCode.trim().toUpperCase() : undefined,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/trade`,
      }
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    activeProfileUserIdRef.current = null;
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signInWithGoogle, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
