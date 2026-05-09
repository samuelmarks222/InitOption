export type CopyAmountType = "fixed" | "ratio";
export type CopyExecutionMode = "automatic" | "manual";

export type SocialFeedType =
  | "trade_open"
  | "trade_closed"
  | "new_follower"
  | "copy_trade_executed"
  | "copy_trade_skipped"
  | "copy_signal";

export interface TraderSummary {
  id: string;
  username: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  vip_tier?: string | null;
  created_at?: string;
  total_profit?: number;
  total_trades?: number;
  total_wins?: number;
  followers_count?: number;
  following_count?: number;
  social_trading_disabled?: boolean;
}

export interface FollowRow {
  follower_id: string;
  followed_id: string;
  created_at: string;
}

export interface CopySettingRecord {
  id: string;
  user_id: string;
  target_user_id: string;
  enabled: boolean;
  amount_type: CopyAmountType;
  execution_mode: CopyExecutionMode;
  fixed_amount: number | null;
  ratio: number | null;
  max_per_trade: number | null;
  max_daily: number | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichedCopySetting extends CopySettingRecord {
  target?: TraderSummary | null;
}

export interface SocialFeedRecord {
  id: string;
  user_id: string;
  actor_id: string;
  type: SocialFeedType;
  data: Record<string, unknown>;
  created_at: string;
  seen_at: string | null;
}

export interface SocialFeedTradeData {
  actor_avatar_url?: string | null;
  actor_display_name?: string | null;
  actor_username?: string | null;
  actor_vip_tier?: string | null;
  amount?: number | null;
  asset_symbol?: string | null;
  copy_setting_id?: string | null;
  copy_trade_id?: string | null;
  direction?: "higher" | "lower" | string | null;
  execution_mode?: CopyExecutionMode | string | null;
  expiry_seconds?: number | null;
  follower_username?: string | null;
  profit?: number | null;
  reason?: string | null;
  source_trade_id?: string | null;
  status?: string | null;
}

export const getTraderDisplayName = (trader?: Partial<TraderSummary> | null) =>
  trader?.username?.trim() ||
  trader?.display_name?.trim() ||
  "Trader";

export const computeTraderWinRate = (wins?: number | null, trades?: number | null) => {
  const safeWins = Math.max(0, Number(wins ?? 0));
  const safeTrades = Math.max(0, Number(trades ?? 0));
  if (safeTrades === 0) return 0;
  return Number(((safeWins / safeTrades) * 100).toFixed(1));
};

export const computeTraderAverageReturn = (profit?: number | null, trades?: number | null) => {
  const safeProfit = Number(profit ?? 0);
  const safeTrades = Math.max(0, Number(trades ?? 0));
  if (safeTrades === 0) return 0;
  return Number((safeProfit / safeTrades).toFixed(2));
};

export const calculateCopyAmount = (
  originalAmount: number,
  setting: Pick<CopySettingRecord, "amount_type" | "fixed_amount" | "ratio" | "max_per_trade">,
) => {
  const baseAmount =
    setting.amount_type === "ratio"
      ? Number(originalAmount) * Number(setting.ratio ?? 1)
      : Number(setting.fixed_amount ?? originalAmount);

  const cappedAmount = setting.max_per_trade != null
    ? Math.min(baseAmount, Number(setting.max_per_trade))
    : baseAmount;

  return Math.max(1, Number(cappedAmount.toFixed(2)));
};

export const formatSocialCurrency = (value?: number | null) =>
  `$${Number(value ?? 0).toFixed(2)}`;

export const formatDirectionLabel = (direction?: string | null) =>
  direction === "higher" ? "UP" : direction === "lower" ? "DOWN" : "TRADE";

export const formatCopySettingSummary = (setting: Pick<CopySettingRecord, "amount_type" | "fixed_amount" | "ratio" | "execution_mode">) => {
  if (setting.amount_type === "ratio") {
    return `${Number(setting.ratio ?? 1).toFixed(2)}x ratio • ${setting.execution_mode}`;
  }

  return `${formatSocialCurrency(setting.fixed_amount)} fixed • ${setting.execution_mode}`;
};
