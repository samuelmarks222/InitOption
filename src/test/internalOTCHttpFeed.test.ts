import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createMarketDataFeed } from "@/components/trading/engine/marketDataFeed";
import { TIMEFRAMES } from "@/components/trading/engine/priceEngine";
import { observedHistory } from "@/components/trading/engine/native/observedHistory";
let next = 0;
const tick = (symbol: string, sequence: number, price = "100") => ({
  symbol,
  sequence,
  t: String(sequence * 100000),
  p: price,
  source: "internal-otc",
});
function response(
  symbol: string,
  type = "snapshot",
  cursor = 6000,
  price = "100",
  session = "one",
) {
  return {
    type,
    symbol,
    session,
    cursor,
    source: "internal-otc",
    precision: 8,
    serverTime: cursor / 10,
    ticks: [tick(symbol, cursor, price)],
    catchingUp: false,
  };
}
function setup(symbol = `HTTP-${next++}`, timeframe: "5s" | "4h" = "5s") {
  const onTick = vi.fn(),
    onHistory = vi.fn(),
    onStatusChange = vi.fn();
  const feed = createMarketDataFeed({
    internalOTC: true,
    websocketUrl: "/api/otc",
    subscription: { symbol, basePrice: 999, timeframe: TIMEFRAMES[timeframe] },
    callbacks: { onTick, onHistory, onStatusChange },
  });
  return { feed, symbol, onTick, onHistory, onStatusChange };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(600000);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("Vercel same-origin OTC transport", () => {
  it("shares polling across views, hydrates persisted candles, then delivers every batch tick synchronously", async () => {
    const a = setup();
    let cursor = 6000;
    const fetch = vi.fn(async (_url?: unknown) => ({
      ok: true,
      json: async () =>
        cursor === 6000
          ? {
              ...response(a.symbol),
              candles: [
                {
                  time: 0,
                  open: 90,
                  high: 110,
                  low: 90,
                  close: 100,
                  volume: 20,
                },
                {
                  time: 600,
                  open: 100,
                  high: 100,
                  low: 100,
                  close: 100,
                  volume: 1,
                },
              ],
            }
          : {
              ...response(a.symbol, "batch", cursor),
              ticks: [tick(a.symbol, 6001, "98"), tick(a.symbol, 6002, "102")],
            },
    }));
    vi.stubGlobal("fetch", fetch);
    a.feed.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(a.onHistory).toHaveBeenCalledOnce();
    expect(a.onTick).not.toHaveBeenCalled();
    const b = setup(a.symbol, "4h");
    b.feed.connect();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(b.onHistory).toHaveBeenCalledOnce();
    expect(
      observedHistory.snapshot("/api/otc", a.symbol, 14400, 600).current?.open,
    ).toBe(90);
    cursor = 6002;
    await vi.advanceTimersByTimeAsync(500);
    expect(a.onTick.mock.calls.map(([t]) => t.price)).toEqual([98, 102]);
    expect(b.onTick).toHaveBeenCalledTimes(2);
    const url = fetch.mock.calls[1]?.[0] as any;
    expect(String(url)).toContain("after=6000");
    a.feed.disconnect();
    b.feed.disconnect();
    await vi.advanceTimersByTimeAsync(1000);
    const count = fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(30000);
    expect(fetch).toHaveBeenCalledTimes(count);
  });
  it("does not overlap requests and never generates prices while a response is pending", async () => {
    const a = setup();
    let finish: (value: any) => void;
    const fetch = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    a.feed.connect();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledOnce();
    expect(a.onTick).not.toHaveBeenCalled();
    finish!({ ok: true, json: async () => response(a.symbol) });
    await vi.advanceTimersByTimeAsync(0);
    expect(a.onHistory).toHaveBeenCalledOnce();
    a.feed.disconnect();
    await vi.advanceTimersByTimeAsync(1000);
  });
  it("recovers from API failures without substituting generated frontend prices", async () => {
    const a = setup();
    let fail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: !fail, json: async () => response(a.symbol) })),
    );
    a.feed.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(a.onStatusChange).toHaveBeenLastCalledWith("reconnecting");
    expect(a.onTick).not.toHaveBeenCalled();
    fail = false;
    await vi.advanceTimersByTimeAsync(500);
    expect(a.onHistory).toHaveBeenCalledOnce();
    expect(a.onStatusChange).toHaveBeenLastCalledWith("live");
    a.feed.disconnect();
    await vi.advanceTimersByTimeAsync(1000);
  });
  it("withholds incomplete catch-up history until server generation reaches the present", async () => {
    const a = setup();
    let catching = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () =>
          catching
            ? { ...response(a.symbol), catchingUp: true }
            : response(a.symbol, "batch", 6001, "101"),
      })),
    );
    a.feed.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(a.onHistory).not.toHaveBeenCalled();
    expect(a.onTick).not.toHaveBeenCalled();
    catching = false;
    await vi.advanceTimersByTimeAsync(100);
    expect(a.onHistory).toHaveBeenCalledOnce();
    expect(a.onStatusChange).toHaveBeenLastCalledWith("live");
    a.feed.disconnect();
    await vi.advanceTimersByTimeAsync(1000);
  });
});
