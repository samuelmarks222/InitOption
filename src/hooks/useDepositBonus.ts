import { useEffect, useMemo, useState } from "react";
import { api } from "@/integrations/api/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  buildDepositBonusCatalog,
  calculateDepositBonusAmountFromOffer,
  type DepositBonusCatalogEntry,
} from "@/lib/depositBonusOffers";

type BonusSettingsRow = Tables<"bonus_settings">;
type DepositBonusOfferRow = Tables<"deposit_bonus_offers">;
type DepositBonusRedemptionRow = Tables<"deposit_bonus_redemptions">;

export const useDepositBonus = (userId?: string | null) => {
  const [loading, setLoading] = useState(true);
  const [bonusSettings, setBonusSettings] = useState<BonusSettingsRow | null>(null);
  const [offers, setOffers] = useState<DepositBonusOfferRow[]>([]);
  const [redemptions, setRedemptions] = useState<Pick<DepositBonusRedemptionRow, "bonus_offer_id" | "created_at" | "status">[]>([]);
  const [profileTotalDeposit, setProfileTotalDeposit] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [settingsResult, offersResult, redemptionsResult, profileResult] = await Promise.all([
          api.from("bonus_settings").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle(),
          api.from("deposit_bonus_offers").select("*").eq("status", "active").order("position", { ascending: true }),
          userId
            ? api.from("deposit_bonus_redemptions").select("bonus_offer_id, created_at, status").eq("user_id", userId)
            : Promise.resolve({ error: null, data: [] }),
          userId
            ? api.from("profiles").select("total_deposit").eq("id", userId).maybeSingle()
            : Promise.resolve({ error: null, data: null }),
        ]);

        if (cancelled) return;

        if (!settingsResult.error && settingsResult.data) {
          setBonusSettings(settingsResult.data as BonusSettingsRow);
        }

        if (!offersResult.error && offersResult.data) {
          setOffers(offersResult.data as DepositBonusOfferRow[]);
        }

        if (!redemptionsResult.error && redemptionsResult.data) {
          setRedemptions(redemptionsResult.data as Pick<DepositBonusRedemptionRow, "bonus_offer_id" | "created_at" | "status">[]);
        }

        if (!profileResult.error && profileResult.data) {
          setProfileTotalDeposit(Number(profileResult.data.total_deposit ?? 0));
        }
      } catch (error) {
        console.error("Failed to load deposit bonus data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const catalog = useMemo(
    () =>
      buildDepositBonusCatalog({
        offers,
        redemptions,
        totalDeposit: profileTotalDeposit,
      }),
    [offers, redemptions, profileTotalDeposit],
  );

  const mpesaEnabled = bonusSettings?.deposit_bonus_mpesa_enabled ?? bonusSettings?.deposit_bonus_enabled ?? false;
  const cryptoEnabled = bonusSettings?.deposit_bonus_crypto_enabled ?? bonusSettings?.deposit_bonus_enabled ?? false;

  const findMatchingOffer = (amount: number): DepositBonusCatalogEntry | null => {
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return catalog.find(
      (offer) => offer.eligible && amount >= offer.minimum_deposit_amount_resolved &&
        (offer.maximum_deposit_amount_resolved === null || amount <= offer.maximum_deposit_amount_resolved),
    ) ?? null;
  };

  const bonusAmountFor = (amount: number, offer: DepositBonusCatalogEntry | null) => {
    if (!offer) return 0;
    return calculateDepositBonusAmountFromOffer({ amount, offer });
  };

  return {
    loading,
    mpesaEnabled,
    cryptoEnabled,
    catalog,
    findMatchingOffer,
    bonusAmountFor,
  };
};