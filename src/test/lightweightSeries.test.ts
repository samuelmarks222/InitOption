import { describe, expect, it, vi } from 'vitest';
import { AreaSeries, BarSeries, CandlestickSeries, type IChartApi } from 'lightweight-charts';
import { LightweightSeriesController } from '@/components/trading/chart-core/lightweightSeries';
import type { Candle } from '@/components/trading/chart-core/candles';

const format = {type: 'price' as const, precision: 5, minMove: 0.00001};
const history: Candle[] = [
  { time: 5, open: 10, high: 14, low: 8, close: 12 },
  { time: 10, open: 12, high: 13, low: 7, close: 8 },
];
function mockChart() {
  const scale = { getVisibleLogicalRange: vi.fn(() => ({from: 0.2, to: 1.7})), setVisibleLogicalRange: vi.fn() };
  const created: Array<{definition: unknown; setData: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; createPriceLine: ReturnType<typeof vi.fn>; removePriceLine: ReturnType<typeof vi.fn>; line: {applyOptions: ReturnType<typeof vi.fn>} }> = [];
  const chart = {
    addSeries: vi.fn((definition: unknown) => {
      const line = {applyOptions: vi.fn()};
      const series = {definition, setData: vi.fn(), update: vi.fn(), createPriceLine: vi.fn(() => line), removePriceLine: vi.fn(), line};
      created.push(series); return series;
    }),
    removeSeries: vi.fn(), timeScale: () => scale,
  };
  return {chart: chart as unknown as IChartApi, mock: chart, created, scale};
}

describe('Lightweight Charts v5 price series controller', () => {
  it('switches all four official series on one chart, retains viewport and original OHLC', () => {
    const {chart, mock, created, scale} = mockChart();
    const controller = new LightweightSeriesController(chart, 5, format);
    controller.setData(history);
    expect(created[0].definition).toBe(CandlestickSeries);
    expect(created[0].setData).toHaveBeenCalledWith(history);
    controller.setKind('bars');
    controller.setKind('heikinAshi');
    controller.setKind('area');
    expect(created.map(s => s.definition)).toEqual([CandlestickSeries, BarSeries, CandlestickSeries, AreaSeries]);
    expect(created[1].setData).toHaveBeenCalledWith(history);
    expect(created[2].setData).toHaveBeenCalledWith([
      {time:5,open:11,high:14,low:8,close:11},
      {time:10,open:11,high:13,low:7,close:10},
    ]);
    expect(created[3].setData).toHaveBeenCalledWith([{time:5,value:12},{time:10,value:8}]);
    expect(scale.setVisibleLogicalRange).toHaveBeenCalledTimes(3);
    expect(scale.setVisibleLogicalRange).toHaveBeenLastCalledWith({from:0.2,to:1.7});
    expect(controller.getOriginalData()).toEqual(history);
    expect(created[2].createPriceLine).toHaveBeenCalledWith(expect.objectContaining({price:8}));
    expect(mock.removeSeries).toHaveBeenCalledTimes(3);
    controller.dispose(); controller.dispose();
    expect(mock.removeSeries).toHaveBeenCalledTimes(4);
    expect(() => controller.update(history[1])).toThrow();
  });
  it('updates a forming Heikin Ashi bar and opens the next without resetting the series', () => {
    const {chart, created} = mockChart();
    const controller = new LightweightSeriesController(chart, 5, format, 'heikinAshi');
    controller.setData(history);
    controller.update({time:10,open:12,high:15,low:6,close:14});
    expect(created[0].update).toHaveBeenLastCalledWith({time:10,open:11,high:15,low:6,close:11.75});
    controller.update({time:15,open:16,high:16,low:16,close:16});
    expect(created[0].update).toHaveBeenLastCalledWith({time:15,open:11.375,high:16,low:11.375,close:16});
    expect(created[0].setData).toHaveBeenCalledTimes(1);
    expect(created[0].line.applyOptions).toHaveBeenLastCalledWith({price:16});
    expect(controller.getOriginalData()[1]).toEqual({time:10,open:12,high:15,low:6,close:14});
  });
  it('inserts a whitespace gap, never an invented price, across chart types', () => {
    const {chart, created} = mockChart();
    const controller = new LightweightSeriesController(chart, 5, format, 'area');
    controller.setData([history[0]]);
    controller.update({time:20,open:20,high:20,low:20,close:20});
    expect(created[0].update.mock.calls).toEqual([[{time:10}],[{time:20,value:20}]]);
    controller.setKind('bars');
    expect(created[1].setData).toHaveBeenCalledWith([history[0], {time:10}, {time:20,open:20,high:20,low:20,close:20}]);
  });
  it('retains the visible candles when older pages prepend to the time scale', () => {
    const {chart, scale} = mockChart();
    const controller = new LightweightSeriesController(chart, 5, format);
    controller.setData([history[1]]);
    controller.setData(history, true);
    expect(scale.setVisibleLogicalRange).toHaveBeenLastCalledWith({from:1.2,to:2.7});
  });
  it('rejects invalid data and corrections rather than silently corrupting history', () => {
    const {chart, created} = mockChart();
    const controller = new LightweightSeriesController(chart, 5, format); controller.setData(history);
    expect(() => controller.setData([history[1], history[0]])).toThrow();
    expect(() => controller.update({...history[0], close:11})).toThrow();
    expect(() => controller.update({...history[1], high:12})).toThrow();
    expect(controller.getOriginalData()).toEqual(history);
    expect(created[0].setData).toHaveBeenCalledTimes(1);
  });
});
