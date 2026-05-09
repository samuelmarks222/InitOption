import { describe, expect, it } from "vitest";
import { buildTradeInsertPayload } from "@/lib/tradePersistence";

describe("buildTradeInsertPayload", () => {
  it("omits marker_time so live trade inserts stay compatible with the current trades schema", () => {
    const payload = buildTradeInsertPayload({
      userId: "user-1",
      assetSymbol: "EURUSD",
      direction: "higher",
      amount: 25,
      entryPrice: 1.25851,
      markerTime: 1_774_712_118.42,
      expirySeconds: 60,
      payoutRate: 0.86,
      openedAt: "2026-03-29T16:45:00.000Z",
      tournamentParticipantId: null,
    });

    expect(payload).toEqual({
      user_id: "user-1",
      asset_symbol: "EURUSD",
      direction: "higher",
      amount: 25,
      entry_price: 1.25851,
      expiry_seconds: 60,
      payout_rate: 0.86,
      status: "open",
      opened_at: "2026-03-29T16:45:00.000Z",
      tournament_participant_id: null,
    });
    expect("marker_time" in payload).toBe(false);
  });
});
