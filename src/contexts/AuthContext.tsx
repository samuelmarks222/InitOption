import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { getEffectiveLiveBalance, shouldNormalizeSeededLiveBalance } from "@/lib/live-balance";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Tables<"profiles"> | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string, referredByCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [loading, setLoading] = useState(true);

  const getProfileCacheKey = (userId: string) => `profile_cache_${userId}`;
  const sanitizeDbOwnedProfileFields = (value: Record<string, any>) => {
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
    const metadata = { ...(authUser?.user_metadata ?? {}) } as Record<string, any>;
    return sanitizeDbOwnedProfileFields(metadata).nextValue;
  };

  const sanitizeProfileCache = (value: Record<string, any>) => {
    return sanitizeDbOwnedProfileFields(value);
  };

  const loadProfileCache = (userId: string) => {
    try {
      const raw = localStorage.getItem(getProfileCacheKey(userId));
      const parsed = raw ? JSON.parse(raw) : {};
      const { nextValue, changed } = sanitizeProfileCache(parsed);

      if (changed) {
        localStorage.setItem(getProfileCacheKey(userId), JSON.stringify(nextValue));
      }

      return nextValue;
    } catch {
      return {};
    }
  };

  const saveProfileCache = (userId: string, updates: Record<string, any>) => {
    const current = loadProfileCache(userId);
    const { nextValue } = sanitizeProfileCache({ ...current, ...updates });
    localStorage.setItem(getProfileCacheKey(userId), JSON.stringify(nextValue));
  };

  const fetchProfile = async (userId: string, authUser?: User | null) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    const cachedProfile = loadProfileCache(userId);
    const sanitizedMetadata = getSanitizedUserMetadata(authUser);
    const mergedProfile = data
      ? ({
          ...sanitizedMetadata,
          ...cachedProfile,
          ...data,
          email: authUser?.email ?? null,
        } as any)
      : ({
          ...sanitizedMetadata,
          ...cachedProfile,
          email: authUser?.email ?? null,
          id: userId,
        } as any);

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

    setProfile(mergedProfile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user);
  };

  const updateProfile = async (updates: any) => {
    if (!user) return;

    const profileUpdates: Record<string, any> = {};
    const metadataUpdates: Record<string, any> = { ...updates };

    if (Object.prototype.hasOwnProperty.call(updates, "avatar_url")) {
      profileUpdates.avatar_url = updates.avatar_url;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "username")) {
      const trimmedUsername = String(updates.username ?? "").trim();
      profileUpdates.username = trimmedUsername || null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "kyc_status")) {
      profileUpdates.kyc_status = updates.kyc_status;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "kyc_documents")) {
      profileUpdates.kyc_documents = updates.kyc_documents;
    }

    delete metadataUpdates.avatar_url;
    delete metadataUpdates.username;
    delete metadataUpdates.kyc_status;
    delete metadataUpdates.kyc_documents;

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(profileUpdates as any)
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
  };

  useEffect(() => {
    const isOAuthRedirect = window.location.hash.includes("access_token") || window.location.hash.includes("error_description");
    let fallbackTimeout: ReturnType<typeof setTimeout>;

    if (isOAuthRedirect) {
      fallbackTimeout = setTimeout(() => setLoading(false), 3000); // 3s fallback if parsing fails
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && fallbackTimeout) clearTimeout(fallbackTimeout);
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id, session.user), 0);
          setLoading(false);
        } else {
          setProfile(null);
          if (!isOAuthRedirect) setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user);
        setLoading(false);
      } else if (!isOAuthRedirect) {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, []);

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
  }, [user]);

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
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/trade',
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
