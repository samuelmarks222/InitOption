import type { PoolClient } from "pg";

export interface OTCAssetConfig {
  price: number;
  volatility?: number;
  drift?: number;
  precision?: number;
  support?: number;
  resistance?: number;
  boundaryStrength?: number;
}

export interface ServerlessOTCOptions {
  transaction: <T>(work: (client: PoolClient) => Promise<T>) => Promise<T>;
  assets: Record<string, OTCAssetConfig>;
  maxBatch?: number;
  warmup?: number;
  retention?: number;
  barRetention?: number;
  generatedHistoryDays?: number;
  /** Injectable clock for tests only; production uses PostgreSQL time. */
  nowForTests?: () => number;
}

export interface OTCReadRequest {
  symbol: string;
  action?: "ticks" | "price" | "history";
  seconds?: number;
  before?: number;
  limit?: number;
  after?: number;
  at?: number;
}

export interface OTCWireTick {
  symbol: string;
  sequence: number;
  t: string;
  p: string;
  source: "internal-otc";
}

export interface OTCCandle {
  origin?: "recorded" | "generated-history" | "mixed";
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OTCSnapshot {
  type: "snapshot" | "batch";
  source: "internal-otc";
  symbol: string;
  session: string;
  precision: number;
  ticks: OTCWireTick[];
  candles?: OTCCandle[];
  cursor: number;
  catchingUp: boolean;
  serverTime: number;
}

export interface OTCPriceReceipt extends OTCWireTick {
  session: string;
  price: number;
  timestamp: number;
  quotedAt: number;
}

export interface OTCHistoryPage {
  generated: boolean;
  notice: string;
  type: "history";
  source: "internal-otc";
  symbol: string;
  seconds: number;
  before: number;
  hasMore: boolean;
  earliest: number | null;
  candles: OTCCandle[];
}
export interface OTCPending {
  pending: true;
  source: "internal-otc";
  session: string;
}

export const SLOT_MS: number;
export class OTCError extends Error {
  status: number;
  constructor(status: number, message: string);
}
export function createServerlessOTC(
  options: ServerlessOTCOptions,
): (request: OTCReadRequest) => Promise<OTCSnapshot | OTCPriceReceipt | OTCPending | OTCHistoryPage>;
