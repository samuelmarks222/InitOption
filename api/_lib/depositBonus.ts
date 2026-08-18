import type { Tables } from "../../src/integrations/supabase/types.js";
import {
  buildDepositBonusCatalog,
  calculateDepositBonusAmountFromOffer,
  doesDepositAmountMatchBonusOffer,
  formatDepositBonusOfferRange,
} from "../../src/lib/depositBonusOffers.js";
import { query, queryOne } from "./db.js";

type DepositBonusOfferRow = Tables<"deposit_bonus_offers">;
type DepositBonusRedemptionRow = Tables<"deposit_bonus_redemptions">;

export const resolveSelectedBonusOffer = async ({
  amount,
  bonusOfferId,
  userId,
}: {
  amount: number;
  bonusOfferId: string | null;
  userId: string;
}) => {
  if (!bonusOfferId) {
    return {
      bonusAmount: 0,
      selectedOffer: null as DepositBonusOfferRow | null,
    };
  }

  const [profile, offers, redemptions] = await Promise.all([
    queryOne("select total_deposit from profiles where id = $1", [userId]),
    query("select * from deposit_bonus_offers where status = $1 order by position asc, deposit_amount asc", ["active"]),
    query("select bonus_offer_id, created_at, status from deposit_bonus_redemptions where user_id = $1", [userId]),
  ]);

  const bonusCatalog = buildDepositBonusCatalog({
    offers: (offers ?? []) as DepositBonusOfferRow[],
    redemptions: (redemptions ?? []) as Pick<
      DepositBonusRedemptionRow,
      "bonus_offer_id" | "created_at" | "status"
    >[],
    totalDeposit: Number(profile?.total_deposit ?? 0),
  });

  const selectedOffer = bonusCatalog.find((offer) => offer.id === bonusOfferId) ?? null;
  if (!selectedOffer) {
    throw new Error("Selected deposit bonus is not active.");
  }

  if (!selectedOffer.eligible) {
    if (selectedOffer.reason_code === "already_used") {
      throw new Error("This deposit bonus has already been used on this account.");
    }

    throw new Error("Selected deposit bonus is not available right now.");
  }

  if (!doesDepositAmountMatchBonusOffer({ amount, offer: selectedOffer })) {
    throw new Error(
      `Selected deposit bonus only applies to deposits in the ${formatDepositBonusOfferRange({ offer: selectedOffer })} range.`,
    );
  }

  return {
    bonusAmount: calculateDepositBonusAmountFromOffer({ amount, offer: selectedOffer }),
    selectedOffer,
  };
};