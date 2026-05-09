import {
  buildDepositBonusCatalog,
  calculateDepositBonusAmountFromOffer,
  calculateDepositCreditedAmount,
  findMatchingDepositBonusOffer,
} from "@/lib/depositBonusOffers";

describe("deposit bonus offers", () => {
  it("keeps other active offers available after one offer has already been used", () => {
    const catalog = buildDepositBonusCatalog({
      offers: [
        {
          bonus_percent: 20,
          created_at: "2026-04-01T00:00:00.000Z",
          deposit_amount: 50,
          description: null,
          id: "offer-50",
          maximum_bonus_amount: null,
          maximum_deposit_amount: null,
          minimum_deposit_amount: 50,
          position: 10,
          status: "active",
          title: "Bronze",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
        {
          bonus_percent: 30,
          created_at: "2026-04-01T00:00:00.000Z",
          deposit_amount: 100,
          description: null,
          id: "offer-100",
          maximum_bonus_amount: null,
          maximum_deposit_amount: null,
          minimum_deposit_amount: 100,
          position: 20,
          status: "active",
          title: "Silver",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      redemptions: [
        {
          bonus_offer_id: "offer-50",
          created_at: "2026-04-02T10:00:00.000Z",
          status: "credited",
        },
      ],
      totalDeposit: 150,
    });

    expect(catalog).toHaveLength(2);
    expect(catalog[0]).toMatchObject({
      active_reservation: false,
      already_used: true,
      eligible: false,
      monthly_locked: false,
      reason: "Already used on this account",
      reason_code: "already_used",
    });
    expect(catalog[1]).toMatchObject({
      active_reservation: false,
      already_used: false,
      eligible: true,
      monthly_locked: false,
      reason: null,
      reason_code: null,
    });
  });

  it("matches deposit amounts against tier ranges instead of exact fixed values", () => {
    const catalog = buildDepositBonusCatalog({
      offers: [
        {
          bonus_percent: 10,
          created_at: "2026-04-01T00:00:00.000Z",
          deposit_amount: 30,
          description: null,
          id: "offer-30",
          maximum_bonus_amount: null,
          maximum_deposit_amount: null,
          minimum_deposit_amount: 30,
          position: 10,
          status: "active",
          title: "Starter",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
        {
          bonus_percent: 20,
          created_at: "2026-04-01T00:00:00.000Z",
          deposit_amount: 50,
          description: null,
          id: "offer-50",
          maximum_bonus_amount: null,
          maximum_deposit_amount: null,
          minimum_deposit_amount: 50,
          position: 20,
          status: "active",
          title: "Bronze",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      redemptions: [],
      totalDeposit: 0,
    });

    const starterRange = findMatchingDepositBonusOffer({ amount: 45, offers: catalog });
    const bronzeRange = findMatchingDepositBonusOffer({ amount: 50, offers: catalog });

    expect(starterRange?.id).toBe("offer-30");
    expect(bronzeRange?.id).toBe("offer-50");
    expect(calculateDepositCreditedAmount({ amount: 45, bonusEnabled: true, selectedOffer: starterRange })).toBe(49.5);
    expect(calculateDepositCreditedAmount({ amount: 75, bonusEnabled: true, selectedOffer: bronzeRange })).toBe(90);
  });

  it("caps the bonus payout when a tier defines a maximum bonus amount", () => {
    const catalog = buildDepositBonusCatalog({
      offers: [
        {
          bonus_percent: 60,
          created_at: "2026-04-01T00:00:00.000Z",
          deposit_amount: 200,
          description: null,
          id: "offer-vip",
          maximum_bonus_amount: 500,
          maximum_deposit_amount: null,
          minimum_deposit_amount: 200,
          position: 10,
          status: "active",
          title: "VIP",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      redemptions: [],
      totalDeposit: 0,
    });

    const vipOffer = findMatchingDepositBonusOffer({ amount: 2000, offers: catalog });

    expect(vipOffer?.id).toBe("offer-vip");
    expect(calculateDepositBonusAmountFromOffer({ amount: 1000, offer: vipOffer })).toBe(500);
    expect(calculateDepositBonusAmountFromOffer({ amount: 2000, offer: vipOffer })).toBe(500);
    expect(calculateDepositCreditedAmount({ amount: 2000, bonusEnabled: true, selectedOffer: vipOffer })).toBe(2500);
  });
});
