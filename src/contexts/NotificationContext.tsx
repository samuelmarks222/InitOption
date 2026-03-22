import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { NotificationEffectsLayer } from "@/components/notifications/NotificationEffectsLayer";
import type { AppNotification } from "@/lib/notifications";

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

interface NotificationEffect {
  id: string;
  type: string;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const MAX_NOTIFICATIONS = 100;

const sortNotifications = (items: AppNotification[]) =>
  [...items]
    .filter((item) => !item.expires_at || new Date(item.expires_at).getTime() > Date.now())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, MAX_NOTIFICATIONS);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user, refreshProfile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [effects, setEffects] = useState<NotificationEffect[]>([]);
  const initializedRef = useRef(false);

  const queueEffect = useCallback((type: string) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `notification_effect_${Date.now()}`;
    setEffects((current) => [...current, { id, type }]);
    window.setTimeout(() => {
      setEffects((current) => current.filter((effect) => effect.id !== id));
    }, 2200);
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(MAX_NOTIFICATIONS);

    if (!error) {
      setNotifications(sortNotifications((data ?? []) as AppNotification[]));
    }
    setLoading(false);
    initializedRef.current = true;
  }, [user]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const nextNotification = payload.new as AppNotification;
          setNotifications((current) => sortNotifications([nextNotification, ...current]));

          if (initializedRef.current) {
            toast({
              title: nextNotification.title,
              description: nextNotification.message,
            });

            if (nextNotification.type === "welcome_bonus" || nextNotification.type === "deposit_bonus" || nextNotification.type === "referral_commission") {
              queueEffect(nextNotification.type);
              void refreshProfile();
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const nextNotification = payload.new as AppNotification;
          setNotifications((current) =>
            sortNotifications(current.map((item) => (item.id === nextNotification.id ? nextNotification : item))),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queueEffect, refreshProfile, user]);

  const markNotificationRead = useCallback(
    async (id: string) => {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? { ...notification, is_read: true } : notification,
        ),
      );

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user?.id ?? "");
    },
    [user?.id],
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!user) return;

    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }, [user]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((notification) => !notification.is_read).length,
      loading,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [loading, markAllNotificationsRead, markNotificationRead, notifications, refreshNotifications],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationEffectsLayer effects={effects} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
};
