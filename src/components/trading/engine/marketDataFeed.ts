import { OTCPriceEngine, type TimeframeConfig } from "./priceEngine";

export type MarketFeedStatus =
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
  source: "websocket" | "simulated";
}

export interface MarketFeedSubscription {
  symbol: string;
  basePrice: number;
  timeframe: TimeframeConfig;
  assetCategory?: string | null;
}

export interface MarketFeedCallbacks {
  onTick: (tick: MarketTick) => void;
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
  if (timeframeSeconds <= 1) return 0.0000055;
  if (timeframeSeconds <= 5) return 0.0000065;
  if (timeframeSeconds <= 15) return 0.000008;
  if (timeframeSeconds <= 30) return 0.0000105;
  if (timeframeSeconds <= 60) return 0.0000135;
  return 0.000016;
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
  const stepRatio = getSyntheticStepRatio(timeframeSeconds);
  const fastNoise = noiseAt(symbol, "tick-fast", timestamp / 0.28);
  const slowNoise = noiseAt(symbol, "tick-slow", timestamp / Math.max(1.5, timeframeSeconds * 0.65));
  const waveOne =
    Math.sin(timestamp * (2.2 + hashUnit(symbol, "wave-one-speed") * 1.2) + hashUnit(symbol, "wave-one-phase") * TAU);
  const waveTwo =
    Math.sin(timestamp * (5.6 + hashUnit(symbol, "wave-two-speed") * 2.2) + hashUnit(symbol, "wave-two-phase") * TAU);
  const microPulse =
    Math.sin(timestamp * (13 + hashUnit(symbol, "micro-pulse-speed") * 7) + hashUnit(symbol, "micro-pulse-phase") * TAU);
  const shock =
    safeBasePrice *
    stepRatio *
    (fastNoise * 0.9 + slowNoise * 0.42 + waveOne * 0.38 + waveTwo * 0.2 + microPulse * 0.58);
  const nextVelocity = velocity * 0.46 + shock * 0.78;
  const meanReversionStrength = clamp(0.035 + timeframeSeconds / 1600, 0.035, 0.11);
  const meanReversion = (safeAnchorPrice - referencePrice) * meanReversionStrength;
  const anchorDistanceRatio =
    Math.abs(safeAnchorPrice - referencePrice) / Math.max(safeBasePrice * stepRatio * 6, 1e-9);
  const stepCap = safeBasePrice * stepRatio * (1 + Math.min(4, anchorDistanceRatio));
  const rawNextPrice = referencePrice + meanReversion + nextVelocity;
  const boundedDelta = clamp(rawNextPrice - referencePrice, -stepCap, stepCap);
  const boundedPrice = clamp(referencePrice + boundedDelta, safeBasePrice * 0.25, safeBasePrice * 4);
  const precision = getPricePrecision(safeBasePrice);

  return {
    price: Number(boundedPrice.toFixed(precision)),
    velocity: nextVelocity,
  };
};

const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

class DeterministicTickFeed implements MarketDataFeed {
  private readonly subscription: MarketFeedSubscription;
  private readonly callbacks: MarketFeedCallbacks;
  private readonly engine: OTCPriceEngine;
  private connected = false;
  private nextTickAtMs = 0;
  private timer: TimerHandle | null = null;
  private lastPrice = Number.NaN;
  private velocity = 0;

  constructor(subscription: MarketFeedSubscription, callbacks: MarketFeedCallbacks) {
    this.subscription = subscription;
    this.callbacks = callbacks;
    this.engine = new OTCPriceEngine(subscription.symbol, subscription.basePrice, subscription.assetCategory);
  }

  connect() {
    if (this.connected) return;

    this.connected = true;
    this.nextTickAtMs = Date.now();
    this.lastPrice = this.engine.getCurrentPriceAt(this.nextTickAtMs / 1000);
    this.velocity = 0;
    this.callbacks.onStatusChange?.("fallback");
    this.schedulePump(0);
  }

  disconnect() {
    this.connected = false;

    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.lastPrice = Number.NaN;
    this.velocity = 0;
    this.callbacks.onStatusChange?.("disconnected");
  }

  private schedulePump(delayMs: number) {
    if (!this.connected) return;
    this.timer = setTimeout(() => this.pump(), Math.max(0, Math.floor(delayMs)));
  }

  private pump() {
    if (!this.connected) return;

    const tickIntervalMs = Math.max(25, this.subscription.timeframe.updateIntervalMs);
    const nowMs = Date.now();
    let guard = 0;

    while (this.nextTickAtMs <= nowMs && guard < 64) {
      const timestamp = this.nextTickAtMs / 1000;
      const anchorPrice = this.engine.getCurrentPriceAt(timestamp);
      const nextTick = simulateDeterministicTickPrice({
        symbol: this.subscription.symbol,
        basePrice: this.subscription.basePrice,
        timeframeSeconds: this.subscription.timeframe.seconds,
        timestamp,
        previousPrice: this.lastPrice,
        anchorPrice,
        velocity: this.velocity,
      });
      const price = nextTick.price;
      this.lastPrice = price;
      this.velocity = nextTick.velocity;

      this.callbacks.onTick({
        symbol: this.subscription.symbol,
        price,
        timestamp,
        source: "simulated",
      });

      this.nextTickAtMs += tickIntervalMs;
      guard += 1;
    }

    if (nowMs - this.nextTickAtMs > tickIntervalMs * 8) {
      this.nextTickAtMs = nowMs + tickIntervalMs;
    }

    this.schedulePump(Math.max(4, this.nextTickAtMs - Date.now()));
  }
}

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

  constructor(url: string, subscription: MarketFeedSubscription, callbacks: MarketFeedCallbacks) {
    this.url = url;
    this.subscription = subscription;
    this.callbacks = callbacks;
  }

  connect() {
    this.manualDisconnect = false;
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
      this.socket.close();
      this.socket = null;
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

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener("open", this.handleOpen);
    socket.addEventListener("message", this.handleMessage);
    socket.addEventListener("error", this.handleError);
    socket.addEventListener("close", this.handleClose);
  }

  private readonly handleOpen = () => {
    this.reconnectAttempt = 0;
    this.lastSequence = -1;
    this.lastTimestamp = 0;
    this.callbacks.onStatusChange?.("live");
    this.sendMessage({
      type: "subscribe",
      channel: "ticks",
      symbol: this.subscription.symbol,
      timeframe: this.subscription.timeframe.label,
    });
  };

  private readonly handleMessage = (event: MessageEvent) => {
    try {
      const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

      if (Array.isArray(payload?.ticks)) {
        payload.ticks.forEach((tick) => this.emitTick(tick));
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

  private readonly handleClose = () => {
    if (this.socket) {
      this.socket.removeEventListener("open", this.handleOpen);
      this.socket.removeEventListener("message", this.handleMessage);
      this.socket.removeEventListener("error", this.handleError);
      this.socket.removeEventListener("close", this.handleClose);
      this.socket = null;
    }

    if (this.manualDisconnect) {
      return;
    }

    const backoffMs = Math.min(10_000, 750 * 2 ** this.reconnectAttempt);
    const jitterMs = Math.round(Math.random() * 250);
    this.reconnectAttempt += 1;
    this.callbacks.onStatusChange?.("reconnecting");
    this.reconnectTimer = setTimeout(() => this.openSocket(), backoffMs + jitterMs);
  };

  private emitTick(payload: Record<string, unknown>) {
    const price = normalizePrice(payload.price);
    if (!isFiniteNumber(price) || price <= 0) {
      return;
    }

    const symbol =
      typeof payload.symbol === "string" && payload.symbol.trim().length > 0
        ? payload.symbol
        : this.subscription.symbol;

    if (symbol !== this.subscription.symbol) {
      return;
    }

    const timestamp = normalizeTimestamp(payload.timestamp, Date.now() / 1000);
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

    this.lastTimestamp = timestamp;
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

export const createMarketDataFeed = ({
  subscription,
  callbacks,
  websocketUrl,
}: FeedFactoryOptions): MarketDataFeed => {
  const safeBasePrice =
    Number.isFinite(subscription.basePrice) && subscription.basePrice > 0 ? subscription.basePrice : 1;
  const normalizedSubscription = {
    ...subscription,
    basePrice: safeBasePrice,
  };

  if (websocketUrl && websocketUrl.trim().length > 0) {
    return new WebSocketTickFeed(websocketUrl, normalizedSubscription, callbacks);
  }

  return new DeterministicTickFeed(normalizedSubscription, callbacks);
};
