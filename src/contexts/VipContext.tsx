import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  calculateVipTier,
  formatVipCurrency,
  getNextVipTier,
  getVipProgressMetrics,
  getVipTierById,
  VipTierConfig,
  VipTierId,
} from "@/lib/vip";

interface VipNotification {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
}

interface VipSnapshot {
  totalDeposit: number;
  manualOverride: VipTierId | null;
  currentTier: VipTierId;
  pendingDowngrade?: {
    from: VipTierId;
    target: VipTierId;
    startedAt: string;
  } | null;
  notifications: VipNotification[];
}

interface VipState {
  currentTier: VipTierConfig;
  computedTier: VipTierConfig;
  nextTier: VipTierConfig | null;
  totalDeposit: number;
  tradeVolume30d: number;
  tradeCount30d: number;
  progressMetrics: ReturnType<typeof getVipProgressMetrics>;
  manualOverride: VipTierId | null;
}

interface VipContextValue {
  vip: VipState;
  notifications: VipNotification[];
  unreadCount: number;
  recordDeposit: (amount: number) => Promise<void>;
  refreshVip: () => Promise<void>;
  setManualOverride: (tierId: VipTierId | null) => Promise<void>;
  markNotificationRead: (id: string) => void;
}

const DEFAULT_SNAPSHOT: VipSnapshot = {
  totalDeposit: 0,
  manualOverride: null,
  currentTier: "none",
  pendingDowngrade: null,
  notifications: [],
};

const VipContext = createContext<VipContextValue | undefined>(undefined);

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const makeNotification = (title: string, description: string): VipNotification => ({
  id: globalThis.crypto?.randomUUID?.() ?? `vip_notice_${Date.now()}`,
  title,
  description,
  createdAt: new Date().toISOString(),
  read: false,
});

export const VipProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [snapshot, setSnapshot] = useState<VipSnapshot>(DEFAULT_SNAPSHOT);
  const [tradeVolume30d, setTradeVolume30d] = useState(0);
  const [tradeCount30d, setTradeCount30d] = useState(0);
  const snapshotKey = user ? `vip_snapshot_${user.id}` : null;
  const snapshotKeyRef = useRef<string | null>(null);

  const persistSnapshot = useCallback((next: VipSnapshot) => {
    if (!snapshotKeyRef.current) return;
    localStorage.setItem(snapshotKeyRef.current, JSON.stringify(next));
  }, []);

  useEffect(() => {
    snapshotKeyRef.current = snapshotKey;
    if (!snapshotKey) {
      setSnapshot(DEFAULT_SNAPSHOT);
      setTradeVolume30d(0);
      setTradeCount30d(0);
      return;
    }

    const raw = localStorage.getItem(snapshotKey);
    if (!raw) {
      setSnapshot(DEFAULT_SNAPSHOT);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<VipSnapshot>;
      setSnapshot({
        totalDeposit: parsed.totalDeposit ?? 0,
        manualOverride: parsed.manualOverride ?? null,
        currentTier: parsed.currentTier ?? "none",
        pendingDowngrade: parsed.pendingDowngrade ?? null,
        notifications: parsed.notifications ?? [],
      });
    } catch {
      setSnapshot(DEFAULT_SNAPSHOT);
    }
  }, [snapshotKey]);

  useEffect(() => {
    if (!profile || !user) return;
    const profileData = profile as any;

    setSnapshot((prev) => {
      const nextSnapshot = {
        ...prev,
        totalDeposit: Math.max(prev.totalDeposit, Number(profileData.total_deposit ?? 0)),
        currentTier: (profileData.vip_tier_override ?? profileData.vip_tier ?? prev.currentTier ?? "none") as VipTierId,
        manualOverride: (profileData.vip_tier_override ?? prev.manualOverride ?? null) as VipTierId | null,
      };
      persistSnapshot(nextSnapshot);
      return nextSnapshot;
    });

    setTradeVolume30d((current) => Math.max(current, Number(profileData.total_trade_volume_30d ?? 0)));
    setTradeCount30d((current) => Math.max(current, Number(profileData.trade_count_30d ?? 0)));
  }, [persistSnapshot, profile, user]);

  const refreshVip = useCallback(async () => {
    if (!user) return;

    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
    const { data: recentTrades } = await supabase
      .from("trades")
      .select("amount,status,closed_at")
      .eq("user_id", user.id)
      .neq("status", "open")
      .gte("closed_at", cutoff);

    const trades = recentTrades ?? [];
    const nextVolume = trades.reduce((sum, trade) => sum + Number(trade.amount ?? 0), 0);
    const nextCount = trades.length;
    setTradeVolume30d(nextVolume);
    setTradeCount30d(nextCount);

    setSnapshot((prev) => {
      const computedTier = calculateVipTier({
        totalDeposit: prev.totalDeposit,
        tradeVolume30d: nextVolume,
        tradeCount30d: nextCount,
      });
      const previousTierId = prev.manualOverride ?? prev.currentTier ?? "none";
      let nextTierId: VipTierId = prev.manualOverride ?? computedTier.id;
      let pendingDowngrade = prev.pendingDowngrade ?? null;
      const notifications = [...prev.notifications];

      if (!prev.manualOverride && getVipTierById(previousTierId).level > computedTier.level) {
        if (!pendingDowngrade || pendingDowngrade.from !== previousTierId || pendingDowngrade.target !== computedTier.id) {
          pendingDowngrade = {
            from: previousTierId,
            target: computedTier.id,
            startedAt: new Date().toISOString(),
          };
          notifications.unshift(
            makeNotification(
              "VIP review started",
              `Your ${getVipTierById(previousTierId).name} status is under review. Maintain activity within 30 days to avoid downgrade.`,
            ),
          );
          nextTierId = previousTierId;
        } else {
          const startedAt = new Date(pendingDowngrade.startedAt).getTime();
          if (Date.now() - startedAt >= THIRTY_DAYS_MS) {
            nextTierId = computedTier.id;
            notifications.unshift(
              makeNotification(
                computedTier.id === "none" ? "VIP status removed" : `VIP downgraded to ${computedTier.name}`,
                computedTier.id === "none"
                  ? "Your account no longer meets the minimum VIP activity thresholds."
                  : `Your activity moved you to ${computedTier.name}. Keep trading to climb back up.`,
              ),
            );
            pendingDowngrade = null;
          } else {
            nextTierId = previousTierId;
          }
        }
      } else {
        pendingDowngrade = null;
        nextTierId = prev.manualOverride ?? computedTier.id;
      }

      if (!prev.manualOverride && getVipTierById(nextTierId).level < computedTier.level) {
        nextTierId = computedTier.id;
        notifications.unshift(
          makeNotification(
            `VIP upgraded to ${computedTier.name}`,
            `You unlocked ${computedTier.name} by reaching ${formatVipCurrency(prev.totalDeposit)} deposits, ${formatVipCurrency(nextVolume)} 30d volume, and ${nextCount} trades.`,
          ),
        );
      }

      const dedupedNotifications = notifications.slice(0, 20);
      const nextSnapshot = {
        ...prev,
        currentTier: nextTierId,
        pendingDowngrade,
        notifications: dedupedNotifications,
      };
      persistSnapshot(nextSnapshot);
      return nextSnapshot;
    });

    try {
      const latestSnapshotRaw = localStorage.getItem(snapshotKeyRef.current ?? "");
      const latestSnapshot = latestSnapshotRaw ? JSON.parse(latestSnapshotRaw) : null;
      await supabase
        .from("profiles")
        .update({
          vip_tier: getVipTierById(latestSnapshot?.manualOverride ?? latestSnapshot?.currentTier ?? "none").name,
          vip_tier_override: latestSnapshot?.manualOverride ?? null,
          total_deposit: latestSnapshot?.totalDeposit ?? 0,
          total_trade_volume_30d: nextVolume,
          trade_count_30d: nextCount,
        } as any)
        .eq("id", user.id);
    } catch {
      // Safe fallback while waiting for migration deployment.
    }
  }, [persistSnapshot, user]);

  useEffect(() => {
    if (!user) return;
    refreshVip();

    const tradesChannel = supabase
      .channel(`vip-trades-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` }, () => {
        refreshVip();
      })
      .subscribe();

    const onStorage = (event: StorageEvent) => {
      if (!snapshotKeyRef.current || event.key !== snapshotKeyRef.current || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as VipSnapshot;
        setSnapshot(parsed);
      } catch {
        // Ignore malformed storage writes.
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      supabase.removeChannel(tradesChannel);
    };
  }, [refreshVip, user]);

  const recordDeposit = useCallback(async (amount: number) => {
    if (!amount || amount <= 0) return;

    setSnapshot((prev) => {
      const nextSnapshot = {
        ...prev,
        totalDeposit: prev.totalDeposit + amount,
      };
      persistSnapshot(nextSnapshot);
      return nextSnapshot;
    });

    await refreshVip();
  }, [persistSnapshot, refreshVip]);

  const setManualOverride = useCallback(async (tierId: VipTierId | null) => {
    setSnapshot((prev) => {
      const nextTier = tierId ?? calculateVipTier({
        totalDeposit: prev.totalDeposit,
        tradeVolume30d,
        tradeCount30d,
      }).id;
      const notifications = [
        makeNotification(
          tierId ? `VIP manually set to ${getVipTierById(tierId).name}` : "VIP manual override cleared",
          tierId ? "An administrator updated your VIP tier." : "Your VIP tier is back on automatic evaluation.",
        ),
        ...prev.notifications,
      ].slice(0, 20);

      const nextSnapshot = {
        ...prev,
        manualOverride: tierId,
        currentTier: nextTier,
        pendingDowngrade: null,
        notifications,
      };
      persistSnapshot(nextSnapshot);
      return nextSnapshot;
    });

    try {
      await supabase
        .from("profiles")
        .update({
          vip_tier: tierId ? getVipTierById(tierId).name : null,
          vip_tier_override: tierId,
        } as any)
        .eq("id", user?.id ?? "");
    } catch {
      // Database columns may not exist until the migration is applied.
    }

    await refreshProfile();
  }, [persistSnapshot, refreshProfile, tradeCount30d, tradeVolume30d, user?.id]);

  const markNotificationRead = useCallback((id: string) => {
    setSnapshot((prev) => {
      const nextSnapshot = {
        ...prev,
        notifications: prev.notifications.map((note) => note.id === id ? { ...note, read: true } : note),
      };
      persistSnapshot(nextSnapshot);
      return nextSnapshot;
    });
  }, [persistSnapshot]);

  const vip = useMemo<VipState>(() => {
    const computedTier = calculateVipTier({
      totalDeposit: snapshot.totalDeposit,
      tradeVolume30d,
      tradeCount30d,
    });
    const currentTier = getVipTierById(snapshot.manualOverride ?? snapshot.currentTier);
    const nextTier = getNextVipTier(currentTier.id);

    return {
      currentTier,
      computedTier,
      nextTier,
      totalDeposit: snapshot.totalDeposit,
      tradeVolume30d,
      tradeCount30d,
      manualOverride: snapshot.manualOverride,
      progressMetrics: getVipProgressMetrics(
        {
          totalDeposit: snapshot.totalDeposit,
          tradeVolume30d,
          tradeCount30d,
        },
        nextTier,
      ),
    };
  }, [snapshot, tradeCount30d, tradeVolume30d]);

  const value = useMemo<VipContextValue>(() => ({
    vip,
    notifications: snapshot.notifications,
    unreadCount: snapshot.notifications.filter((note) => !note.read).length,
    recordDeposit,
    refreshVip,
    setManualOverride,
    markNotificationRead,
  }), [markNotificationRead, recordDeposit, refreshVip, setManualOverride, snapshot.notifications, vip]);

  return <VipContext.Provider value={value}>{children}</VipContext.Provider>;
};

export const useVip = () => {
  const context = useContext(VipContext);
  if (!context) throw new Error("useVip must be used within VipProvider");
  return context;
};
