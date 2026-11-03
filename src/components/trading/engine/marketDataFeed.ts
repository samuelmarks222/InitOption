import { createInternalOTCHttpFeed } from "./internalOTCHttpFeed";
import { createInternalOTCFeed } from "./internalOTCFeed";
import { getSynchronizedUnixTimeMs } from "@/lib/serverTimeSync";
import { observedHistory } from "./native/observedHistory";
import { OTCPriceEngine, type OHLCCandle, type TimeframeConfig } from "./priceEngine";

export type MarketFeedStatus =
  | "unavailable"
  | "connecting"
  | "live"
  | "reconnecting"
  | "fallback"
  | "disconnected";

export interface MarketTick {
  symbol: string;
  price: number;
  timestamp: number;
  sequence?: number;
  source: "websocket" | "simulated" | "internal-otc";
}

export interface MarketFeedSubscription {
  symbol: string;
  basePrice: number;
  timeframe: TimeframeConfig;
  assetCategory?: string | null;
}

export interface MarketFeedCallbacks {
  onTick: (tick: MarketTick) => void;
  onHistory?: () => void;
  onStatusChange?: (status: MarketFeedStatus) => void;
  onError?: (error: Error) => void;
}

export interface MarketDataFeed {
  connect: () => void;
  disconnect: () => void;
}

interface FeedFactoryOptions {
  subscription: MarketFeedSubscription;
  callbacks: MarketFeedCallbacks;
  websocketUrl?: string;
  internalOTC?: boolean;
}

type TimerHandle = ReturnType<typeof setTimeout>;
const TAU = Math.PI * 2;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeTimestamp = (value: unknown, fallback = Date.now() / 1000) => {
  if (isFiniteNumber(value)) {
    return value > 1_000_000_000_000 ? value / 1000 : value;
  }

  if (typeof value === "string") {
    if (!value.trim()) return fallback;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric > 1_000_000_000_000 ? numeric / 1000 : numeric;
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed / 1000;
    }
  }

  return fallback;
};

const normalizePrice = (value: unknown) => {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
};

const hashString = (input: string) => {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const hashUnit = (symbol: string, salt: string) => hashString(`${salt}:${symbol}`) / 0xffffffff;

const signedHash = (symbol: string, salt: string) => hashUnit(symbol, salt) * 2 - 1;

const smoothstep = (value: number) => value * value * (3 - 2 * value);

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

const noiseAt = (symbol: string, salt: string, position: number) => {
  const leftIndex = Math.floor(position);
  const rightIndex = leftIndex + 1;
  const amount = smoothstep(position - leftIndex);
  const leftNoise = signedHash(symbol, `${salt}:${leftIndex}`);
  const rightNoise = signedHash(symbol, `${salt}:${rightIndex}`);

  return lerp(leftNoise, rightNoise, amount);
};

const getPricePrecision = (price: number) => {
  if (price > 10000) return 2;
  if (price > 100) return 3;
  if (price > 1) return 5;
  return 6;
};

const getSyntheticStepRatio = (timeframeSeconds: number) => {
  if (timeframeSeconds <= 1) return 0.0000042;
  if (timeframeSeconds <= 5) return 0.0000048;
  if (timeframeSeconds <= 15) return 0.0000056;
  if (timeframeSeconds <= 30) return 0.0000064;
  if (timeframeSeconds <= 60) return 0.0000072;
  return 0.0000085;
};

const LIVE_MARKET_MICROSTRUCTURE_SECONDS = 1;
const SYNTHETIC_MARKET_TICK_INTERVAL_MS = 160;
const SYNTHETIC_REPLAY_WINDOW_SECONDS = 140;

const getSharedLivePriceAt = (
  engine: OTCPriceEngine,
  timestamp: number,
) => engine.getCurrentPriceAt(timestamp, LIVE_MARKET_MICROSTRUCTURE_SECONDS);

const getIntraBucketFraction = (timestamp: number, timeframeSeconds: number) => {
  const safePeriod = Math.max(1, timeframeSeconds);
  const remainder = ((timestamp % safePeriod) + safePeriod) % safePeriod;
  return remainder / safePeriod;
};

export interface DeterministicTickSimulationInput {
  symbol: string;
  basePrice: number;
  timeframeSeconds: number;
  timestamp: number;
  previousPrice: number;
  anchorPrice: number;
  velocity: number;
}

export interface DeterministicTickSimulationOutput {
  price: number;
  velocity: number;
}

export interface DeterministicTickReplayInput {
  symbol: string;
  basePrice: number;
  timeframe: TimeframeConfig;
  timestamp: number;
  assetCategory?: string | null;
}

export interface DeterministicTickReplayResult {
  candle: OHLCCandle;
  price: number;
  velocity: number;
}

export const simulateDeterministicTickPrice = ({
  symbol,
  basePrice,
  timeframeSeconds,
  timestamp,
  previousPrice,
  anchorPrice,
  velocity,
}: DeterministicTickSimulationInput): DeterministicTickSimulationOutput => {
  const safeBasePrice = Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 1;
  const safeAnchorPrice = Number.isFinite(anchorPrice) && anchorPrice > 0 ? anchorPrice : safeBasePrice;
  const referencePrice =
    Number.isFinite(previousPrice) && previousPrice > 0 ? previousPrice : safeAnchorPrice;
  const marketTimeframeSeconds = LIVE_MARKET_MICROSTRUCTURE_SECONDS;
  const stepRatio = getSyntheticStepRatio(marketTimeframeSeconds);
  // The displayed chart timeframe must not change the underlying market path.
  // This models an authoritative tick stream; CandleAggregator builds every
  // selected chart timeframe from the same ticks.
  const fastNoise = noiseAt(symbol, "tick-fast", timestamp / 0.72);
  const scalpNoise = noiseAt(symbol, "tick-scalp", timestamp / 0.18);
  const pullbackNoise = noiseAt(symbol, "tick-pullback", timestamp / 7.5);
  const trendNoise = noiseAt(symbol, "tick-trend", timestamp / 95);
  const volatilityRegime = 0.52 + ((noiseAt(symbol, "volatility-regime", timestamp / 55) + 1) / 2) * 0.62;
  const waveOne =
    Math.sin(timestamp * (0.56 + hashUnit(symbol, "wave-one-speed") * 0.34) + hashUnit(symbol, "wave-one-phase") * TAU);
  const waveTwo =
    Math.sin(timestamp * (1.15 + hashUnit(symbol, "wave-two-speed") * 0.62) + hashUnit(symbol, "wave-two-phase") * TAU);
  const microPulse =
    Math.sin(timestamp * (3.4 + hashUnit(symbol, "micro-pulse-speed") * 1.8) + hashUnit(symbol, "micro-pulse-phase") * TAU);
  const impulseCycleSeconds = 38 + hashUnit(symbol, "impulse-cycle") * 34;
  const impulsePosition = (timestamp / impulseCycleSeconds + hashUnit(symbol, "impulse-phase")) % 1;
  const impulseWindow = impulsePosition < 0.1 ? Math.sin((impulsePosition / 0.1) * Math.PI) : 0;
  const impulseDirection = signedHash(symbol, `impulse-direction:${Math.floor(timestamp / impulseCycleSeconds)}`);
  const shock =
    safeBasePrice *
    stepRatio *
    volatilityRegime *
    (
      trendNoise * 0.18 +
      pullbackNoise * 0.14 +
      fastNoise * 0.16 +
      scalpNoise * 0.16 +
      waveOne * 0.09 +
      waveTwo * 0.06 +
      microPulse * 0.1 +
      impulseWindow * impulseDirection * 0.32
    );
  const nextVelocity = velocity * 0.64 + shock;
  const meanReversionStrength = clamp(0.045 + volatilityRegime * 0.018, 0.045, 0.085);
  const meanReversion = (safeAnchorPrice - referencePrice) * meanReversionStrength;
  const anchorDistanceRatio =
    Math.abs(safeAnchorPrice - referencePrice) / Math.max(safeBasePrice * stepRatio * 7, 1e-9);
  const stepCap = safeBasePrice * stepRatio * (1.05 + volatilityRegime * 0.55 + Math.min(1.4, anchorDistanceRatio * 0.36));
  const rawNextPrice = referencePrice + meanReversion + nextVelocity;
  const boundedDelta = clamp(rawNextPrice - referencePrice, -stepCap, stepCap);
  const boundedPrice = clamp(referencePrice + boundedDelta, safeBasePrice * 0.25, safeBasePrice * 4);
  const precision = getPricePrecision(safeBasePrice);

  return {
    price: Number(boundedPrice.toFixed(precision)),
    velocity: nextVelocity,
  };
};

export const getSyntheticMarketTickIntervalMs = () => SYNTHETIC_MARKET_TICK_INTERVAL_MS;

export const getTickIntervalMsForTimeframe = (_timeframe?: TimeframeConfig) =>
  getSyntheticMarketTickIntervalMs();

export const replayDeterministicTickState = ({
  symbol,
  basePrice,
  timeframe,
  timestamp,
  assetCategory,
}: DeterministicTickReplayInput): DeterministicTickReplayResult => {
  const normalizedTimestamp = normalizeTimestamp(timestamp, Date.now() / 1000);
  const engine = new OTCPriceEngine(symbol, basePrice, assetCategory);
  const candle = engine.generateLiveCandle(timeframe, normalizedTimestamp);
  const price = getSharedLivePriceAt(engine, normalizedTimestamp);

  candle.close = price;
  candle.high = Math.max(candle.high, candle.open, price);
  candle.low = Math.min(candle.low, candle.open, price);
  candle.volume = Math.max(1, candle.volume);

  return {
    candle,
    price,
    velocity: 0,
  };
};

const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

class WebSocketTickFeed implements MarketDataFeed {
  private readonly url: string;
  private readonly subscription: MarketFeedSubscription;
  private readonly callbacks: MarketFeedCallbacks;
  private socket: WebSocket | null = null;
  private reconnectTimer: TimerHandle | null = null;
  private reconnectAttempt = 0;
  private manualDisconnect = false;
  private lastSequence = -1;
  private lastTimestamp = 0;
  private lastPrice: number | undefined;

  constructor(url: string, subscription: MarketFeedSubscription, callbacks: MarketFeedCallbacks) {
    this.url = url;
    this.subscription = subscription;
    this.callbacks = callbacks;
  }

  connect() {
    this.manualDisconnect = false;
    if (this.reconnectTimer !== null) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.openSocket();
  }

  disconnect() {
    this.manualDisconnect = true;

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.sendMessage({
        type: "unsubscribe",
        channel: "ticks",
        symbol: this.subscription.symbol,
        timeframe: this.subscription.timeframe.label,
      });
      const socket = this.socket;
      this.detachSocket(socket);
      this.socket = null;
      socket.close();
    }

    this.callbacks.onStatusChange?.("disconnected");
  }

  private openSocket() {
    if (typeof WebSocket === "undefined") {
      this.callbacks.onError?.(new Error("WebSocket is not available in this runtime"));
      return;
    }

    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      return;
    }

    this.callbacks.onStatusChange?.(this.reconnectAttempt === 0 ? "connecting" : "reconnecting");

    let socket: WebSocket;
    try { socket = new WebSocket(this.url); }
    catch (error) { this.callbacks.onError?.(toError(error)); this.scheduleReconnect(); return; }
    this.socket = socket;

    socket.addEventListener("open", this.handleOpen);
    socket.addEventListener("message", this.handleMessage);
    socket.addEventListener("error", this.handleError);
    socket.addEventListener("close", this.handleClose);
  }

  private readonly handleOpen = () => {
    this.reconnectAttempt = 0;
    // Keep replay cursors across reconnects; duplicate snapshots must not add volume.
    this.callbacks.onStatusChange?.("live");
    this.sendMessage({
      type: "subscribe",
      channel: "ticks",
      symbol: this.subscription.symbol,
      timeframe: this.subscription.timeframe.label,
    });
  };

  private readonly handleMessage = (event: MessageEvent) => {
    if (this.manualDisconnect || event.currentTarget !== this.socket) return;
    try {
      const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

      if (Array.isArray(payload?.ticks)) {
        [...payload.ticks]
          .filter(tick => tick && typeof tick === "object")
          .sort((a, b) => normalizeTimestamp(a.timestamp) - normalizeTimestamp(b.timestamp)
            || (isFiniteNumber(a.sequence) && isFiniteNumber(b.sequence) ? a.sequence - b.sequence : 0))
          .forEach((tick) => this.emitTick(tick));
        return;
      }

      if (payload?.type === "tick" || payload?.symbol) {
        this.emitTick(payload);
      }
    } catch (error) {
      this.callbacks.onError?.(toError(error));
    }
  };

  private readonly handleError = (event: Event) => {
    this.callbacks.onError?.(new Error(`Market data socket error: ${event.type}`));
  };

  private detachSocket(socket: WebSocket) {
    socket.removeEventListener("open", this.handleOpen);
    socket.removeEventListener("message", this.handleMessage);
    socket.removeEventListener("error", this.handleError);
    socket.removeEventListener("close", this.handleClose);
  }

  private readonly handleClose = (event: CloseEvent) => {
    if (event.currentTarget !== this.socket) return;
    if (this.socket) this.detachSocket(this.socket);
    this.socket = null;
    this.scheduleReconnect();
  };

  private scheduleReconnect() {
    if (this.manualDisconnect || this.reconnectTimer !== null) return;
    const backoffMs = Math.min(10_000, 750 * 2 ** this.reconnectAttempt);
    const jitterMs = Math.round(Math.random() * 250);
    this.reconnectAttempt += 1;
    this.callbacks.onStatusChange?.("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, backoffMs + jitterMs);
  }

  private emitTick(payload: Record<string, unknown>) {
    if (!payload || typeof payload !== "object" || payload.source === "simulated") return;
    const price = normalizePrice(payload.price);
    if (!isFiniteNumber(price) || price <= 0) {
      return;
    }

    const symbol = typeof payload.symbol === "string" ? payload.symbol : "";

    if (symbol !== this.subscription.symbol) {
      return;
    }

    const timestamp = normalizeTimestamp(payload.timestamp, Number.NaN);
    if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp > getSynchronizedUnixTimeMs() / 1000 + 30) return;
    if (payload.sequence !== undefined && (!Number.isSafeInteger(payload.sequence) || Number(payload.sequence) < 0)) return;
    const sequence = isFiniteNumber(payload.sequence) ? payload.sequence : undefined;

    if (typeof sequence === "number" && sequence <= this.lastSequence) {
      return;
    }

    if (timestamp < this.lastTimestamp) {
      return;
    }

    if (typeof sequence === "number") {
      this.lastSequence = sequence;
    }

    if (sequence === undefined && timestamp === this.lastTimestamp && price === this.lastPrice) return;
    this.lastTimestamp = timestamp;
    this.lastPrice = price;
    this.callbacks.onTick({
      symbol,
      price,
      timestamp,
      sequence,
      source: "websocket",
    });
  }

  private sendMessage(payload: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(payload));
  }
}

interface SharedFeed {
  feed: MarketDataFeed;
  listeners: Set<MarketFeedCallbacks>;
  status: MarketFeedStatus;
  timer?: ReturnType<typeof setTimeout>;
}
const sharedFeeds = new Map<string, SharedFeed>();

export const createMarketDataFeed = ({
  subscription,
  callbacks,
  websocketUrl,
  internalOTC = false,
}: FeedFactoryOptions): MarketDataFeed => {
  const safeBasePrice =
    Number.isFinite(subscription.basePrice) && subscription.basePrice > 0 ? subscription.basePrice : 1;
  const normalizedSubscription = {
    ...subscription,
    basePrice: safeBasePrice,
  };

  if (internalOTC && websocketUrl?.trim()) return /^wss?:/i.test(websocketUrl) ? createInternalOTCFeed(websocketUrl, subscription.symbol, callbacks) : createInternalOTCHttpFeed(websocketUrl, subscription.symbol, callbacks);

  if (websocketUrl && websocketUrl.trim().length > 0) {
    const key = JSON.stringify([websocketUrl, subscription.symbol, subscription.assetCategory ?? ""]);
    let attached: SharedFeed | undefined;
    return {
      connect() {
        if (attached) return;
        let entry = sharedFeeds.get(key);
        const fresh = !entry;
        if (!entry) {
          entry = { feed: null!, listeners: new Set(), status: "connecting" };
          const stream = entry;
          // A raw tick subscription is independent of the selected display interval.
          stream.feed = new WebSocketTickFeed(websocketUrl, {
            ...normalizedSubscription,
            timeframe: { ...normalizedSubscription.timeframe, label: "5s", seconds: 5 },
          }, {
            onTick(tick) {
              if (!observedHistory.record(websocketUrl, tick.symbol, tick)) return;
              for (const listener of [...stream.listeners]) {
                try { listener.onTick(tick); } catch (error) { listener.onError?.(toError(error)); }
              }
            },
            onStatusChange(status) {
              stream.status = status;
              for (const listener of [...stream.listeners]) listener.onStatusChange?.(status);
            },
            onError(error) { for (const listener of [...stream.listeners]) listener.onError?.(error); },
          });
          sharedFeeds.set(key, stream);
        }
        clearTimeout(entry.timer);
        attached = entry; entry.listeners.add(callbacks);
        callbacks.onStatusChange?.(entry.status);
        if (fresh) entry.feed.connect();
      },
      disconnect() {
        if (!attached) return;
        const stream = attached; attached = undefined;
        stream.listeners.delete(callbacks);
        callbacks.onStatusChange?.("disconnected");
        if (!stream.listeners.size && stream.status === "reconnecting") {
          clearTimeout(stream.timer); stream.feed.disconnect(); sharedFeeds.delete(key); return;
        }
        if (!stream.listeners.size) stream.timer = setTimeout(() => {
          if (!stream.listeners.size) { stream.feed.disconnect(); sharedFeeds.delete(key); }
        }, 1000);
      },
    };
  }

  return {
    connect() {
      callbacks.onStatusChange?.("unavailable");
      callbacks.onError?.(new Error("Live market WebSocket URL is not configured; simulated prices are disabled"));
    },
    disconnect() { callbacks.onStatusChange?.("disconnected"); },
  };
};
