import { api } from "@/integrations/api/client";
import { realtime } from "@/integrations/pusher/realtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type {
  CopyAmountType,
  CopyExecutionMode,
  CopySettingRecord,
  EnrichedCopySetting,
  FollowRow,
  SocialFeedRecord,
  TraderSummary,
} from "@/lib/social";

type SaveCopySettingInput = {
  enabled: boolean;
  amountType: CopyAmountType;
  executionMode: CopyExecutionMode;
  fixedAmount?: number | null;
  ratio?: number | null;
  maxPerTrade?: number | null;
  maxDaily?: number | null;
  stopLossPct?: number | null;
  expiryDate?: string | null;
};

interface SocialTradingContextValue {
  copySettings: EnrichedCopySetting[];
  followingIds: string[];
  loading: boolean;
  refreshSocial: () => Promise<void>;
  saveCopySetting: (targetUserId: string, input: SaveCopySettingInput) => Promise<void>;
  socialFeed: SocialFeedRecord[];
  stopCopying: (targetUserId: string) => Promise<void>;
  executeManualCopyTrade: (copySettingId: string, sourceTradeId: string) => Promise<boolean>;
  followTrader: (targetUserId: string) => Promise<void>;
  getCopySetting: (targetUserId?: string | null) => EnrichedCopySetting | undefined;
  isFollowing: (targetUserId?: string | null) => boolean;
  unfollowTrader: (targetUserId: string) => Promise<void>;
}

const SocialTradingContext = createContext<SocialTradingContextValue | null>(null);

const PROFILE_SUMMARY_SELECT =
  "id, username, display_name, avatar_url, vip_tier, created_at, total_profit, total_trades, total_wins, followers_count, following_count, social_trading_disabled";

const buildProfileMap = (profiles: Tables<"profiles">[] | null | undefined) =>
  Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile])) as Record<string, Tables<"profiles">>;

export const SocialTradingProvider = ({ children }: { children: React.ReactNode }) => {
  const { refreshProfile, user } = useAuth();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [copySettings, setCopySettings] = useState<EnrichedCopySetting[]>([]);
  const [socialFeed, setSocialFeed] = useState<SocialFeedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSocial = useCallback(async () => {
    if (!user?.id) {
      setFollowingIds([]);
      setCopySettings([]);
      setSocialFeed([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [followsResponse, copySettingsResponse, socialFeedResponse] = await Promise.all([
      api.from("follows")
        .select("*")
        .eq("follower_id", user.id)
        .order("created_at", { ascending: false }),
      api.from("copy_settings")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      api.from("social_feed")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const followsData = (followsResponse.data ?? []) as FollowRow[];
    const copySettingsData = (copySettingsResponse.data ?? []) as CopySettingRecord[];
    const socialFeedData = (socialFeedResponse.data ?? []) as SocialFeedRecord[];

    setFollowingIds(followsData.map((row) => row.followed_id));
    setSocialFeed(socialFeedData);

    if (copySettingsData.length === 0) {
      setCopySettings([]);
      setLoading(false);
      return;
    }

    const targetIds = [...new Set(copySettingsData.map((setting) => setting.target_user_id))];
    const { data: targetProfiles } = await api.from("profiles")
      .select(PROFILE_SUMMARY_SELECT)
      .in("id", targetIds);

    const profileMap = buildProfileMap(targetProfiles);
    setCopySettings(
      copySettingsData.map((setting) => ({
        ...setting,
        target: (profileMap[setting.target_user_id] as TraderSummary | undefined) ?? null,
      })),
    );

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refreshSocial();
  }, [refreshSocial]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = realtime
      .channel(`social-trading-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "social_feed", filter: `user_id=eq.${user.id}` },
        () => void refreshSocial(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows", filter: `follower_id=eq.${user.id}` },
        () => void refreshSocial(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "copy_settings", filter: `user_id=eq.${user.id}` },
        () => void refreshSocial(),
      )
      .subscribe();

    return () => {
      realtime.removeChannel(channel);
    };
  }, [refreshSocial, user?.id]);

  const followTrader = useCallback(
    async (targetUserId: string) => {
      const { error } = await api.rpc("follow_trader", { p_followed_id: targetUserId });
      if (error) {
        toast({
          title: "Unable to follow trader",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Trader followed", description: "Their trades will now appear in your social feed." });
      await refreshSocial();
      await refreshProfile();
    },
    [refreshProfile, refreshSocial],
  );

  const unfollowTrader = useCallback(
    async (targetUserId: string) => {
      const { error } = await api.rpc("unfollow_trader", { p_followed_id: targetUserId });
      if (error) {
        toast({
          title: "Unable to unfollow trader",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Trader unfollowed" });
      await refreshSocial();
      await refreshProfile();
    },
    [refreshProfile, refreshSocial],
  );

  const saveCopySetting = useCallback(
    async (targetUserId: string, input: SaveCopySettingInput) => {
      const { error } = await api.rpc("upsert_copy_setting", {
        p_target_user_id: targetUserId,
        p_enabled: input.enabled,
        p_amount_type: input.amountType,
        p_execution_mode: input.executionMode,
        p_fixed_amount: input.fixedAmount ?? null,
        p_ratio: input.ratio ?? null,
        p_max_per_trade: input.maxPerTrade ?? null,
        p_max_daily: input.maxDaily ?? null,
        p_stop_loss_pct: input.stopLossPct ?? null,
        p_expiry_date: input.expiryDate ?? null,
      });

      if (user?.id) {
        const copyPercentage = input.ratio ? Math.round(input.ratio * 100) : (input.fixedAmount ? Math.min(100, Math.max(1, input.fixedAmount)) : 20);
        const minAmount = input.fixedAmount ? Math.max(1, input.fixedAmount) : 1;
        const maxAmount = input.maxPerTrade ? Math.max(minAmount, input.maxPerTrade) : 50;

        await api.from("copy_trading_settings").delete().eq("follower_user_id", user.id).eq("master_user_id", targetUserId);

        if (input.enabled) {
          await api.from("copy_trading_settings").insert({
            follower_user_id: user.id,
            master_user_id: targetUserId,
            status: "active",
            copy_percentage: copyPercentage,
            minimum_trade_amount: minAmount,
            maximum_trade_amount: maxAmount,
            stop_balance: 0,
            auto_copy: input.executionMode === "automatic",
          });
        }
      }

      if (error) {
        toast({
          title: "Copy settings not saved",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Copy trading updated",
        description: input.enabled ? "Your copy settings are now active." : "Copy trading has been paused.",
      });
      await refreshSocial();
    },
    [refreshSocial, user?.id],
  );

  const stopCopying = useCallback(
    async (targetUserId: string) => {
      const { error } = await api.rpc("delete_copy_setting", { p_target_user_id: targetUserId });

      if (user?.id) {
        await api.from("copy_trading_settings").delete().eq("follower_user_id", user.id).eq("master_user_id", targetUserId);
      }

      if (error) {
        toast({
          title: "Unable to stop copying",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Copy trading stopped" });
      await refreshSocial();
    },
    [refreshSocial, user?.id],
  );

  const executeManualCopyTrade = useCallback(
    async (copySettingId: string, sourceTradeId: string) => {
      const { data, error } = await api.rpc("execute_manual_copy_trade", {
        p_copy_setting_id: copySettingId,
        p_source_trade_id: sourceTradeId,
      });

      if (error) {
        toast({
          title: "Copy trade failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      const status = (data?.status as string | undefined) ?? "copied";

      if (status === "insufficient_balance") {
        toast({
          title: "Copy skipped",
          description: "Your balance is too low for this manual copy.",
          variant: "destructive",
        });
        return false;
      }

      if (status === "daily_limit") {
        toast({
          title: "Copy skipped",
          description: "Your daily copy limit has been reached.",
          variant: "destructive",
        });
        return false;
      }

      if (status === "already_copied") {
        toast({ title: "Trade already copied" });
        return true;
      }

      toast({ title: "Copy trade opened" });
      await refreshSocial();
      await refreshProfile();
      return true;
    },
    [refreshProfile, refreshSocial],
  );

  const value = useMemo<SocialTradingContextValue>(
    () => ({
      copySettings,
      executeManualCopyTrade,
      followTrader,
      followingIds,
      getCopySetting: (targetUserId) => copySettings.find((setting) => setting.target_user_id === targetUserId),
      isFollowing: (targetUserId) => !!targetUserId && followingIds.includes(targetUserId),
      loading,
      refreshSocial,
      saveCopySetting,
      socialFeed,
      stopCopying,
      unfollowTrader,
    }),
    [copySettings, executeManualCopyTrade, followTrader, followingIds, loading, refreshSocial, saveCopySetting, socialFeed, stopCopying, unfollowTrader],
  );

  return <SocialTradingContext.Provider value={value}>{children}</SocialTradingContext.Provider>;
};

export const useSocialTrading = () => {
  const context = useContext(SocialTradingContext);

  if (!context) {
    throw new Error("useSocialTrading must be used within a SocialTradingProvider");
  }

  return context;
};
