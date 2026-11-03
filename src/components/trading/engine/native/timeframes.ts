/** UTC/epoch aligned intervals. Timestamps throughout the engine are seconds. */
export const INTERVALS = {
  '5s': 5, '10s': 10, '15s': 15, '30s': 30,
  '1m': 60, '2m': 120, '3m': 180, '4m': 240, '5m': 300,
  '10m': 600, '15m': 900, '30m': 1800, '1h': 3600, '2h': 7200, '4h': 14400,
} as const;
export const bucketStart = (timestamp: number, seconds: number) => {
  if (!Number.isFinite(timestamp) || !Number.isFinite(seconds) || seconds <= 0) throw new Error('Invalid candle interval');
  return Math.floor(timestamp / seconds) * seconds;
};
