import {
  getAvailableLiveBalanceForTrading,
  getEffectiveLiveBalance,
  getStoredLiveBalance,
  getStoredLiveBalanceAfterPendingTrade,
  getStoredLiveBalanceAfterSettlementCredit,
  hasFundedLiveAccount,
  shouldNormalizeSeededLiveBalance,
} from "@/lib/live-balance";

describe("live balance helpers", () => {
  it("keeps the stored balance separate from the reserved withdrawal balance", () => {
    const profile = {
      balance: 500,
      reserved_withdrawal_balance: 100,
      total_deposit: 500,
    };

    expect(getStoredLiveBalance(profile)).toBe(500);
    expect(getEffectiveLiveBalance(profile)).toBe(400);
  });

  it("deducts only the trade amount from the stored balance even when withdrawals are reserved", () => {
    const profile = {
      balance: 500,
      reserved_withdrawal_balance: 100,
      total_deposit: 500,
    };

    expect(getAvailableLiveBalanceForTrading(profile)).toBe(400);
    expect(getStoredLiveBalanceAfterPendingTrade(profile, 1)).toBe(499);
    expect(getAvailableLiveBalanceForTrading({ ...profile, balance: 499 })).toBe(399);
  });

  it("accounts for pending trades without double-deducting the stored balance", () => {
    const profile = {
      balance: 500,
      reserved_withdrawal_balance: 100,
      total_deposit: 500,
    };

    expect(getAvailableLiveBalanceForTrading(profile, 1)).toBe(399);
    expect(getStoredLiveBalanceAfterPendingTrade(profile, 1, 1)).toBe(498);
  });

  it("credits wins back onto the stored balance", () => {
    const profile = {
      balance: 499,
      reserved_withdrawal_balance: 100,
      total_deposit: 500,
    };

    expect(getStoredLiveBalanceAfterSettlementCredit(profile, 1.86)).toBe(500.86);
    expect(getEffectiveLiveBalance({ ...profile, balance: 500.86 })).toBe(400.86);
  });

  it("treats legacy positive balances as live funds even if total_deposit was not backfilled", () => {
    const profile = {
      balance: 384,
      reserved_withdrawal_balance: 0,
      total_deposit: 0,
    };

    expect(hasFundedLiveAccount(profile)).toBe(true);
    expect(shouldNormalizeSeededLiveBalance(profile)).toBe(false);
    expect(getStoredLiveBalance(profile)).toBe(384);
    expect(getEffectiveLiveBalance(profile)).toBe(384);
  });

  it("does not treat the old 10000 demo seed as live funds", () => {
    const profile = {
      balance: 10000,
      reserved_withdrawal_balance: 0,
      total_deposit: 0,
      total_profit: 0,
      total_trades: 0,
      welcome_bonus_granted_at: null,
    };

    expect(hasFundedLiveAccount(profile)).toBe(false);
    expect(shouldNormalizeSeededLiveBalance(profile)).toBe(true);
    expect(getStoredLiveBalance(profile)).toBe(0);
    expect(getEffectiveLiveBalance(profile)).toBe(0);
    expect(getAvailableLiveBalanceForTrading(profile)).toBe(0);
  });
});
