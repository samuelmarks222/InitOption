import type { Tables } from "../integrations/supabase/types.js";

export type DepositBonusOffer = Tables<"deposit_bonus_offers"> & {
  maximum_bonus_amount?: number | null;
  maximum_deposit_amount?: number | null;
  minimum_deposit_amount?: number | null;
};

export type DepositBonusRedemption = Tables<"deposit_bonus_redemptions">;

export type DepositBonusEligibilityReason =
  | "already_used"
  | null;

export type DepositBonusCatalogEntry = DepositBonusOffer & {
  active_reservation: boolean;
  already_used: boolean;
  bonus_amount: number;
  eligible: boolean;
  is_new_user: boolean;
  maximum_bonus_amount_resolved: number | null;
  maximum_deposit_amount_resolved: number | null;
  minimum_deposit_amount_resolved: number;
  monthly_locked: boolean;
  preview_credit_amount: number;
  reason: string | null;
  reason_code: DepositBonusEligibilityReason;
};

type DepositBonusOfferLike = Partial<
  Pick<
    DepositBonusOffer,
    "bonus_percent" | "deposit_amount" | "maximum_bonus_amount" | "maximum_deposit_amount" | "minimum_deposit_amount"
  >
> & {
  maximum_bonus_amount_resolved?: number | null;
  maximum_deposit_amount_resolved?: number | null;
  minimum_deposit_amount_resolved?: number;
};

const roundToTwo = (value: number) => Math.round(value * 100) / 100;

const parsePositiveNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
};

const formatAmountForRange = (value: number) => {
  if (Math.abs(value - Math.round(value)) < 0.001) {
    return `${Math.round(value)}`;
  }

  if (Math.abs((value * 100) % 100 - 99) < 0.001) {
    return `${Math.floor(value)}`;
  }

  return value.toFixed(2);
};

export const resolveDepositBonusOfferMinimumAmount = (offer: DepositBonusOfferLike | null | undefined) => {
  if (!offer) {
    return 0;
  }

  return (
    parsePositiveNumber(offer.minimum_deposit_amount_resolved) ??
    parsePositiveNumber(offer.minimum_deposit_amount) ??
    parsePositiveNumber(offer.deposit_amount) ??
    0
  );
};

export const resolveDepositBonusOfferMaximumAmount = ({
  nextOffer,
  offer,
}: {
  nextOffer?: DepositBonusOfferLike | null;
  offer: DepositBonusOfferLike | null | undefined;
}) => {
  if (!offer) {
    return null;
  }

  const resolvedMaximum =
    parsePositiveNumber(offer.maximum_deposit_amount_resolved) ??
    parsePositiveNumber(offer.maximum_deposit_amount);

  if (resolvedMaximum !== null) {
    return roundToTwo(resolvedMaximum);
  }

  const nextMinimum = resolveDepositBonusOfferMinimumAmount(nextOffer);
  if (nextMinimum > 0) {
    return roundToTwo(Math.max(resolveDepositBonusOfferMinimumAmount(offer), nextMinimum - 0.01));
  }

  return null;
};

export const resolveDepositBonusOfferMaximumCap = (offer: DepositBonusOfferLike | null | undefined) => {
  if (!offer) {
    return null;
  }

  return (
    parsePositiveNumber(offer.maximum_bonus_amount_resolved) ??
    parsePositiveNumber(offer.maximum_bonus_amount) ??
    null
  );
};

export const calculateDepositBonusAmountFromPercent = (
  depositAmount: number,
  bonusPercent: number,
  maximumBonusAmount?: number | null,
) => {
  if (!Number.isFinite(depositAmount) || depositAmount <= 0 || !Number.isFinite(bonusPercent) || bonusPercent <= 0) {
    return 0;
  }

  const rawBonusAmount = depositAmount * (bonusPercent / 100);
  const resolvedMaximumBonusAmount = parsePositiveNumber(maximumBonusAmount);

  if (resolvedMaximumBonusAmount !== null) {
    return roundToTwo(Math.min(rawBonusAmount, resolvedMaximumBonusAmount));
  }

  return roundToTwo(rawBonusAmount);
};

export const calculateDepositBonusAmountFromOffer = ({
  amount,
  nextOffer,
  offer,
}: {
  amount?: number;
  nextOffer?: DepositBonusOfferLike | null;
  offer: DepositBonusOfferLike | null | undefined;
}) => {
  if (!offer) {
    return 0;
  }

  const depositAmount = Number.isFinite(amount) && Number(amount) > 0
    ? Number(amount)
    : resolveDepositBonusOfferMinimumAmount(offer);

  return calculateDepositBonusAmountFromPercent(
    depositAmount,
    Number(offer.bonus_percent ?? 0),
    resolveDepositBonusOfferMaximumCap(offer),
  );
};

export const doesDepositAmountMatchBonusOffer = ({
  amount,
  nextOffer,
  offer,
}: {
  amount: number;
  nextOffer?: DepositBonusOfferLike | null;
  offer: DepositBonusOfferLike | null | undefined;
}) => {
  if (!offer || !Number.isFinite(amount) || amount <= 0) {
    return false;
  }

  const minimumAmount = resolveDepositBonusOfferMinimumAmount(offer);
  const maximumAmount = resolveDepositBonusOfferMaximumAmount({ nextOffer, offer });

  if (minimumAmount <= 0 || amount < minimumAmount) {
    return false;
  }

  if (maximumAmount !== null && amount > maximumAmount) {
    return false;
  }

  return true;
};

export const formatDepositBonusOfferRange = ({
  currencySymbol = "$",
  nextOffer,
  offer,
}: {
  currencySymbol?: string;
  nextOffer?: DepositBonusOfferLike | null;
  offer: DepositBonusOfferLike | null | undefined;
}) => {
  const minimumAmount = resolveDepositBonusOfferMinimumAmount(offer);
  const maximumAmount = resolveDepositBonusOfferMaximumAmount({ nextOffer, offer });

  if (minimumAmount <= 0) {
    return `${currencySymbol}0+`;
  }

  if (maximumAmount === null) {
    return `${currencySymbol}${formatAmountForRange(minimumAmount)}+`;
  }

  return `${currencySymbol}${formatAmountForRange(minimumAmount)} - ${currencySymbol}${formatAmountForRange(maximumAmount)}`;
};

export const buildDepositBonusCatalog = ({
  offers,
  redemptions,
  totalDeposit,
}: {
  offers: DepositBonusOffer[];
  redemptions: Pick<DepositBonusRedemption, "bonus_offer_id" | "created_at" | "status">[];
  totalDeposit: number;
}): DepositBonusCatalogEntry[] => {
  const safeOffers = offers
    .filter((offer) => offer.status === "active")
    .sort((left, right) => {
      const positionDiff = Number(left.position ?? 0) - Number(right.position ?? 0);
      if (positionDiff !== 0) return positionDiff;
      return resolveDepositBonusOfferMinimumAmount(left) - resolveDepositBonusOfferMinimumAmount(right);
    });

  const activeOrUsedRedemptions = redemptions.filter((redemption) =>
    redemption.status === "reserved" || redemption.status === "credited",
  );

  const isNewUser = Number(totalDeposit ?? 0) <= 0;

  return safeOffers.map((offer, index) => {
    const nextOffer = safeOffers[index + 1] ?? null;
    const alreadyUsed = activeOrUsedRedemptions.some((redemption) => redemption.bonus_offer_id === offer.id);
    const reasonCode: DepositBonusEligibilityReason = alreadyUsed ? "already_used" : null;
    const minimumAmount = resolveDepositBonusOfferMinimumAmount(offer);
    const maximumAmount = resolveDepositBonusOfferMaximumAmount({ nextOffer, offer });
    const maximumBonusAmount = resolveDepositBonusOfferMaximumCap(offer);
    const previewBonusAmount = calculateDepositBonusAmountFromOffer({ offer });

    const reason =
      reasonCode === "already_used"
        ? "Already used on this account"
        : null;

    return {
      ...offer,
      active_reservation: false,
      already_used: alreadyUsed,
      bonus_amount: previewBonusAmount,
      eligible: reasonCode === null,
      is_new_user: isNewUser,
      maximum_bonus_amount_resolved: maximumBonusAmount,
      maximum_deposit_amount_resolved: maximumAmount,
      minimum_deposit_amount_resolved: minimumAmount,
      monthly_locked: false,
      preview_credit_amount: roundToTwo(minimumAmount + previewBonusAmount),
      reason,
      reason_code: reasonCode,
    };
  });
};

export const findMatchingDepositBonusOffer = ({
  amount,
  offers,
}: {
  amount: number;
  offers: DepositBonusCatalogEntry[];
}) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return offers.find((offer) => offer.eligible && doesDepositAmountMatchBonusOffer({ amount, offer })) ?? null;
};

export const calculateDepositCreditedAmount = ({
  amount,
  selectedOffer,
  bonusEnabled,
}: {
  amount: number;
  bonusEnabled: boolean;
  selectedOffer: DepositBonusCatalogEntry | null | undefined;
}) => {
  const baseAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const bonusAmount = bonusEnabled && selectedOffer
    ? calculateDepositBonusAmountFromOffer({ amount: baseAmount, offer: selectedOffer })
    : 0;
  return roundToTwo(baseAmount + bonusAmount);
};
