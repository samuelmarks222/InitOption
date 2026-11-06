import {
  AreaSeries, BarSeries, CandlestickSeries, LineStyle,
  type IChartApi, type IPriceLine, type ISeriesApi, type UTCTimestamp, type PriceFormatBuiltIn,
} from 'lightweight-charts';
import { heikinAshi, type Candle } from './candles';

export type ChartKind = 'candles' | 'bars' | 'heikinAshi' | 'area';
type PriceSeries = ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'> | ISeriesApi<'Area'>;
type PlotPoint = { time: UTCTimestamp } | { time: UTCTimestamp; open: number; high: number; low: number; close: number } | { time: UTCTimestamp; value: number };

function validate(candle: Candle, seconds: number) {
  if (!Number.isSafeInteger(candle.time) || candle.time < 0 || candle.time % seconds ||
      ![candle.open, candle.high, candle.low, candle.close].every(v => Number.isFinite(v) && v > 0) ||
      candle.high < Math.max(candle.open, candle.close) || candle.low > Math.min(candle.open, candle.close) || candle.low > candle.high ||
      (candle.volume !== undefined && (!Number.isFinite(candle.volume) || candle.volume < 0))) throw new Error('Invalid OHLC candle');
}
function haCandle(bar: Candle, previous?: Candle): Candle {
  const open = previous ? (previous.open + previous.close) / 2 : (bar.open + bar.close) / 2;
  const close = (bar.open + bar.high + bar.low + bar.close) / 4;
  return { ...bar, open, close, high: Math.max(bar.high, open, close), low: Math.min(bar.low, open, close) };
}
function point(kind: ChartKind, candle: Candle): PlotPoint {
  const time = candle.time as UTCTimestamp;
  return kind === 'area' ? { time, value: candle.close } :
    { time, open: candle.open, high: candle.high, low: candle.low, close: candle.close };
}
function points(kind: ChartKind, data: readonly Candle[], seconds: number): PlotPoint[] {
  const out: PlotPoint[] = [];
  data.forEach((bar, index) => {
    if (index && bar.time > data[index - 1].time + seconds) out.push({ time: (data[index - 1].time + seconds) as UTCTimestamp });
    out.push(point(kind, bar));
  });
  return out;
}

/** Owns only the price series, not the chart, transport, drawing tools or trades.
 * setData is for initial history/replacements; update only accepts a changed last
 * bar or a new bar. A whitespace marker makes missing intervals explicit without
 * inventing prices. All four series share those time-scale markers. */
export class LightweightSeriesController {
  private kind: ChartKind;
  private series: PriceSeries;
  private line?: IPriceLine;
  private data: Candle[] = [];
  private transformed: Candle[] = [];
  private disposed = false;

  constructor(private chart: IChartApi, readonly seconds: number, private readonly priceFormat: PriceFormatBuiltIn, kind: ChartKind = 'candles') {
    if (!Number.isSafeInteger(seconds) || seconds <= 0) throw new Error('Invalid candle interval');
    this.kind = kind;
    this.series = this.makeSeries(kind);
  }
  private assertAlive() { if (this.disposed) throw new Error('Series controller disposed'); }
  private makeSeries(kind: ChartKind): PriceSeries {
    const common = { priceLineVisible: false, lastValueVisible: false, priceFormat: this.priceFormat };
    if (kind === 'area') return this.chart.addSeries(AreaSeries, { ...common, lineColor: '#2585f1', topColor: 'rgba(37,133,241,0.32)', bottomColor: 'rgba(37,133,241,0.02)', lineWidth: 2 });
    if (kind === 'bars') return this.chart.addSeries(BarSeries, { ...common, upColor: '#10a055', downColor: '#e85b4e', openVisible: true });
    return this.chart.addSeries(CandlestickSeries, { ...common, upColor: '#10a055', downColor: '#e85b4e', wickUpColor: '#10a055', wickDownColor: '#e85b4e', borderVisible: false });
  }
  // The active series is also the coordinate source for the existing DrawingOverlay.
  getActiveSeries(): PriceSeries { this.assertAlive(); return this.series; }
  getKind(): ChartKind { return this.kind; }
  getOriginalData(): Candle[] { return this.data.map(bar => ({ ...bar })); }
  private setSeriesData(series: PriceSeries, kind: ChartKind, raw: Candle[], transformed: Candle[]) {
    const plot = points(kind, kind === 'heikinAshi' ? transformed : raw, this.seconds);
    // The definition selected above and these data variants are kept in lockstep.
    if (kind === 'area') (series as ISeriesApi<'Area'>).setData(plot as Parameters<ISeriesApi<'Area'>['setData']>[0]);
    else if (kind === 'bars') (series as ISeriesApi<'Bar'>).setData(plot as Parameters<ISeriesApi<'Bar'>['setData']>[0]);
    else (series as ISeriesApi<'Candlestick'>).setData(plot as Parameters<ISeriesApi<'Candlestick'>['setData']>[0]);
  }
  private addPriceLine(series: PriceSeries, price?: number): IPriceLine | undefined {
    return price === undefined ? undefined : series.createPriceLine({ price, color: '#8ba1bb', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '' });
  }
  /** Intentional complete replacement or historical pagination. */
  setData(input: readonly Candle[], preserveViewport = false) {
    this.assertAlive();
    let previous = -1;
    const next = input.map(bar => {
      validate(bar, this.seconds);
      if (bar.time <= previous) throw new Error('Candles must have unique chronological timestamps');
      previous = bar.time;
      return { ...bar };
    });
    const ha = heikinAshi(next);
    const scale = this.chart.timeScale();
    const range = preserveViewport ? scale.getVisibleLogicalRange() : null;
    const oldFirst = this.data[0]?.time;
    const newPoints = points(this.kind, this.kind === 'heikinAshi' ? ha : next, this.seconds);
    const shift = oldFirst === undefined ? 0 : Math.max(0, newPoints.findIndex(p => p.time === oldFirst));
    this.setSeriesData(this.series, this.kind, next, ha);
    if (this.line) { this.series.removePriceLine(this.line); this.line = undefined; }
    this.data = next; this.transformed = ha;
    this.line = this.addPriceLine(this.series, next[next.length - 1]?.close);
    if (range) scale.setVisibleLogicalRange({ from: range.from + shift, to: range.to + shift });
  }
  /** Display-only update. Price is never returned to trading or settlement. */
  update(bar: Candle) {
    this.assertAlive(); validate(bar, this.seconds);
    const last = this.data[this.data.length - 1];
    if (last && (bar.time < last.time || (bar.time === last.time &&
      (bar.open !== last.open || bar.high < last.high || bar.low > last.low)))) throw new Error('Historical correction requires setData');
    const same = last?.time === bar.time;
    const prevHa = same ? this.transformed[this.transformed.length - 2] : this.transformed[this.transformed.length - 1];
    const transformed = haCandle(bar, prevHa);
    const series = this.series;
    const apply = (p: PlotPoint) => {
      if (this.kind === 'area') (series as ISeriesApi<'Area'>).update(p as Parameters<ISeriesApi<'Area'>['update']>[0]);
      else if (this.kind === 'bars') (series as ISeriesApi<'Bar'>).update(p as Parameters<ISeriesApi<'Bar'>['update']>[0]);
      else (series as ISeriesApi<'Candlestick'>).update(p as Parameters<ISeriesApi<'Candlestick'>['update']>[0]);
    };
    if (last && bar.time > last.time + this.seconds) apply({ time: (last.time + this.seconds) as UTCTimestamp });
    apply(point(this.kind, this.kind === 'heikinAshi' ? transformed : bar));
    if (same) { this.data[this.data.length - 1] = { ...bar }; this.transformed[this.transformed.length - 1] = transformed; }
    else { this.data.push({ ...bar }); this.transformed.push(transformed); }
    if (this.line) this.line.applyOptions({ price: bar.close });
    else this.line = this.addPriceLine(series, bar.close);
  }
  setKind(kind: ChartKind) {
    this.assertAlive();
    if (kind === this.kind) return;
    const scale = this.chart.timeScale(), range = scale.getVisibleLogicalRange();
    const next = this.makeSeries(kind);
    let line: IPriceLine | undefined;
    try { this.setSeriesData(next, kind, this.data, this.transformed); line = this.addPriceLine(next, this.data[this.data.length - 1]?.close); }
    catch (error) { this.chart.removeSeries(next); throw error; }
    this.chart.removeSeries(this.series);
    this.series = next; this.line = line; this.kind = kind;
    if (range) scale.setVisibleLogicalRange(range);
  }
  dispose() { if (!this.disposed) { this.disposed = true; this.chart.removeSeries(this.series); } }
}
