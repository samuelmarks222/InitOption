import { ColorType, CrosshairMode, createChart, type IChartApi, type PriceFormatBuiltIn } from 'lightweight-charts';
import { LightweightSeriesController, type ChartKind } from './lightweightSeries';

/** Lifecycle and native navigation for an embedded Lightweight Charts v5 chart.
 * Market subscriptions, pagination, drawing overlays and indicators remain the
 * caller's responsibility and must be cleaned up before destroying this chart. */
export class LightweightChart {
  readonly chart: IChartApi;
  readonly series: LightweightSeriesController;
  private destroyed = false;

  constructor(container: HTMLElement, seconds: number, format: PriceFormatBuiltIn, kind: ChartKind = 'candles') {
    this.chart = createChart(container, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: '#1c1f2b' }, textColor: '#aab4c7', attributionLogo: true },
      grid: { vertLines: { color: 'rgba(255,255,255,0.035)' }, horzLines: { color: 'rgba(255,255,255,0.035)' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#374151' },
      timeScale: { borderColor: '#374151', timeVisible: true, secondsVisible: seconds < 60 },
      handleScale: true, handleScroll: true,
    });
    try { this.series = new LightweightSeriesController(this.chart, seconds, format, kind); }
    catch (error) { this.chart.remove(); throw error; }
  }
  zoom(direction: 'in' | 'out') {
    if (this.destroyed) return;
    const scale = this.chart.timeScale(), range = scale.getVisibleLogicalRange();
    if (!range) return;
    const midpoint = (range.from + range.to) / 2;
    const span = Math.max(5, Math.min(10000, (range.to - range.from) * (direction === 'in' ? 0.8 : 1.25)));
    scale.setVisibleLogicalRange({ from: midpoint - span / 2, to: midpoint + span / 2 });
  }
  autoFitPrice() { if (!this.destroyed) this.chart.priceScale('right').applyOptions({ autoScale: true }); }
  latest() { if (!this.destroyed) this.chart.timeScale().scrollToRealTime(); }
  reset() { if (!this.destroyed) { this.autoFitPrice(); this.chart.timeScale().fitContent(); } }
  destroy() { if (!this.destroyed) { this.destroyed = true; this.series.dispose(); this.chart.remove(); } }
}
