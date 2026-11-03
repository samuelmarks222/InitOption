import type { OHLCCandle } from '../priceEngine';
import type { ChartType } from '../../ChartToolbar';
import { heikinAshiCandle } from './animation';

/** A chart point is a projection of one received OHLC state, never a tween. */
export function tickChartPoint(type: ChartType, candle: OHLCCandle, history: readonly OHLCCandle[]) {
  if (type === 'line') return { time: candle.time, value: candle.close };
  const source = type === 'heikinAshi' ? heikinAshiCandle(candle, history) : candle;
  return { time: source.time, open: source.open, high: source.high, low: source.low, close: source.close };
}
/** Data commits are synchronous. Only the Canvas renderer coalesces paints. */
export class TickSeriesWriter<T> {
  private disposed = false;
  constructor(private readonly series: { update(point: T): void }) {}
  update(point: T) { if (!this.disposed) this.series.update(point); }
  cleanup() { this.disposed = true; }
}
