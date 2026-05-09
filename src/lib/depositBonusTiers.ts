export type DepositBonusTier = {
  label: string;
  minAmount: number;
  percent: number;
};

export const DEPOSIT_BONUS_TIERS: DepositBonusTier[] = [
  { label: "Starter", minAmount: 30, percent: 10 },
  { label: "Bronze", minAmount: 50, percent: 20 },
  { label: "Silver", minAmount: 100, percent: 30 },
  { label: "Gold", minAmount: 150, percent: 40 },
  { label: "Platinum", minAmount: 200, percent: 55 },
  { label: "VIP", minAmount: 300, percent: 70 },
];

export const DEPOSIT_BONUS_PRESET_AMOUNTS = [30, 50, 100, 150, 200, 300, 500];

const roundToTwo = (value: number) => Math.round(value * 100) / 100;

export const getDepositBonusTier = (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  let resolvedTier: DepositBonusTier | null = null;

  for (const tier of DEPOSIT_BONUS_TIERS) {
    if (amount >= tier.minAmount) {
      resolvedTier = tier;
      continue;
    }

    break;
  }

  return resolvedTier;
};

export const getDepositBonusPercent = (amount: number) => getDepositBonusTier(amount)?.percent ?? 0;

export const calculateDepositBonus = (amount: number, enabled = true) => {
  if (!enabled || !Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return roundToTwo(amount * (getDepositBonusPercent(amount) / 100));
};

export const calculateDepositCreditedAmount = (amount: number, enabled = true) =>
  roundToTwo(Math.max(amount, 0) + calculateDepositBonus(amount, enabled));

export const getDepositBonusPresetOptions = (minimumAmount = 0) =>
  DEPOSIT_BONUS_PRESET_AMOUNTS.filter((amount) => amount >= minimumAmount).map((amount) => ({
    amount,
    percent: getDepositBonusPercent(amount),
    tier: getDepositBonusTier(amount),
  }));
