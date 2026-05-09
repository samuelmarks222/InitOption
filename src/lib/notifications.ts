import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BellRing,
  Copy,
  Gift,
  Megaphone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { type Json, Tables } from "@/integrations/supabase/types";

export type AppNotification = Tables<"notifications">;

export type NotificationRenderable = Pick<
  AppNotification,
  "id" | "type" | "title" | "message" | "link_url" | "data" | "is_read" | "created_at"
>;

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

export type NotificationTemplateVariant =
  | "platform"
  | "tournament"
  | "bonus"
  | "commission"
  | "finance"
  | "security"
  | "social"
  | "copy";

export interface NotificationTemplate {
  variant: NotificationTemplateVariant;
  visual: NotificationVisual;
  eyebrow: string;
  heroTitle: string;
  heroLabel: string;
  heroMetric: string | null;
  heroAccent: string | null;
  ctaLabel: string | null;
  href: string | null;
  actorHandle: string | null;
  assetSymbol: string | null;
  direction: "higher" | "lower" | null;
}

const startOfDayKey = (value: string) => format(new Date(value), "yyyy-MM-dd");

const asObjectRecord = (value: Json | null | undefined): Record<string, Json> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, Json>;
};

const readString = (record: Record<string, Json>, key: string) => {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const readNumber = (record: Record<string, Json>, key: string) => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const formatAmountLabel = (amount: number | null) => {
  if (amount === null) return null;
  return amount % 1 === 0 ? `$${amount.toLocaleString()}` : `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const extractCurrencyLabel = (...values: Array<string | null | undefined>) => {
  const joined = values.filter(Boolean).join(" ");
  const matched = joined.match(/\$\s?\d[\d,]*(?:\.\d+)?/);
  return matched ? matched[0].replace(/\s+/g, "") : null;
};

const extractAssetSymbol = (...values: Array<string | null | undefined>) => {
  const joined = values.filter(Boolean).join(" ");
  const matched = joined.match(/\b[A-Z]{2,6}\/[A-Z]{2,6}\b|\b[A-Z]{3,10}(?:USD|USDT|EUR|CHF|BTC|ETH)\b/);
  return matched ? matched[0] : null;
};

const normalizeNotificationHref = (href: string | null) => {
  if (!href) return null;
  if (/^\/settings(?:[/?#]|$)/i.test(href)) return "/trade";
  return href;
};

const normalizeDirection = (value: string | null) => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "higher" || normalized === "up") return "higher";
  if (normalized === "lower" || normalized === "down") return "lower";
  return null;
};

const guessActorHandle = (title: string, record: Record<string, Json>) => {
  const actorUsername = readString(record, "actor_username");
  if (actorUsername) return actorUsername.startsWith("@") ? actorUsername : `@${actorUsername}`;

  const titleHandle = title.match(/@\w[\w.-]*/);
  return titleHandle ? titleHandle[0] : null;
};

const getDefaultCtaLabel = (href: string | null, variant: NotificationTemplateVariant) => {
  if (!href) return null;

  if (/^https?:\/\//i.test(href)) return "Open the update.";
  if (href.startsWith("/tournaments")) return "Open the Tournaments section.";
  if (href.startsWith("/trade/history")) return "Open trade history.";
  if (href.startsWith("/deposit")) return "Open deposits.";
  if (href.startsWith("/withdraw")) return "Open withdrawals.";
  if (href.startsWith("/notifications")) return "Open notification history.";
  if (href.startsWith("/traders/")) return "View trader profile.";
  if (href.startsWith("/trade")) {
    if (variant === "bonus") return "Start trading now.";
    if (variant === "copy") return "Open the trading desk.";
    return "Open the trading desk.";
  }

  return "Open the update.";
};

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
    case "promo_code_activated":
      return {
        icon: Sparkles,
        accentClass: "border-violet-500/30 bg-violet-500/10",
        iconClass: "text-violet-200",
        chipLabel: "Promo",
      };
    case "referral_commission":
      return {
        icon: Users,
        accentClass: "border-amber-500/30 bg-amber-500/10",
        iconClass: "text-amber-300",
        chipLabel: "Referral",
      };
    case "deposit_requested":
    case "deposit_approved":
    case "deposit_rejected":
    case "crypto_deposit_confirmed":
      return {
        icon: ArrowDownToLine,
        accentClass: "border-emerald-500/30 bg-emerald-500/10",
        iconClass: "text-emerald-200",
        chipLabel: "Deposit",
      };
    case "withdrawal_requested":
    case "withdrawal_approved":
    case "withdrawal_processing":
    case "withdrawal_completed":
    case "withdrawal_failed":
    case "withdrawal_rejected":
      return {
        icon: ArrowUpFromLine,
        accentClass: "border-orange-500/30 bg-orange-500/10",
        iconClass: "text-orange-200",
        chipLabel: "Withdrawal",
      };
    case "tournament_joined":
    case "tournament_started":
    case "tournament_ended":
    case "tournament_prize":
    case "tournament_cancelled":
      return {
        icon: Trophy,
        accentClass: "border-blue-500/30 bg-blue-500/10",
        iconClass: "text-blue-200",
        chipLabel: "Tournament",
      };
    case "trade_result":
      return {
        icon: TrendingUp,
        accentClass: "border-cyan-500/30 bg-cyan-500/10",
        iconClass: "text-cyan-200",
        chipLabel: "Trade",
      };
    case "kyc_approved":
    case "kyc_rejected":
    case "email_verification_code":
    case "email_verified":
      return {
        icon: ShieldCheck,
        accentClass: "border-slate-500/30 bg-slate-500/10",
        iconClass: "text-slate-200",
        chipLabel: "Security",
      };
    case "social_follow":
      return {
        icon: Users,
        accentClass: "border-fuchsia-500/30 bg-fuchsia-500/10",
        iconClass: "text-fuchsia-200",
        chipLabel: "Follower",
      };
    case "social_trade":
      return {
        icon: TrendingUp,
        accentClass: "border-blue-500/30 bg-blue-500/10",
        iconClass: "text-blue-200",
        chipLabel: "Followed Trade",
      };
    case "copy_trade":
      return {
        icon: Copy,
        accentClass: "border-cyan-500/30 bg-cyan-500/10",
        iconClass: "text-cyan-200",
        chipLabel: "Copy Trade",
      };
    case "trade_copied":
      return {
        icon: Copy,
        accentClass: "border-emerald-500/30 bg-emerald-500/10",
        iconClass: "text-emerald-200",
        chipLabel: "Copied",
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

export const getNotificationTemplate = (notification: NotificationRenderable): NotificationTemplate => {
  const record = asObjectRecord(notification.data);
  const visual = getNotificationVisual(notification.type);
  const href = normalizeNotificationHref(notification.link_url);
  const amountLabel =
      formatAmountLabel(readNumber(record, "amount")) ??
      extractCurrencyLabel(notification.title, notification.message);
  const profitLabel = formatAmountLabel(readNumber(record, "profit"));
  const assetSymbol =
    readString(record, "asset_symbol") ??
    extractAssetSymbol(notification.title, notification.message);
  const actorHandle = guessActorHandle(notification.title, record);
  const direction = normalizeDirection(readString(record, "direction"));
  const combinedText = `${notification.title} ${notification.message} ${href ?? ""}`.toLowerCase();

  if (notification.type === "announcement") {
    const tournamentAnnouncement =
      /tournament|showdown|leaderboard|winners|prize|free entry|competition/.test(combinedText);

    return {
      variant: tournamentAnnouncement ? "tournament" : "platform",
      visual,
      eyebrow: tournamentAnnouncement ? "Competition update" : "Platform update",
      heroTitle: tournamentAnnouncement
        ? /friday/.test(combinedText)
          ? "FRIDAY SHOWDOWN"
          : "WEEKLY TOURNAMENT"
        : "UPDATES ON PLATFORM",
      heroLabel: tournamentAnnouncement ? "Free entry competition" : "Trading interface refresh",
      heroMetric: tournamentAnnouncement ? amountLabel ?? "FREE ENTRY" : null,
      heroAccent: tournamentAnnouncement ? "COMPETE" : null,
      ctaLabel: getDefaultCtaLabel(href, tournamentAnnouncement ? "tournament" : "platform"),
      href,
      actorHandle,
      assetSymbol,
      direction,
    };
  }

  if (notification.type === "welcome_bonus" || notification.type === "deposit_bonus") {
    return {
      variant: "bonus",
      visual,
      eyebrow: notification.type === "welcome_bonus" ? "Welcome reward" : "Deposit reward",
      heroTitle: notification.type === "welcome_bonus" ? "BONUS UNLOCKED" : "BALANCE BOOST",
      heroLabel: notification.type === "welcome_bonus" ? "First deposit reward" : "Deposit credit applied",
      heroMetric: amountLabel,
      heroAccent: readString(record, "method")?.toUpperCase() ?? null,
      ctaLabel: getDefaultCtaLabel(href, "bonus"),
      href,
      actorHandle,
      assetSymbol,
      direction,
    };
  }

  if (notification.type === "promo_code_activated") {
    return {
      variant: "bonus",
      visual,
      eyebrow: "Promotion applied",
      heroTitle: "PROMO ACTIVE",
      heroLabel: readString(record, "code") ?? "Bonus ready",
      heroMetric: amountLabel,
      heroAccent: "PROMO",
      ctaLabel: getDefaultCtaLabel(href, "bonus"),
      href,
      actorHandle,
      assetSymbol,
      direction,
    };
  }

  if (notification.type === "referral_commission") {
    return {
      variant: "commission",
      visual,
      eyebrow: "Referral earnings",
      heroTitle: "COMMISSION EARNED",
      heroLabel: "Your network just paid out",
      heroMetric: amountLabel,
      heroAccent: readString(record, "source_type") === "trade_volume" ? "TRADE VOLUME" : "REFERRAL",
      ctaLabel: getDefaultCtaLabel(href, "commission"),
      href,
      actorHandle,
      assetSymbol,
      direction,
    };
  }

  if (
    notification.type === "deposit_requested" ||
    notification.type === "deposit_approved" ||
    notification.type === "deposit_rejected" ||
    notification.type === "crypto_deposit_confirmed" ||
    notification.type === "withdrawal_requested" ||
    notification.type === "withdrawal_approved" ||
    notification.type === "withdrawal_processing" ||
    notification.type === "withdrawal_completed" ||
    notification.type === "withdrawal_failed" ||
    notification.type === "withdrawal_rejected" ||
    notification.type === "trade_result"
  ) {
    const metric =
      notification.type === "trade_result"
        ? profitLabel ?? amountLabel
        : amountLabel;
    const accent =
      notification.type === "deposit_requested" || notification.type === "deposit_approved" || notification.type === "crypto_deposit_confirmed"
        ? "DEPOSIT"
        : notification.type === "deposit_rejected"
          ? "REVIEW"
          : notification.type === "trade_result"
            ? readString(record, "status")?.toUpperCase() ?? "TRADE"
            : "WITHDRAW";

    return {
      variant: "finance",
      visual,
      eyebrow: notification.type === "trade_result" ? "Trade summary" : "Finance update",
      heroTitle: notification.type === "trade_result" ? "TRADE CLOSED" : "FUNDS UPDATE",
      heroLabel:
        notification.type === "trade_result"
          ? assetSymbol ?? notification.title
          : notification.type.includes("withdrawal")
            ? notification.type === "withdrawal_processing"
              ? "Payout in progress"
              : notification.type === "withdrawal_completed"
                ? "Payout completed"
                : notification.type === "withdrawal_failed"
                  ? "Payout failed"
                  : "Withdrawal workflow"
            : "Deposit workflow",
      heroMetric: metric,
      heroAccent: accent,
      ctaLabel: getDefaultCtaLabel(href, "finance"),
      href,
      actorHandle,
      assetSymbol,
      direction,
    };
  }

  if (
    notification.type === "tournament_joined" ||
    notification.type === "tournament_started" ||
    notification.type === "tournament_ended" ||
    notification.type === "tournament_prize" ||
    notification.type === "tournament_cancelled"
  ) {
    return {
      variant: "tournament",
      visual,
      eyebrow:
        notification.type === "tournament_prize"
          ? "Prize payout"
          : notification.type === "tournament_joined"
            ? "Entry confirmed"
            : "Competition update",
      heroTitle:
        notification.type === "tournament_prize"
          ? "PRIZE AWARDED"
          : notification.type === "tournament_ended"
            ? "EVENT CLOSED"
            : notification.type === "tournament_cancelled"
              ? "EVENT PAUSED"
              : "TOURNAMENT LIVE",
      heroLabel: readString(record, "tournament_title") ?? "Tournament desk",
      heroMetric: amountLabel,
      heroAccent: notification.type === "tournament_prize" ? "WIN" : "COMPETE",
      ctaLabel: getDefaultCtaLabel(href, "tournament"),
      href,
      actorHandle,
      assetSymbol,
      direction,
    };
  }

  if (
    notification.type === "kyc_approved" ||
    notification.type === "kyc_rejected" ||
    notification.type === "email_verification_code" ||
    notification.type === "email_verified"
  ) {
    return {
      variant: "security",
      visual,
      eyebrow: notification.type === "email_verification_code" ? "Email verification" : "Account verification",
      heroTitle:
        notification.type === "kyc_approved" || notification.type === "email_verified"
          ? "VERIFIED"
          : "ACTION NEEDED",
      heroLabel:
        notification.type === "kyc_approved"
          ? "Compliance complete"
          : notification.type === "email_verified"
            ? "Email confirmed"
            : notification.type === "email_verification_code"
              ? "Code sent to inbox"
              : "Verification review",
      heroMetric: null,
      heroAccent:
        notification.type === "kyc_approved" || notification.type === "email_verified"
          ? "APPROVED"
          : notification.type === "email_verification_code"
            ? "EMAIL"
            : "REJECTED",
      ctaLabel: getDefaultCtaLabel(href, "security"),
      href,
      actorHandle,
      assetSymbol,
      direction,
    };
  }

  if (notification.type === "social_follow") {
    return {
      variant: "social",
      visual,
      eyebrow: "Social trading",
      heroTitle: "NEW FOLLOWER",
      heroLabel: actorHandle ?? "A trader is tracking your desk",
      heroMetric: null,
      heroAccent: "SOCIAL",
      ctaLabel: getDefaultCtaLabel(href, "social"),
      href,
      actorHandle,
      assetSymbol,
      direction,
    };
  }

  return {
    variant: "copy",
    visual,
    eyebrow: notification.type === "trade_copied" ? "Trade copied" : "Copy trading",
    heroTitle: "TRADE SIGNAL LIVE",
    heroLabel: assetSymbol ?? actorHandle ?? "Followed trade activity",
    heroMetric: amountLabel,
    heroAccent: direction === "higher" ? "UP" : direction === "lower" ? "DOWN" : "COPY",
    ctaLabel: getDefaultCtaLabel(href, "copy"),
    href,
    actorHandle,
    assetSymbol,
    direction,
  };
};

export const formatNotificationRelativeTime = (value: string) =>
  formatDistanceToNow(new Date(value), { addSuffix: true });

export const formatNotificationTimestamp = (value: string) =>
  format(new Date(value), "dd/MM/yyyy HH:mm");

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
