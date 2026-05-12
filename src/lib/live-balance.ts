type LiveBalanceProfile = {
  balance?: number | null;
  reserved_withdrawal_balance?: number | null;
  total_deposit?: number | null;
  total_profit?: number | null;
  total_trades?: number | null;
  welcome_bonus_granted_at?: string | null;
};

const normalizeMoney = (value: number) => Math.max(0, Math.round(value * 100) / 100);
const LEGACY_DEMO_SEED_BALANCE = 10000;

const readMoney = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const shouldNormalizeSeededLiveBalance = (profile?: LiveBalanceProfile | null) =>
  normalizeMoney(readMoney(profile?.balance)) === LEGACY_DEMO_SEED_BALANCE &&
  normalizeMoney(readMoney(profile?.total_deposit)) === 0 &&
  normalizeMoney(readMoney(profile?.total_profit)) === 0 &&
  normalizeMoney(readMoney(profile?.total_trades)) === 0 &&
  normalizeMoney(readMoney(profile?.reserved_withdrawal_balance)) === 0 &&
  !profile?.welcome_bonus_granted_at;

export const hasFundedLiveAccount = (profile?: LiveBalanceProfile | null) =>
  normalizeMoney(readMoney(profile?.total_deposit)) > 0 ||
  (!shouldNormalizeSeededLiveBalance(profile) && normalizeMoney(readMoney(profile?.balance)) > 0);

export const getReservedWithdrawalBalance = (profile?: LiveBalanceProfile | null) =>
  normalizeMoney(readMoney(profile?.reserved_withdrawal_balance));

export const getStoredLiveBalance = (profile?: LiveBalanceProfile | null) =>
  shouldNormalizeSeededLiveBalance(profile) ? 0 : normalizeMoney(readMoney(profile?.balance));

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
