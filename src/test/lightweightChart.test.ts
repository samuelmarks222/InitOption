import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => {
  const scale = {getVisibleLogicalRange: vi.fn(() => ({from: 0, to: 100})), setVisibleLogicalRange: vi.fn(), scrollToRealTime: vi.fn(), fitContent: vi.fn()};
  const priceScale = {applyOptions: vi.fn()};
  const series = {setData: vi.fn(), update: vi.fn(), createPriceLine: vi.fn(() => ({applyOptions: vi.fn()})), removePriceLine: vi.fn()};
  const chart = {addSeries: vi.fn(() => series), removeSeries: vi.fn(), timeScale: vi.fn(() => scale), priceScale: vi.fn(() => priceScale), remove: vi.fn()};
  return {scale, priceScale, series, chart, createChart: vi.fn(() => chart)};
});
vi.mock('lightweight-charts', async importOriginal => ({...await importOriginal<typeof import('lightweight-charts')>(), createChart: mocks.createChart}));
import { LightweightChart } from '@/components/trading/chart-core/LightweightChart';

const format = {type: 'price' as const, precision: 5, minMove: 0.00001};
beforeEach(() => vi.clearAllMocks());
describe('Lightweight chart lifecycle and navigation', () => {
  it('configures the official chart and delegates native navigation', () => {
    const chart = new LightweightChart({} as HTMLElement, 5, format);
    expect(mocks.createChart).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      autoSize: true, layout: expect.objectContaining({attributionLogo: true}),
      timeScale: expect.objectContaining({timeVisible: true, secondsVisible: true}),
    }));
    chart.zoom('in');
    expect(mocks.scale.setVisibleLogicalRange).toHaveBeenCalledWith({from:10,to:90});
    chart.zoom('out');
    expect(mocks.scale.setVisibleLogicalRange).toHaveBeenLastCalledWith({from:-12.5,to:112.5});
    chart.latest(); expect(mocks.scale.scrollToRealTime).toHaveBeenCalledOnce();
    chart.reset(); expect(mocks.priceScale.applyOptions).toHaveBeenCalledWith({autoScale:true});
    expect(mocks.scale.fitContent).toHaveBeenCalledOnce();
    chart.destroy(); chart.destroy(); chart.latest();
    expect(mocks.chart.remove).toHaveBeenCalledOnce();
    expect(mocks.chart.removeSeries).toHaveBeenCalledOnce();
    expect(mocks.scale.scrollToRealTime).toHaveBeenCalledOnce();
  });
  it('removes the chart if series initialization fails', () => {
    mocks.chart.addSeries.mockImplementationOnce(() => {throw new Error('series failure')});
    expect(() => new LightweightChart({} as HTMLElement, 5, format)).toThrow('series failure');
    expect(mocks.chart.remove).toHaveBeenCalledOnce();
  });
});
