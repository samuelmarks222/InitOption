/** Independent Canvas 2D chart. The adapter retains the dashboard's coordinate contract;
 * no runtime code from a third-party chart renderer is used. */
import type { IChartApi, SeriesDefinition, ColorType as LegacyColorType } from 'lightweight-charts';
import { snap, activePriceGeometry, zoomRange, wheelFactor } from './frameMath';
import { PriceCoordinates, TimeCoordinates } from './scales';

type Options = Record<string, any>;
type Datum = { time: number; value?: number; open?: number; high?: number; low?: number; close?: number; color?: string };
type NavigationInput = {kind:"pan";dx:number} | {kind:"time"|"price";factor:number;x:number;y:number};
type ActiveFrame = {time:number;value:number;x:number;y:number;row:Datum};
type Listener = (event: any) => void;
export const ColorType = { Solid: 'solid' as LegacyColorType, VerticalGradient: 'gradient' as LegacyColorType } as const;
export const CrosshairMode = { Normal: 0, Magnet: 1, Hidden: 2 } as const;
export const LineStyle = { Solid: 0, Dotted: 1, Dashed: 2, LargeDashed: 3, SparseDotted: 4 } as const;
export const CandlestickSeries = { type: 'Candlestick' } as unknown as SeriesDefinition<'Candlestick'>;
export const AreaSeries = { type: 'Area' } as unknown as SeriesDefinition<'Area'>;
export const LineSeries = { type: 'Line' } as unknown as SeriesDefinition<'Line'>;
export const BarSeries = { type: 'Bar' } as unknown as SeriesDefinition<'Bar'>;
export const HistogramSeries = { type: 'Histogram' } as unknown as SeriesDefinition<'Histogram'>;
export const BaselineSeries = { type: 'Baseline' } as unknown as SeriesDefinition<'Baseline'>;

function merge(target: Options, patch: Options) {
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) target[key] = merge({ ...(target[key] || {}) }, value);
    else target[key] = value;
  }
  return target;
}
class NativeSeries {
  rows: Datum[] = [];
  config: Options;
  private presented: Datum | null = null;
  private transition: { from: Datum; to: Datum; start: number } | null = null;
  get animating() { return this.transition !== null; }
  private motionEnabled() {
    return (this.kind === 'Candlestick' || this.kind === 'Bar') &&
      this.chart.config.candleAnimation !== false && this.config.candleAnimation !== false &&
      !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }
  /** Presentation only: series rows, trading quotes and indicator inputs stay exact. */
  displayRow(now = performance.now()): Datum | undefined {
    const latest = this.rows[this.rows.length - 1];
    const transition = this.transition;
    if (!latest) return undefined;
    if (!transition || !this.motionEnabled()) {
      this.transition = null;
      this.presented = latest;
      return latest;
    }
    const progress = Math.max(0, Math.min(1, (now - transition.start) / 90));
    if (progress === 1) {
      this.transition = null;
      this.presented = latest;
      return latest;
    }
    // Bounded linear travel follows the newest tick without spring overshoot.
    const row = { ...transition.to };
    for (const key of ['open', 'high', 'low', 'close', 'value'] as const) {
      const from = transition.from[key], to = transition.to[key];
      if (Number.isFinite(from) && Number.isFinite(to)) row[key] = from! + (to! - from!) * progress;
    }
    this.presented = row;
    return row;
  }
  lines = new Set<{ options: () => Options; applyOptions: (o: Options) => void }>();
  constructor(readonly chart: NativeChart, readonly kind: string, options: Options) { this.config = merge({}, options); }
  setData(rows: Datum[]) {
    const unique = new Map<number, Datum>();
    for (const row of rows) if (Number.isFinite(Number(row.time))) unique.set(Number(row.time), { ...row, time: Number(row.time) });
    this.rows = [...unique.values()].sort((a, b) => a.time - b.time);
    this.presented = null; this.transition = null;
    this.chart.refreshTimes();
  }
  update(row: Datum) {
    if (!Number.isFinite(Number(row.time))) return;
    const time = Number(row.time);
    let left = 0, right = this.rows.length;
    while (left < right) { const mid = (left + right) >>> 1; if (this.rows[mid].time < time) left = mid + 1; else right = mid; }
    if (this.rows[left]?.time === time) {
      if (left === this.rows.length - 1 && this.presented && this.motionEnabled()) {
        const now = performance.now();
        const from = this.displayRow(now)!;
        const changed = (['open', 'high', 'low', 'close', 'value'] as const).some(key => this.rows[left][key] !== row[key]);
        if (changed) this.transition = { from, to: { ...row, time }, start: now };
      }
      this.rows[left] = { ...row, time }; this.chart.invalidate();
    }
    else {
      if (left === this.rows.length) { this.presented = null; this.transition = null; }
      this.rows.splice(left, 0, { ...row, time }); this.chart.refreshTimes();
    }
  }
  applyOptions(options: Options) { merge(this.config, options); this.chart.invalidate(); }
  options() { return this.config; }
  priceToCoordinate(price: number) { return this.chart.price.priceToCoordinate(price); }
  coordinateToPrice(y: number) { return this.chart.price.coordinateToPrice(y); }
  priceScale() { return this.chart.priceScale(); }
  priceFormatter() { return { format: (p: number) => this.chart.format(p, this) }; }
  data() { return this.rows.slice(); }
  dataByIndex(index: number) { return this.rows[index] || null; }
  createPriceLine(options: Options) {
    const config = { ...options };
    const line = { options: () => config, applyOptions: (o: Options) => { merge(config, o); this.chart.invalidate(); } };
    this.lines.add(line); this.chart.invalidate(); return line;
  }
  removePriceLine(line: any) { this.lines.delete(line); this.chart.invalidate(); }
}
class NativeChart {
  readonly canvas = document.createElement('canvas');
  readonly time = new TimeCoordinates();
  readonly price = new PriceCoordinates();
  readonly series: NativeSeries[] = [];
  readonly config: Options;
  private frame = 0;
  private disposed = false;
  private isTicking = false;
  private rendering = false;
  private renderAgain = false;
  private pendingInputs: NavigationInput[] = [];
  private pendingCross = false;
  private initialized = false;
  private rangeListeners = new Set<Listener>();
  private timeListeners = new Set<Listener>();
  private sizeListeners = new Set<(width: number, height: number) => void>();
  private clickListeners = new Set<Listener>();
  private crossListeners = new Set<Listener>();
  private cleanup: (() => void)[] = [];
  private pointer: { x: number; y: number } | null = null;
  private drag: { x: number; y: number; from: number; to: number; offset: number; axis: boolean } | null = null;
  private touches = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;
  constructor(readonly host: HTMLElement, options: Options) {
    this.config = merge({ layout: { background: { color: '#101827' }, textColor: '#94a3b8', fontSize: 11 }, grid: {}, timeScale: { barSpacing: 6, rightOffset: 6, shiftVisibleRangeOnNewBar: false }, rightPriceScale: {} }, options);
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
    this.canvas.setAttribute('role', 'img'); this.canvas.setAttribute('aria-label', 'Interactive market price chart');
    host.appendChild(this.canvas);
    this.listen('dblclick', ((e: MouseEvent) => {
      this.pendingInputs=[];this.pendingCross=false;
      if (this.point(e).x > this.time.width) this.priceScale().applyOptions({autoScale:true});
      else this.timeScale().fitContent();
    }) as EventListener);
    this.listen('wheel', this.wheel as EventListener, { passive: false });
    this.listen('pointerdown', this.down as EventListener);
    this.listen('pointermove', this.move as EventListener);
    this.listen('pointerup', this.up as EventListener);
    this.listen('pointercancel', this.up as EventListener);
    this.listen('pointerleave', (() => { if (!this.drag) { this.pointer = null; this.invalidate(); } }) as EventListener);
    this.listen('click', ((e: MouseEvent) => { const point = this.point(e); this.clickListeners.forEach(fn => fn(this.event(point))); }) as EventListener);
    const observer = new ResizeObserver(() => this.resize()); observer.observe(host);
    this.cleanup.push(() => observer.disconnect()); this.resize();
  }
  private listen(name: string, fn: EventListener, opts?: AddEventListenerOptions) {
    this.canvas.addEventListener(name, fn, opts); this.cleanup.push(() => this.canvas.removeEventListener(name, fn, opts));
  }
  private point(e: MouseEvent) { const r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  private event(point: { x: number; y: number }) {
    const logical = this.time.coordinateToLogical(point.x);
    const time = this.time.logicalToTime(logical);
    const candleTime=this.time.times[Math.round(logical)];
    const seriesData=new Map(this.series.map(series=>{
      let low=0,high=series.rows.length;
      while(low<high){const mid=(low+high)>>>1;if(series.rows[mid].time<candleTime)low=mid+1;else high=mid;}
      return [series,series.rows[low]?.time===candleTime?series.rows[low]:undefined] as const;
    }));
    return {point,logical,time,seriesData};
  };
  private down = (e: PointerEvent) => {
    const p = this.point(e); this.touches.set(e.pointerId, p);
    this.canvas.setPointerCapture(e.pointerId);
    if (this.touches.size === 2) { this.drag = null; const [a,b] = [...this.touches.values()]; this.pinchDistance = Math.hypot(a.x-b.x,a.y-b.y); return; }
    if (p.x > this.time.width) {
      if (this.config.handleScale === false || this.config.handleScale?.axisPressedMouseMove === false) return;
    } else if (this.config.handleScroll === false || this.config.handleScroll?.pressedMouseMove === false) return;
    this.drag = { ...p, from: this.time.from, to: this.time.to, offset: this.price.offset, axis: p.x > this.time.width };
  };
  private move = (e: PointerEvent) => {
    const p = this.point(e); this.pointer = p;
    if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, p);
    if (this.touches.size === 2) {
      const [a,b] = [...this.touches.values()]; const distance = Math.hypot(a.x-b.x,a.y-b.y);
      if (this.config.handleScale !== false && this.config.handleScale?.pinch !== false && this.pinchDistance > 0 && distance > 0)
        this.zoom(this.pinchDistance / distance, (a.x+b.x)/2, (a.y+b.y)/2);
      this.pinchDistance = distance; return;
    }
    if (this.drag) {
      if (this.drag.axis) {
        this.zoomPrice(Math.exp((p.y - this.drag.y) * .01), this.price.height / 2);
        this.drag.y = p.y;
      }
      else {
        this.enqueue({kind:"pan",dx:p.x-this.drag.x});
        this.drag.x=p.x;
      }
    }
    this.pendingCross=true;this.invalidate();
  };
  private up = (e: PointerEvent) => { this.touches.delete(e.pointerId); this.drag = null; this.pinchDistance = 0; };
  private enqueue(input: NavigationInput) {
    const last=this.pendingInputs[this.pendingInputs.length-1];
    if(input.kind==="pan" && last?.kind==="pan")last.dx+=input.dx;
    else this.pendingInputs.push(input);
    this.invalidate();
  }
  private flushInputs() {
    let range={from:this.time.from,to:this.time.to};
    const inputs=this.pendingInputs.splice(0);
    for(const input of inputs){
      if(input.kind==="pan"){
        const delta=input.dx*(range.to-range.from)/this.time.width;
        range={from:range.from-delta,to:range.to-delta};
      } else if(input.kind==="time")range=zoomRange(range,this.time.width,input.factor,input.x);
      else {this.price.zoomAt(input.factor,input.y);this.config.rightPriceScale.autoScale=false;}
    }
    if(inputs.length)this.setRange(range);
    const cross=this.pendingCross;this.pendingCross=false;
    if(cross && this.pointer){
      const event=this.event(this.pointer);
      this.crossListeners.forEach(fn=>fn(event));
    }
  }
  zoomPrice(factor: number, y = this.price.height / 2) {
    if(Number.isFinite(factor)&&factor>0&&Number.isFinite(y))this.enqueue({kind:"price",factor,x:0,y});
  }
  zoom(factor: number, x?: number, _y?: number) {
    if (!Number.isFinite(factor) || factor <= 0) return;
    const last = this.time.timeToLogical(this.series[0]?.rows.at(-1)?.time ?? NaN);
    x ??= last !== null && this.time.to >= last && this.time.from <= last
      ? this.time.logicalToCoordinate(last) : this.time.width / 2;
    if(Number.isFinite(x))this.enqueue({kind:"time",factor,x,y:0});
  }
  private wheel = (e: WheelEvent) => {
    e.preventDefault(); if(!Number.isFinite(e.deltaY)||e.deltaY===0&&e.deltaX===0)return; const p = this.point(e);
    const enabled = this.config.handleScale !== false && this.config.handleScale?.mouseWheel !== false;
    if (e.ctrlKey || p.x > this.time.width) {
      if (enabled && e.deltaY!==0) this.zoomPrice(wheelFactor(e.deltaY), p.y);
      return;
    }
    if (enabled && Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) this.zoom(wheelFactor(e.deltaY), p.x);
    else if (this.config.handleScroll !== false) { this.enqueue({kind:"pan",dx:-(e.deltaX || e.deltaY)}); }
  };
  container() { return this.host; }
  chartElement() { return this.host; }
  options() { return this.config; }
  addSeries(definition: { type: string }, options: Options = {}) { const s = new NativeSeries(this, definition.type, options); this.series.push(s); this.invalidate(); return s; }
  addCustomSeries(_view: unknown, options: Options = {}) { return this.addSeries({ type: 'Candlestick' }, options); }
  removeSeries(series: NativeSeries) { const i = this.series.indexOf(series); if (i >= 0) this.series.splice(i, 1); this.price.refitAuto(); this.refreshTimes(); }
  applyOptions(options: Options) { merge(this.config, options); if (options.rightPriceScale?.autoScale === true) this.price.reset(); this.resize(); }
  resize(width = this.config.width || this.host.clientWidth, height = this.config.height || this.host.clientHeight) {
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * ratio)), pixelHeight = Math.max(1, Math.round(height * ratio));
    const plotWidth = Math.max(1, width - (this.config.rightPriceScale?.visible === false ? 0 : 80));
    const plotHeight = Math.max(1, height - (this.config.timeScale?.visible === false ? 0 : 26));
    const changed = this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight || this.time.width !== plotWidth || this.price.height !== plotHeight;
    // Assigning even an unchanged canvas dimension clears its bitmap/context.
    // Option/margin updates must not blank the chart between animation frames.
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
    this.time.width = plotWidth; this.price.height = plotHeight;
    if (changed) this.sizeListeners.forEach(fn => fn(width, height));
    this.invalidate();
  }
  priceScale() { return { applyOptions: (o: Options) => { merge(this.config.rightPriceScale, o); if (o.autoScale) this.price.reset(); this.invalidate(); }, options: () => this.config.rightPriceScale, width: () => 80 }; }
  refreshTimes() {
    const oldLength = this.time.times.length;
    const following = this.time.to >= oldLength - 1;
    this.time.times = [...new Set(this.series.flatMap(s => s.rows.map(r => r.time)))].sort((a,b) => a-b);
    if (!this.initialized && this.time.times.length) { this.initialized = true; const count = this.time.width / (this.config.timeScale.barSpacing || 6); this.time.to = this.time.times.length + (this.config.timeScale.rightOffset || 6); this.time.from = this.time.to-count; }
    else if (following && this.config.timeScale.shiftVisibleRangeOnNewBar !== false && this.time.times.length > oldLength) { const delta = this.time.times.length-oldLength; this.time.from += delta; this.time.to += delta; }
    this.setRange({from:this.time.from,to:this.time.to});
    this.invalidate();
  }
  private setRange(range: { from: number; to: number }) {
    if (!Number.isFinite(range.from) || !Number.isFinite(range.to) || range.to <= range.from) return;
    const width = range.to - range.from;
    const rows = this.series[0]?.rows;
    if (rows?.length) {
      const first = this.time.timeToLogical(rows[0].time)!, last = this.time.timeToLogical(rows[rows.length-1].time)!;
      if (range.to < first) range = {from:first-width*.9,to:first+width*.1};
      else if (range.from > last) range = {from:last-width*.1,to:last+width*.9};
    }
    if (Math.abs(this.time.from-range.from) < 1e-7 && Math.abs(this.time.to-range.to) < 1e-7) return;
    const span = this.time.to - this.time.from;
    if (Math.abs((range.to-range.from)-span)<1e-7 && Math.abs(range.from-this.time.from)>span*.25) this.price.refitAuto();
    this.time.from = range.from; this.time.to = range.to;
    this.rangeListeners.forEach(fn => fn({ ...range }));
    this.timeListeners.forEach(fn => fn({ from: this.time.logicalToTime(range.from), to: this.time.logicalToTime(range.to) })); this.invalidate();
  }
  timeScale() {
    return {
      options: () => ({ ...this.config.timeScale, barSpacing: this.time.spacing }),
      applyOptions: (o: Options) => { merge(this.config.timeScale, o); this.invalidate(); },
      width: () => this.time.width, height: () => 26,
      getVisibleLogicalRange: () => ({ from: this.time.from, to: this.time.to }),
      setVisibleLogicalRange: (range: { from: number; to: number }) => this.setRange(range),
      getVisibleRange: () => ({ from: this.time.logicalToTime(this.time.from), to: this.time.logicalToTime(this.time.to) }),
      setVisibleRange: (range: { from: number; to: number }) => { const from = this.time.timeToLogical(Number(range.from)), to = this.time.timeToLogical(Number(range.to)); if (from !== null && to !== null) this.setRange({ from, to }); },
      logicalToCoordinate: (index: number) => this.time.logicalToCoordinate(index),
      coordinateToLogical: (x: number) => this.time.coordinateToLogical(x),
      timeToCoordinate: (time: number) => { const index = this.time.timeToLogical(Number(time)); return index === null ? null : this.time.logicalToCoordinate(index); },
      coordinateToTime: (x: number) => this.time.logicalToTime(this.time.coordinateToLogical(x)),
      subscribeVisibleLogicalRangeChange: (fn: Listener) => this.rangeListeners.add(fn),
      unsubscribeVisibleLogicalRangeChange: (fn: Listener) => this.rangeListeners.delete(fn),
      subscribeVisibleTimeRangeChange: (fn: Listener) => this.timeListeners.add(fn),
      unsubscribeVisibleTimeRangeChange: (fn: Listener) => this.timeListeners.delete(fn),
      subscribeSizeChange: (fn: (width: number, height: number) => void) => this.sizeListeners.add(fn),
      unsubscribeSizeChange: (fn: (width: number, height: number) => void) => this.sizeListeners.delete(fn),
      fitContent: () => { this.price.reset(); this.config.rightPriceScale.autoScale = true; this.setRange({ from: 0, to: Math.max(8, this.time.times.length + 6) }); this.invalidate(); },
      scrollPosition: () => this.time.to - this.time.times.length,
      scrollToPosition: (offset: number) => { const count = this.time.to-this.time.from; this.setRange({ from: this.time.times.length+offset-count, to: this.time.times.length+offset }); },
      scrollToRealTime: () => { const count = this.time.to-this.time.from; this.setRange({ from: this.time.times.length+6-count, to: this.time.times.length+6 }); },
    };
  }
  subscribeClick(fn: Listener) { this.clickListeners.add(fn); }
  unsubscribeClick(fn: Listener) { this.clickListeners.delete(fn); }
  subscribeCrosshairMove(fn: Listener) { this.crossListeners.add(fn); }
  unsubscribeCrosshairMove(fn: Listener) { this.crossListeners.delete(fn); }
  remove() { this.disposed = true; cancelAnimationFrame(this.frame); this.pendingInputs=[];this.pendingCross=false;this.isTicking=false; this.cleanup.forEach(fn => fn()); this.canvas.remove(); this.rangeListeners.clear(); this.timeListeners.clear(); this.sizeListeners.clear(); this.clickListeners.clear(); this.crossListeners.clear(); }
  invalidate() {
    if(this.disposed)return;
    if(this.isTicking){if(this.rendering)this.renderAgain=true;return;}
    this.isTicking=true;
    this.frame=requestAnimationFrame(()=>{
      try{this.flushInputs();if(!this.disposed){this.rendering=true;this.render();}}
      finally{
        this.rendering=false;this.isTicking=false;this.frame=0;
        if(this.pendingInputs.length||this.pendingCross||this.renderAgain){this.renderAgain=false;this.invalidate();}
      }
    });
  }
  format(price: number, series = this.series[0]) { const format = series?.config.priceFormat; return format?.formatter ? format.formatter(price) : price.toFixed(format?.precision ?? 5); }
  private render() {
    const ctx = this.canvas.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1, width = this.canvas.width/dpr, height = this.canvas.height/dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,width,height);
    const background = this.config.layout.background;
    if (background?.color && background.color !== 'transparent') { ctx.fillStyle = background.color; ctx.fillRect(0,0,width,height); }
    const visible = this.series.filter(s => s.config.visible !== false);
    let min = Infinity, max = -Infinity;
    for (const s of visible) for (const r of this.visibleRows(s)) {
      const index = this.time.timeToLogical(r.time)!; if (index < this.time.from-1 || index > this.drawRightLogical) continue;
      const low = r.low ?? r.value ?? r.close, high = r.high ?? r.value ?? r.close;
      if (Number.isFinite(low) && Number.isFinite(high)) {
        min = Math.min(min, low!); max = Math.max(max, high!);
        if (s.kind === 'Histogram' || s.kind === 'Baseline') {
          const base = s.config.baseValue?.price ?? s.config.base ?? 0;
          min = Math.min(min, base); max = Math.max(max, base);
        }
      }
    }
    if (min !== Infinity) this.price.fit(min, max, this.config.rightPriceScale.scaleMargins?.top, this.config.rightPriceScale.scaleMargins?.bottom);
    const w = this.time.width, h = this.price.height;
    ctx.font = `${this.config.layout.fontSize || 11}px ${this.config.layout.fontFamily || 'sans-serif'}`;
    ctx.lineWidth = 1;
    const niceStep = (span: number, target: number) => {
      const raw = Math.max(Number.EPSILON, span / Math.max(1,target));
      const power = 10 ** Math.floor(Math.log10(raw)), unit = raw / power;
      return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
    };
    const priceLabels: {value:number;y:number}[] = [];
    const priceStep = niceStep(this.price.max-this.price.min,h/64);
    for(let value=Math.ceil(this.price.min/priceStep)*priceStep,n=0;value<=this.price.max && n<100;value+=priceStep,n++){
      const y=this.price.priceToCoordinate(value);
      if(this.config.grid.horzLines?.visible!==false)this.stroke(ctx,0,y,width,y,this.config.grid.horzLines?.color || '#243044');
      if(this.config.rightPriceScale.visible!==false)priceLabels.push({value,y});
    }
    const from=this.time.logicalToTime(this.time.from),to=this.time.logicalToTime(this.time.to);
    if(from!==null && to!==null){
      const step=niceStep(to-from,w/110);
      for(let value=Math.ceil(from/step)*step,n=0;value<=to && n<100;value+=step,n++){
        const logical=this.time.timeToLogical(value);if(logical===null)continue;
        const x=this.time.logicalToCoordinate(logical);
        if(this.config.grid.vertLines?.visible!==false)this.stroke(ctx,x,0,x,h,this.config.grid.vertLines?.color || '#243044');
        ctx.fillStyle=this.config.layout.textColor;
        if(this.config.timeScale.visible!==false){const label=this.config.timeScale.tickMarkFormatter?.(value) || new Date(value*1000).toISOString().slice(11,19);ctx.fillText(String(label),snap(Math.max(0,x-24)),snap(h+18));}
      }
    }
    const activeFrames=new Map<NativeSeries,ActiveFrame>();
    for(const series of visible){
      const last=series.displayRow(),value=last?.close??last?.value;
      if(!last||!Number.isFinite(value))continue;
      const lastIndex=this.time.timeToLogical(last.time);if(lastIndex===null)continue;
      const candleWidth=this.time.spacing*.72,candleSpacing=this.time.spacing-candleWidth;
      const offsetX=this.time.logicalToCoordinate(0)-candleWidth/2;
      const rawCalculatedY=this.price.priceToCoordinate(value!);
      const geometry=activePriceGeometry(rawCalculatedY,offsetX,lastIndex,candleWidth,candleSpacing);
      activeFrames.set(series,{time:last.time,value:value!,row:last,...geometry});
      if(series.animating && geometry.x>=0 && geometry.x<=width)this.renderAgain=true;
    }
    // Price ticks overlay the chart transparently: do not discard candles in
    // the reserved scale gutter when a historical range is panned underneath it.
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,snap(width),snap(h)); ctx.clip();
    for (const s of visible) this.drawSeries(ctx,s,activeFrames.get(s));
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,snap(w),snap(h)); ctx.clip();
    for (const s of visible) {
      for (const line of s.lines) { const o = line.options(); if (o.lineVisible === false) continue; this.stroke(ctx,0,this.price.priceToCoordinate(o.price),w,this.price.priceToCoordinate(o.price),o.color || '#94a3b8',o.lineWidth || 1,o.lineStyle); }
      const active=activeFrames.get(s);
      if(active && active.x>=0 && active.x<=snap(w) && s.config.priceLineVisible!==false)
        this.stroke(ctx,active.x,active.y,w,active.y,s.config.priceLineColor || s.config.lineColor || '#6b8afd',1,2);
    }
    if (this.pointer && this.config.crosshair?.mode !== CrosshairMode.Hidden) {
      this.stroke(ctx,this.pointer.x,0,this.pointer.x,h,'#8190a4',1,2);
      this.stroke(ctx,0,this.pointer.y,w,this.pointer.y,'#8190a4',1,2);
    }
    ctx.restore();
    ctx.fillStyle=this.config.layout.textColor;
    for(const {value,y} of priceLabels)ctx.fillText(this.format(value),snap(w+7),snap(y+4));
    for (const s of visible) {
      const active=activeFrames.get(s),last=active?.row??s.rows[s.rows.length-1];
      if(active && s.config.lastValueVisible!==false)this.label(ctx,this.format(active.value,s),active.y,s.config.lineColor || (last.close!>=last.open!?s.config.upColor:s.config.downColor) || '#5677e8');
      for (const line of s.lines) { const o = line.options(); if (o.axisLabelVisible !== false) this.label(ctx,this.format(o.price,s),this.price.priceToCoordinate(o.price),o.color || '#5677e8'); }
    }
    if (this.pointer && this.pointer.y < h) this.label(ctx,this.format(this.price.coordinateToPrice(this.pointer.y)),this.pointer.y,'#46536a');
  }
  private label(ctx: CanvasRenderingContext2D,text: string,y: number,color: string) { if (y < 0 || y > this.price.height || this.config.rightPriceScale.visible === false) return; ctx.fillStyle=color; ctx.fillRect(snap(this.time.width),snap(y)-10,80,20); ctx.fillStyle='#fff'; ctx.fillText(text,snap(this.time.width)+5,snap(y)+4); }
  private stroke(ctx: CanvasRenderingContext2D,x1: number,y1: number,x2: number,y2: number,color: string,width=1,style=0) { ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.setLineDash(style === 1 ? [1,3] : style ? [5,4] : []); ctx.moveTo(snap(x1),snap(y1)); ctx.lineTo(snap(x2),snap(y2)); ctx.stroke(); ctx.setLineDash([]); }
  /** Preserve the public plot/axis mapping while painting through the transparent gutter. */
  private get drawRightLogical() {
    const gutter = this.config.rightPriceScale.visible === false ? 0 : 80;
    return this.time.to + gutter / this.time.spacing + 1;
  }
  /** Binary-search the full painted window; never scan all retained history. */
  private visibleRows(series: NativeSeries): Datum[] {
    const from = this.time.logicalToTime(this.time.from - 1);
    const to = this.time.logicalToTime(this.drawRightLogical);
    if (from === null || to === null) return [];
    const lower = (time: number) => {
      let left = 0, right = series.rows.length;
      while (left < right) { const mid = (left + right) >>> 1; if (series.rows[mid].time < time) left = mid + 1; else right = mid; }
      return left;
    };
    return series.rows.slice(lower(from), lower(to + Number.EPSILON * Math.max(1, Math.abs(to))));
  }
  private drawSeries(ctx: CanvasRenderingContext2D,s: NativeSeries,active?:ActiveFrame) {
    const o = s.config, points: { x: number; y: number; row: Datum }[] = [];
    const body = Math.max(1, this.time.spacing*.72), half = body/2;
    for (const storedRow of this.visibleRows(s)) {
      const row = active?.time === storedRow.time ? active.row : storedRow;
      const index = this.time.timeToLogical(row.time)!;
      if (index < this.time.from-1 || index > this.drawRightLogical) continue;
      const x = active?.time===row.time?active.x:this.time.logicalToCoordinate(index), value = row.value ?? row.close;
      if (!Number.isFinite(value)) continue;
      const y = active?.time===row.time?active.y:this.price.priceToCoordinate(value!);
      if (s.kind === 'Candlestick' || s.kind === 'Bar') {
        if (![row.open,row.high,row.low,row.close].every(Number.isFinite)) continue;
        const up = row.close! >= row.open!, color = up ? o.upColor || '#22c58b' : o.downColor || '#ef5350';
        const open = this.price.priceToCoordinate(row.open!), high = this.price.priceToCoordinate(row.high!), low = this.price.priceToCoordinate(row.low!);
        if (s.kind === 'Bar') { this.stroke(ctx,x,high,x,low,color); if (o.openVisible !== false) this.stroke(ctx,x-half,open,x,open,color); this.stroke(ctx,x,y,x+half,y,color); }
        else {
          if (o.wickVisible !== false) this.stroke(ctx,x,high,x,low,up ? o.wickUpColor || color : o.wickDownColor || color);
          ctx.fillStyle=color; ctx.fillRect(snap(x-half),snap(Math.min(open,y)),Math.max(1,snap(x+half)-snap(x-half)),Math.max(1,Math.abs(snap(open)-snap(y))));
          if (o.borderVisible) { ctx.strokeStyle=up ? o.borderUpColor || color : o.borderDownColor || color; ctx.lineWidth=1; ctx.strokeRect(snap(x-half),snap(Math.min(open,y)),Math.max(1,snap(x+half)-snap(x-half)),Math.max(1,Math.abs(snap(open)-snap(y)))); }
        }
      } else if (s.kind === 'Histogram') { const base=this.price.priceToCoordinate(o.base ?? 0); ctx.fillStyle=row.color || o.color || '#6789ee'; ctx.fillRect(snap(x-half),snap(Math.min(base,y)),Math.max(1,snap(x+half)-snap(x-half)),Math.max(1,Math.abs(snap(base)-snap(y)))); }
      else points.push({x,y,row});
    }
    if (!points.length) return;
    if (s.kind === 'Area' || s.kind === 'Baseline') {
      ctx.beginPath(); points.forEach((p,i) => i ? ctx.lineTo(snap(p.x),snap(p.y)) : ctx.moveTo(snap(p.x),snap(p.y)));
      const baseY = s.kind === 'Baseline' ? this.price.priceToCoordinate(o.baseValue?.price ?? 0) : this.price.height;
      ctx.lineTo(snap(points[points.length-1].x),snap(baseY)); ctx.lineTo(snap(points[0].x),snap(baseY)); ctx.closePath();
      const gradient=ctx.createLinearGradient(0,0,0,this.price.height); gradient.addColorStop(0,o.topColor || o.topFillColor1 || 'rgba(70,120,230,.35)'); gradient.addColorStop(1,o.bottomColor || o.bottomFillColor2 || 'rgba(70,120,230,0)'); ctx.fillStyle=gradient; ctx.fill();
    }
    if (o.lineVisible !== false) { ctx.beginPath(); points.forEach((p,i) => i ? ctx.lineTo(snap(p.x),snap(p.y)) : ctx.moveTo(snap(p.x),snap(p.y))); ctx.strokeStyle=o.lineColor || o.color || o.topLineColor || '#6789ee'; ctx.lineWidth=o.lineWidth || 2; ctx.setLineDash(o.lineStyle ? [4,4] : []); ctx.stroke(); ctx.setLineDash([]); }
  }
}
/** Narrow compatibility boundary: consumers retain their existing type-only contract. */
export function createChart(host: HTMLElement, options: Options = {}): IChartApi {
  return new NativeChart(host, options) as unknown as IChartApi;
}

/** Explicit UTC interval for extrapolating sparse axes (one bar has no inferred step). */
export function setChartInterval(chart: IChartApi, seconds: number): void {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Invalid chart interval');
  const native = chart as unknown as NativeChart;
  if (native.time.intervalSeconds !== seconds) native.price.reset();
  native.time.intervalSeconds = seconds;
  // Presentation floor only, not generated volatility or OHLC: sparse long
  // intervals should not magnify every tick like a freshly opened 5s candle.
  native.price.minimumRelativeSpan = .0001 * Math.sqrt(seconds / 5);
  native.invalidate();
}

/** Horizontal viewport zoom used by dashboard buttons, wheel and pinch. */
export function zoomChart(chart: IChartApi, factor: number): void {
  (chart as unknown as NativeChart).zoom(factor);
}

export function zoomPriceScale(chart: IChartApi, factor: number, y?: number): void {
  (chart as unknown as NativeChart).zoomPrice(factor, y);
}
