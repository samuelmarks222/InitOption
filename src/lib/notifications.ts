import { format, formatDistanceToNow } from "date-fns";
import { BellRing, Gift, Megaphone, Sparkles, Users, type LucideIcon } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

export type AppNotification = Tables<"notifications">;

export interface NotificationGroup {
  label: string;
  items: AppNotification[];
}

export interface NotificationVisual {
  icon: LucideIcon;
  accentClass: string;
  iconClass: string;
  chipLabel: string;
}

const startOfDayKey = (value: string) => format(new Date(value), "yyyy-MM-dd");

export const getNotificationVisual = (type: string): NotificationVisual => {
  switch (type) {
    case "announcement":
      return {
        icon: Megaphone,
        accentClass: "border-fuchsia-500/30 bg-fuchsia-500/10",
        iconClass: "text-fuchsia-300",
        chipLabel: "Announcement",
      };
    case "welcome_bonus":
      return {
        icon: Gift,
        accentClass: "border-emerald-500/30 bg-emerald-500/10",
        iconClass: "text-emerald-300",
        chipLabel: "Welcome Bonus",
      };
    case "deposit_bonus":
      return {
        icon: Sparkles,
        accentClass: "border-sky-500/30 bg-sky-500/10",
        iconClass: "text-sky-300",
        chipLabel: "Deposit Bonus",
      };
    case "referral_commission":
      return {
        icon: Users,
        accentClass: "border-amber-500/30 bg-amber-500/10",
        iconClass: "text-amber-300",
        chipLabel: "Referral",
      };
    default:
      return {
        icon: BellRing,
        accentClass: "border-white/10 bg-white/5",
        iconClass: "text-white",
        chipLabel: "Update",
      };
  }
};

export const formatNotificationRelativeTime = (value: string) =>
  formatDistanceToNow(new Date(value), { addSuffix: true });

export const groupNotificationsByDate = (notifications: AppNotification[]) => {
  const groups = new Map<string, NotificationGroup>();

  notifications.forEach((notification) => {
    const key = startOfDayKey(notification.created_at);
    if (!groups.has(key)) {
      groups.set(key, {
        label: format(new Date(notification.created_at), "EEEE, MMM d"),
        items: [],
      });
    }

    groups.get(key)!.items.push(notification);
  });

  return Array.from(groups.values());
};
