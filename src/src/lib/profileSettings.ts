import type { NotificationPreferences } from "@/types/profile";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailDepositsWithdrawals: true,
  emailTradeExecution: true,
  emailPromotionsBonuses: true,
  emailTournaments: true,
  emailSecurityKyc: true,
  pushPriceAlerts: true,
  pushMarginCalls: true,
};

const toBoolean = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

export const normalizeNotificationPreferences = (value: unknown): NotificationPreferences => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const source = value as Partial<Record<keyof NotificationPreferences, unknown>>;

  return {
    emailDepositsWithdrawals: toBoolean(
      source.emailDepositsWithdrawals,
      DEFAULT_NOTIFICATION_PREFERENCES.emailDepositsWithdrawals,
    ),
    emailTradeExecution: toBoolean(
      source.emailTradeExecution,
      DEFAULT_NOTIFICATION_PREFERENCES.emailTradeExecution,
    ),
    emailPromotionsBonuses: toBoolean(
      source.emailPromotionsBonuses,
      DEFAULT_NOTIFICATION_PREFERENCES.emailPromotionsBonuses,
    ),
    emailTournaments: toBoolean(
      source.emailTournaments,
      DEFAULT_NOTIFICATION_PREFERENCES.emailTournaments,
    ),
    emailSecurityKyc: toBoolean(
      source.emailSecurityKyc,
      DEFAULT_NOTIFICATION_PREFERENCES.emailSecurityKyc,
    ),
    pushPriceAlerts: toBoolean(source.pushPriceAlerts, DEFAULT_NOTIFICATION_PREFERENCES.pushPriceAlerts),
    pushMarginCalls: toBoolean(source.pushMarginCalls, DEFAULT_NOTIFICATION_PREFERENCES.pushMarginCalls),
  };
};
