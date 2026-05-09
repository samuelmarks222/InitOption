type LiveBalanceProfile = {
  balance?: number | null;
  reserved_withdrawal_balance?: number | null;
  total_deposit?: number | null;
};

const normalizeMoney = (value: number) => Math.max(0, Math.round(value * 100) / 100);

const readMoney = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const hasFundedLiveAccount = (profile?: LiveBalanceProfile | null) =>
  normalizeMoney(Math.max(readMoney(profile?.total_deposit), readMoney(profile?.balance))) > 0;

// Legacy accounts and admin-adjusted balances may legitimately hold funds even if
// total_deposit was not backfilled, so we never auto-zero balances at runtime.
export const shouldNormalizeSeededLiveBalance = (_profile?: LiveBalanceProfile | null) => false;

export const getReservedWithdrawalBalance = (profile?: LiveBalanceProfile | null) =>
  normalizeMoney(readMoney(profile?.reserved_withdrawal_balance));

export const getStoredLiveBalance = (profile?: LiveBalanceProfile | null) =>
  normalizeMoney(readMoney(profile?.balance));

export const getEffectiveLiveBalance = (profile?: LiveBalanceProfile | null) =>
  normalizeMoney(getStoredLiveBalance(profile) - getReservedWithdrawalBalance(profile));

export const getAvailableLiveBalanceForTrading = (
  profile?: LiveBalanceProfile | null,
  pendingTradeAmount: number = 0,
) => normalizeMoney(getEffectiveLiveBalance(profile) - normalizeMoney(pendingTradeAmount));

export const getStoredLiveBalanceBeforePendingTrade = (
  profile?: LiveBalanceProfile | null,
  pendingTradeAmount: number = 0,
) => normalizeMoney(getStoredLiveBalance(profile) - normalizeMoney(pendingTradeAmount));

export const getStoredLiveBalanceAfterPendingTrade = (
  profile: LiveBalanceProfile | null | undefined,
  tradeAmount: number,
  pendingTradeAmount: number = 0,
) => normalizeMoney(getStoredLiveBalanceBeforePendingTrade(profile, pendingTradeAmount) - normalizeMoney(tradeAmount));

export const getStoredLiveBalanceAfterSettlementCredit = (
  profile: LiveBalanceProfile | null | undefined,
  creditAmount: number,
) => normalizeMoney(getStoredLiveBalance(profile) + normalizeMoney(creditAmount));
