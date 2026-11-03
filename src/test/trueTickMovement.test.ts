import { afterEach, describe, expect, it, vi } from 'vitest';
import { CandleAggregator } from '@/components/trading/engine/native/realtime';
import { tickChartPoint, TickSeriesWriter } from '@/components/trading/engine/native/tickRendering';
import { heikinAshi } from '@/components/trading/engine/native/marketData';
import type { ChartType } from '@/components/trading/ChartToolbar';
import type { OHLCCandle } from '@/components/trading/engine/priceEngine';
import { createMarketDataFeed } from '@/components/trading/engine/marketDataFeed';
import { TIMEFRAMES } from '@/components/trading/engine/priceEngine';
const prices = [1.10520, 1.10523, 1.10518, 1.10525, 1.10521, 1.10516, 1.10519, 1.10528];
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
for (const type of ['candles','heikinAshi','bars','line'] as ChartType[]) {
  describe(`${type}: actual tick-by-tick movement`, () => {
    it('commits every reversal synchronously and never keeps moving between received ticks', () => {
      vi.useFakeTimers(); vi.setSystemTime(600000);
      const update = vi.fn();
      const writer = new TickSeriesWriter({update});
      const rawUpdates: OHLCCandle[] = [];
      const aggregator = new CandleAggregator(5, vi.fn(), candle => {
        rawUpdates.push(candle);
        writer.update(tickChartPoint(type, candle, []));
      });
      prices.forEach((price, index) => {
        aggregator.onTick({timestamp:600 + index * .1, price});
        // No RAF or timer advance: every incoming quote is already committed.
        expect(update).toHaveBeenCalledTimes(index + 1);
        const raw = rawUpdates[index];
        expect(raw).toEqual({time:600,open:prices[0],high:Math.max(...prices.slice(0,index+1)),low:Math.min(...prices.slice(0,index+1)),close:price,volume:index+1});
        const actual = update.mock.calls[index][0];
        if (type === 'line') expect(actual).toEqual({time:600,value:price});
        else if (type === 'heikinAshi') {
          const derived = heikinAshi([raw])[0];
          expect(actual).toEqual({time:600,open:derived.open,high:derived.high,low:derived.low,close:derived.close});
        } else expect(actual).toEqual({time:600,open:prices[0],high:raw.high,low:raw.low,close:price});
      });
      const lastPoint = {...update.mock.calls.at(-1)![0]};
      vi.advanceTimersByTime(2000);
      expect(update).toHaveBeenCalledTimes(prices.length);
      expect(update.mock.calls.at(-1)![0]).toEqual(lastPoint);
      expect(aggregator.getCurrentCandle()?.close).toBe(prices.at(-1));
      aggregator.destroy(); writer.cleanup();
    });
  });
}
describe('market feed absence', () => {
  it('reports unavailable instead of generating simulated candles when no source is configured', () => {
    vi.useFakeTimers(); const onTick=vi.fn(),onStatusChange=vi.fn(),onError=vi.fn();
    const feed=createMarketDataFeed({subscription:{symbol:'EUR/USD',basePrice:1.1,timeframe:TIMEFRAMES['5s']},callbacks:{onTick,onStatusChange,onError}});
    feed.connect(); expect(onStatusChange).toHaveBeenLastCalledWith('unavailable'); expect(onError).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(60000); expect(onTick).not.toHaveBeenCalled(); feed.disconnect();
  });
});
