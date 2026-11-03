import { observedHistory } from "./native/observedHistory";
import { publishOTCQuote } from "@/lib/otcMarket";
import type {
  MarketDataFeed,
  MarketFeedCallbacks,
  MarketTick,
  MarketFeedStatus,
} from "./marketDataFeed";
interface Stream {
  listeners: Set<MarketFeedCallbacks>;
  status: MarketFeedStatus;
  session?: string;
  cursor?: number;
  timestamp: number;
  hydrating: boolean;
  stopped: boolean;
  failures: number;
  timer?: ReturnType<typeof setTimeout>;
  dispose?: ReturnType<typeof setTimeout>;
  abort?: AbortController;
}
const streams = new Map<string, Stream>();
/** Same-origin serverless transport. One non-overlapping request per symbol,
 * batched 100ms server ticks, no browser price generation or easing. */
export function createInternalOTCHttpFeed(
  url: string,
  symbol: string,
  callbacks: MarketFeedCallbacks,
): MarketDataFeed {
  const key = JSON.stringify([url, symbol]);
  let attached: Stream | undefined;
  const notify = (stream: Stream, status: MarketFeedStatus) => {
    stream.status = status;
    for (const listener of stream.listeners) listener.onStatusChange?.(status);
  };
  function parse(raw: any): MarketTick {
    if (
      raw?.symbol !== symbol ||
      raw.source !== "internal-otc" ||
      typeof raw.t !== "string" ||
      !/^\d{1,16}$/.test(raw.t) ||
      typeof raw.p !== "string" ||
      !/^\d+(\.\d{1,12})?$/.test(raw.p)
    )
      throw new Error("Invalid OTC tick");
    const micros = Number(raw.t),
      price = Number(raw.p);
    if (
      !Number.isSafeInteger(micros) ||
      !Number.isSafeInteger(raw.sequence) ||
      raw.sequence < 0 ||
      !Number.isFinite(price) ||
      price <= 0
    )
      throw new Error("Invalid OTC coordinates");
    return {
      symbol,
      price,
      timestamp: micros / 1e6,
      sequence: raw.sequence,
      source: "internal-otc",
    };
  }
  async function poll(stream: Stream) {
    if (stream.stopped) return;
    const abort = new AbortController();
    stream.abort = abort;
    const timeout = setTimeout(() => abort.abort(), 10000);
    let delay = 500;
    try {
      const endpoint = new URL(
        url,
        typeof window === "undefined"
          ? "http://localhost"
          : window.location.href,
      );
      endpoint.searchParams.set("action", "ticks");
      endpoint.searchParams.set("symbol", symbol);
      if (stream.cursor !== undefined)
        endpoint.searchParams.set("after", String(stream.cursor));
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal: abort.signal,
      });
      if (!response.ok) throw new Error("OTC API unavailable");
      const data = await response.json();
      if (stream.stopped) return;
      if (
        data.source !== "internal-otc" ||
        data.symbol !== symbol ||
        !["snapshot", "batch"].includes(data.type) ||
        typeof data.session !== "string" ||
        !Array.isArray(data.ticks) ||
        data.ticks.length > 5000 ||
        !Number.isSafeInteger(data.cursor) ||
        !Number.isFinite(data.serverTime)
      )
        throw new Error("Invalid OTC response");
      const ticks: MarketTick[] = data.ticks.map(parse);
      for (let i = 0; i < ticks.length; i++) {
        if (
          ticks[i].timestamp > data.serverTime + 0.1 ||
          (i > 0 &&
            (ticks[i].sequence! <= ticks[i - 1].sequence! ||
              ticks[i].timestamp <= ticks[i - 1].timestamp))
        )
          throw new Error("Unordered OTC batch");
      }
      if (ticks.length && data.cursor !== ticks.at(-1)!.sequence)
        throw new Error("Invalid OTC cursor");
      if (
        stream.session &&
        stream.session !== data.session &&
        data.type !== "snapshot"
      ) {
        stream.cursor = undefined;
        stream.hydrating = true;
        notify(stream, "reconnecting");
        delay = 100;
        return;
      }
      const candles = data.candles;
      if (candles !== undefined) {
        if (
          data.type !== "snapshot" ||
          !Array.isArray(candles) ||
          candles.length > 20000
        )
          throw new Error("Invalid OTC candle history");
        for (let i = 0; i < candles.length; i++) {
          const bar = candles[i];
          if (
            ![
              bar.time,
              bar.open,
              bar.high,
              bar.low,
              bar.close,
              bar.volume,
            ].every(Number.isFinite) ||
            bar.time % 5 !== 0 ||
            bar.low <= 0 ||
            bar.high < Math.max(bar.open, bar.close) ||
            bar.low > Math.min(bar.open, bar.close) ||
            bar.volume < 1 ||
            (i > 0 && bar.time <= candles[i - 1].time)
          )
            throw new Error("Invalid OTC candle");
        }
      }
      const reset = data.type === "snapshot" || stream.session !== data.session;
      if (reset) {
        observedHistory.reset(url, symbol);
        stream.timestamp = -Infinity;
        stream.hydrating = true;
      }
      stream.session = data.session;
      const received: MarketTick[] = [];
      for (const tick of ticks) {
        if (tick.timestamp <= stream.timestamp) continue;
        if (observedHistory.record(url, symbol, tick)) {
          stream.timestamp = tick.timestamp;
          received.push(tick);
        }
      }
      if (reset && candles?.length && ticks.length) {
        const latest = ticks.at(-1)!;
        observedHistory.seed(
          url,
          symbol,
          candles,
          latest.timestamp,
          latest.sequence!,
        );
      }
      stream.cursor = data.cursor;
      stream.failures = 0;
      if (data.catchingUp) {
        stream.hydrating = true;
        notify(stream, "reconnecting");
        delay = 100;
      } else {
        // Hydrate only after backlog is complete; never turn downtime into flat/fake bars.
        const latest = received.at(-1);
        if (latest)
          publishOTCQuote({
            ...latest,
            sequence: latest.sequence!,
            session: stream.session,
          });
        if (stream.hydrating) {
          for (const listener of stream.listeners) listener.onHistory?.();
          stream.hydrating = false;
        } else
          for (const tick of received)
            for (const listener of stream.listeners) listener.onTick(tick);
        notify(stream, "live");
      }
    } catch (error) {
      if (!stream.stopped) {
        notify(stream, "reconnecting");
        for (const listener of stream.listeners)
          listener.onError?.(
            error instanceof Error ? error : new Error(String(error)),
          );
        delay = Math.min(10000, 500 * 2 ** Math.min(stream.failures++, 5));
      }
    } finally {
      clearTimeout(timeout);
      if (!stream.stopped)
        stream.timer = setTimeout(() => void poll(stream), delay);
    }
  }
  return {
    connect() {
      if (attached) return;
      let stream = streams.get(key);
      const fresh = !stream;
      if (!stream) {
        stream = {
          listeners: new Set(),
          status: "connecting",
          timestamp: -Infinity,
          hydrating: true,
          stopped: false,
          failures: 0,
        };
        streams.set(key, stream);
      }
      attached = stream;
      clearTimeout(stream.dispose);
      stream.listeners.add(callbacks);
      callbacks.onStatusChange?.(stream.status);
      if (!stream.hydrating && stream.cursor !== undefined)
        callbacks.onHistory?.();
      if (fresh) void poll(stream);
    },
    disconnect() {
      if (!attached) return;
      const stream = attached;
      attached = undefined;
      stream.listeners.delete(callbacks);
      if (!stream.listeners.size)
        stream.dispose = setTimeout(() => {
          if (stream.listeners.size) return;
          stream.stopped = true;
          clearTimeout(stream.timer);
          stream.abort?.abort();
          streams.delete(key);
        }, 1000);
    },
  };
}
