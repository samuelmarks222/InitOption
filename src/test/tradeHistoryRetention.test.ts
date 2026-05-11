import { describe, expect, it } from "vitest";
import { filterRetainedTradeHistory, TRADE_HISTORY_RETENTION_MS } from "@/lib/tradeHistoryRetention";

describe("tradeHistoryRetention", () => {
  it("keeps only trades from the last 24 hours", () => {
    const now = Date.parse("2026-05-11T12:00:00.000Z");
    const boundaryIso = new Date(now - TRADE_HISTORY_RETENTION_MS).toISOString();

    const trades = [
      { id: "fresh", closed_at: "2026-05-11T11:59:59.000Z", opened_at: "2026-05-11T11:58:00.000Z" },
      { id: "boundary", closed_at: boundaryIso, opened_at: "2026-05-10T11:00:00.000Z" },
      { id: "expired", closed_at: "2026-05-10T11:59:58.000Z", opened_at: "2026-05-10T11:00:00.000Z" },
    ];

    expect(filterRetainedTradeHistory(trades, now).map((trade) => trade.id)).toEqual(["fresh", "boundary"]);
  });

  it("falls back to opened_at when closed_at is missing", () => {
    const now = Date.parse("2026-05-11T12:00:00.000Z");

    const trades = [
      { id: "open-window", opened_at: "2026-05-10T13:30:00.000Z" },
      { id: "stale-window", opened_at: "2026-05-10T11:30:00.000Z" },
    ];

    expect(filterRetainedTradeHistory(trades, now).map((trade) => trade.id)).toEqual(["open-window"]);
  });
});
