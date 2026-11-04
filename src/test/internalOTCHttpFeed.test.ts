import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createMarketDataFeed } from "@/components/trading/engine/marketDataFeed";
import { TIMEFRAMES } from "@/components/trading/engine/priceEngine";
import { subscribeOTCQuotes } from "@/lib/otcMarket";
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
    onStatusChange = vi.fn(),
    onError = vi.fn();
  const feed = createMarketDataFeed({
    internalOTC: true,
    websocketUrl: "/api/otc",
    subscription: { symbol, basePrice: 999, timeframe: TIMEFRAMES[timeframe] },
    callbacks: { onTick, onHistory, onStatusChange, onError },
  });
  return { feed, symbol, onTick, onHistory, onStatusChange, onError };
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
  it("delivers new server prices at 100ms cadence rather than collapsing five ticks every 500ms", async () => {
    const a=setup();let cursor=6000;
    const fetch=vi.fn(async()=>({ok:true,json:async()=>response(a.symbol,cursor===6000?'snapshot':'batch',cursor++,String(cursor))}));
    vi.stubGlobal('fetch',fetch);a.feed.connect();await vi.advanceTimersByTimeAsync(0);
    expect(a.onHistory).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(99);expect(a.onTick).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);expect(a.onTick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(400);expect(a.onTick).toHaveBeenCalledTimes(5);
    expect(a.onTick.mock.calls.map(([tick])=>tick.sequence)).toEqual([6001,6002,6003,6004,6005]);
    a.feed.disconnect();await vi.advanceTimersByTimeAsync(1000);
  });
  it("measures cadence start-to-start without overlapping slow responses", async () => {
    const a=setup();const starts:number[]=[];let cursor=6000;
    vi.stubGlobal('fetch',vi.fn(async()=>{
      starts.push(performance.now());await new Promise(resolve=>setTimeout(resolve,60));
      return {ok:true,json:async()=>response(a.symbol,cursor===6000?'snapshot':'batch',cursor++)};
    }));
    a.feed.connect();await vi.advanceTimersByTimeAsync(250);
    expect(starts).toEqual([0,100,200]);expect(a.onTick).toHaveBeenCalledTimes(1);
    a.feed.disconnect();await vi.advanceTimersByTimeAsync(1100);
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
  it("keeps healthy chart views updating when another view and its error handler throw", async () => {
    const a=setup(),b=setup(a.symbol);let cursor=6000;
    a.onHistory.mockImplementation(()=>{throw new Error('broken history view');});
    a.onTick.mockImplementation(()=>{throw new Error('broken chart view');});
    a.onStatusChange.mockImplementation(()=>{throw new Error('broken status view');});
    a.onError.mockImplementation(()=>{throw new Error('broken error view');});
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>response(a.symbol,cursor===6000?'snapshot':'batch',cursor++)})));
    a.feed.connect();b.feed.connect();await vi.advanceTimersByTimeAsync(300);
    expect(b.onHistory).toHaveBeenCalledOnce();expect(b.onTick.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(b.onStatusChange).toHaveBeenLastCalledWith('live');
    a.feed.disconnect();b.feed.disconnect();await vi.advanceTimersByTimeAsync(1000);
  });
  it("bounds hung requests and ignores their late responses after recovery",async()=>{
    const a=setup();let finish:((value:any)=>void)|undefined;
    const fetch=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockImplementation(async()=>({ok:true,json:async()=>response(a.symbol)}));
    vi.stubGlobal('fetch',fetch);a.feed.connect();await vi.advanceTimersByTimeAsync(10500);
    expect(fetch).toHaveBeenCalledTimes(2);expect(a.onHistory).toHaveBeenCalledOnce();
    finish!({ok:true,json:async()=>response(a.symbol,'snapshot',5000)});await vi.advanceTimersByTimeAsync(0);
    expect(a.onHistory).toHaveBeenCalledOnce();expect(a.onStatusChange).toHaveBeenLastCalledWith('live');
    a.feed.disconnect();await vi.advanceTimersByTimeAsync(1000);
  });
  it("detects a non-advancing cursor and resynchronizes instead of reporting a frozen feed as live",async()=>{
    const a=setup();let calls=0,recovered=false;
    const fetch=vi.fn(async(input:unknown)=>{const url=new URL(String(input));calls++;if(calls>1&&!url.searchParams.has('after'))recovered=true;
      return {ok:true,json:async()=>recovered?response(a.symbol,'snapshot',6001):calls===1?response(a.symbol):{...response(a.symbol,'batch'),ticks:[]}};});
    vi.stubGlobal('fetch',fetch);a.feed.connect();await vi.advanceTimersByTimeAsync(10000);
    expect(a.onStatusChange).toHaveBeenLastCalledWith('reconnecting');expect(a.onError).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);expect(recovered).toBe(true);expect(a.onStatusChange).toHaveBeenLastCalledWith('live');
    a.feed.disconnect();await vi.advanceTimersByTimeAsync(1000);
  });
  it("retries immediately on network restoration and removes its wake listener on disposal",async()=>{
    const target=Object.assign(new EventTarget(),{location:{href:'https://example.test/'}});vi.stubGlobal('window',target);
    const remove=vi.spyOn(target,'removeEventListener');const a=setup();let available=false;
    const fetch=vi.fn(async()=>({ok:available,json:async()=>response(a.symbol)}));vi.stubGlobal('fetch',fetch);
    a.feed.connect();await vi.advanceTimersByTimeAsync(0);expect(fetch).toHaveBeenCalledOnce();
    available=true;target.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(2);expect(a.onStatusChange).toHaveBeenLastCalledWith('live');
    a.feed.disconnect();await vi.advanceTimersByTimeAsync(1000);expect(remove).toHaveBeenCalledWith('online',expect.any(Function));
    const count=fetch.mock.calls.length;target.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(0);expect(fetch).toHaveBeenCalledTimes(count);
  });
  it("does not let a failing quote subscriber block chart ticks",async()=>{
    const a=setup();let cursor=6000;const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});
    const unsubscribe=subscribeOTCQuotes(()=>{throw new Error('bad quote consumer');});
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>response(a.symbol,cursor===6000?'snapshot':'batch',cursor++)})));
    a.feed.connect();await vi.advanceTimersByTimeAsync(200);expect(a.onTick).toHaveBeenCalled();expect(a.onStatusChange).toHaveBeenLastCalledWith('live');expect(warning).toHaveBeenCalled();
    unsubscribe();a.feed.disconnect();await vi.advanceTimersByTimeAsync(1000);
  });

  it("does not report an empty initial snapshot as a live market",async()=>{
    const a=setup();vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({...response(a.symbol),ticks:[]})})));
    a.feed.connect();await vi.advanceTimersByTimeAsync(0);expect(a.onHistory).not.toHaveBeenCalled();expect(a.onStatusChange).toHaveBeenLastCalledWith('reconnecting');
    a.feed.disconnect();await vi.advanceTimersByTimeAsync(1000);
  });
  it("wakes on foreground visibility without overlapping an in-flight request",async()=>{
    const target=Object.assign(new EventTarget(),{location:{href:'https://example.test/'}});vi.stubGlobal('window',target);
    const doc=Object.assign(new EventTarget(),{visibilityState:'visible'});vi.stubGlobal('document',doc);
    const a=setup();let finish:((value:any)=>void)|undefined;
    const fetch=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockImplementation(async()=>({ok:true,json:async()=>response(a.symbol)}));vi.stubGlobal('fetch',fetch);
    a.feed.connect();target.dispatchEvent(new Event('online'));doc.dispatchEvent(new Event('visibilitychange'));await vi.advanceTimersByTimeAsync(0);expect(fetch).toHaveBeenCalledOnce();
    finish!({ok:true,json:async()=>response(a.symbol)});await vi.advanceTimersByTimeAsync(0);
    doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));await vi.advanceTimersByTimeAsync(0);expect(fetch).toHaveBeenCalledOnce();
    doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));await vi.advanceTimersByTimeAsync(0);expect(fetch).toHaveBeenCalledTimes(2);
    a.feed.disconnect();await vi.advanceTimersByTimeAsync(1000);
  });

});
