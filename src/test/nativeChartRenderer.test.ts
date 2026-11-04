// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { liveViewport } from '@/components/trading/engine/native/viewport';
import { createChart, setChartInterval, zoomChart, zoomPriceScale, CandlestickSeries, AreaSeries, BarSeries, LineSeries, HistogramSeries } from '@/components/trading/engine/native/chart';
let context: any;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => setTimeout(fn,16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  context = new Proxy({ createLinearGradient: () => ({ addColorStop: vi.fn() }) }, { get(target, key) { return target[key] ?? (target[key] = vi.fn()); } });
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); document.body.innerHTML=''; });
function host() { const el=document.createElement('div'); document.body.append(el); return el; }
describe('native canvas renderer integration', () => {
  for (const kind of [CandlestickSeries,AreaSeries,BarSeries,LineSeries,HistogramSeries]) {
    it(`renders ${kind.type} and coalesces rapid updates`, () => {
      const chart=createChart(host(),{width:800,height:400});
      const series=chart.addSeries(kind as any) as any;
      series.setData([{time:60,open:100,high:108,low:95,close:102,value:102}]);
      for (let i=0;i<100;i++) series.update({time:60,open:100,high:110,low:95,close:103+i/100,value:103+i/100});
      vi.advanceTimersByTime(20);
      expect(context.clearRect).toHaveBeenCalledTimes(1);
      expect(series.data()).toHaveLength(1);
      expect(context.stroke).toHaveBeenCalled(); chart.remove();
    });
  }
  it('scales backing pixels at DPR 2 and resizes for mobile without mutating OHLC', () => {
    vi.stubGlobal('devicePixelRatio',2);
    const el=host(); const chart=createChart(el,{width:800,height:400});
    const series=chart.addSeries(CandlestickSeries);
    const rows=[{time:60 as any,open:100,high:108,low:95,close:102}]; series.setData(rows);
    vi.advanceTimersByTime(20);
    const canvas=el.querySelector('canvas')!;
    expect(canvas.width).toBe(1600); expect(canvas.height).toBe(800);
    chart.resize(360,640); vi.advanceTimersByTime(20);
    expect(canvas.width).toBe(720); expect(canvas.height).toBe(1280);
    expect(series.data()).toEqual(rows); chart.remove();
  });
  it('renders one high-timeframe candle near the right edge with accurate future axis times', () => {
    const chart=createChart(host(),{width:800,height:400});
    setChartInterval(chart,900);
    const series=chart.addSeries(CandlestickSeries);
    const rows=[{time:1800 as any,open:100,high:108,low:95,close:102}];series.setData(rows);
    const range=liveViewport(800,1,7);chart.timeScale().setVisibleLogicalRange(range);
    vi.advanceTimersByTime(20);
    const x=chart.timeScale().timeToCoordinate(1800 as any)!;
    expect(x/720).toBeGreaterThan(.8);expect(x/720).toBeLessThan(.95);
    const future=chart.timeScale().timeToCoordinate(2700 as any)!;
    expect(chart.timeScale().coordinateToTime(future)).toBeCloseTo(2700);
    expect(series.data()).toEqual(rows);chart.remove();
  });
  it('zooms the horizontal timeline and overlays without changing the price domain', () => {
    const chart=createChart(host(),{width:800,height:400});
    const series=chart.addSeries(CandlestickSeries), indicator=chart.addSeries(LineSeries);
    const rows=[{time:60 as any,open:100,high:108,low:95,close:102},{time:120 as any,open:102,high:109,low:98,close:104}];
    series.setData(rows);indicator.setData([{time:60 as any,value:102},{time:120 as any,value:104}]);
    chart.timeScale().setVisibleLogicalRange({from:-10,to:30});vi.advanceTimersByTime(20);
    const x1=chart.timeScale().timeToCoordinate(60 as any)!,x2=chart.timeScale().timeToCoordinate(120 as any)!;
    const y1=series.priceToCoordinate(100)!,y2=series.priceToCoordinate(104)!;
    const centerPrice=series.coordinateToPrice(187)!;
    zoomChart(chart,.5);vi.advanceTimersByTime(20);
    expect(chart.timeScale().getVisibleLogicalRange()).toEqual({from:-4.5,to:15.5});
    expect(chart.timeScale().timeToCoordinate(120 as any)!-chart.timeScale().timeToCoordinate(60 as any)!).toBeCloseTo(2*(x2-x1));
    expect(series.priceToCoordinate(100)!-series.priceToCoordinate(104)!).toBeCloseTo(y1-y2);
    expect(series.priceToCoordinate(centerPrice)).toBeCloseTo(187);
    expect(indicator.priceToCoordinate(104)).toBe(series.priceToCoordinate(104));
    expect(series.data()).toEqual(rows);
    zoomChart(chart,2);vi.advanceTimersByTime(20);
    expect(series.priceToCoordinate(100)).toBeCloseTo(y1);
    expect(chart.timeScale().getVisibleLogicalRange()).toEqual({from:-10,to:30});chart.remove();
  });
  it('anchors horizontal wheel zoom at the pointer and Ctrl+wheel independently scales price', () => {
    const el=host(), chart=createChart(el,{width:800,height:400});
    const series=chart.addSeries(CandlestickSeries);
    series.setData([{time:60 as any,open:100,high:108,low:95,close:102},{time:120 as any,open:102,high:109,low:98,close:104}]);
    chart.timeScale().setVisibleLogicalRange({from:-10,to:30});vi.advanceTimersByTime(20);
    const time=chart.timeScale().coordinateToTime(300), price=series.coordinateToPrice(100)!;
    const span=series.coordinateToPrice(0)!-series.coordinateToPrice(374)!;
    el.querySelector('canvas')!.dispatchEvent(new WheelEvent('wheel',{clientX:300,clientY:100,deltaY:-100,cancelable:true}));
    vi.advanceTimersByTime(20);
    expect(chart.timeScale().coordinateToTime(300)).toBeCloseTo(Number(time));
    expect(series.coordinateToPrice(100)).toBeCloseTo(price);
    expect(series.coordinateToPrice(0)!-series.coordinateToPrice(374)!).toBeCloseTo(span);
    const horizontal=chart.timeScale().getVisibleLogicalRange();
    el.querySelector('canvas')!.dispatchEvent(new WheelEvent('wheel',{clientX:300,clientY:100,deltaY:-100,ctrlKey:true,cancelable:true}));
    vi.advanceTimersByTime(20);
    expect(chart.timeScale().getVisibleLogicalRange()).toEqual(horizontal);
    expect(series.coordinateToPrice(100)).toBeCloseTo(price);
    expect(series.coordinateToPrice(0)!-series.coordinateToPrice(374)!).toBeCloseTo(span*Math.exp(-.15));
    series.update({time:120 as any,open:102,high:120,low:90,close:104});vi.advanceTimersByTime(20);
    expect(series.coordinateToPrice(100)).toBeCloseTo(price);
    chart.priceScale('right').applyOptions({autoScale:true});vi.advanceTimersByTime(20);
    expect(series.coordinateToPrice(0)!-series.coordinateToPrice(374)!).toBeGreaterThan(30);chart.remove();
  });
  it('zooms mobile time with pinch independently of price and honors disabled scaling', () => {
    const el=host(),chart=createChart(el,{width:800,height:400});
    const series=chart.addSeries(CandlestickSeries);series.setData([{time:60 as any,open:100,high:108,low:95,close:102}]);
    chart.timeScale().setVisibleLogicalRange({from:-10,to:30});vi.advanceTimersByTime(20);
    const canvas=el.querySelector('canvas')!;canvas.setPointerCapture=vi.fn();
    const pointer=(type:string,id:number,x:number)=>{const event=new MouseEvent(type,{clientX:x,clientY:187});Object.defineProperty(event,'pointerId',{value:id});canvas.dispatchEvent(event);};
    const before=series.coordinateToPrice(0)!-series.coordinateToPrice(374)!;
    pointer('pointerdown',1,200);pointer('pointerdown',2,400);pointer('pointermove',2,600);vi.advanceTimersByTime(20);
    const range=chart.timeScale().getVisibleLogicalRange()!;
    expect(range.to-range.from).toBeCloseTo(20);
    expect(series.coordinateToPrice(0)!-series.coordinateToPrice(374)!).toBeCloseTo(before);
    chart.applyOptions({handleScale:false});pointer('pointermove',2,700);vi.advanceTimersByTime(20);
    expect(chart.timeScale().getVisibleLogicalRange()).toEqual(range);chart.remove();
  });
  it('keeps constrained horizontal zoom independent of price and fitContent restores autoscale', () => {
    const chart=createChart(host(),{width:800,height:400});
    const series=chart.addSeries(CandlestickSeries);
    series.setData([{time:60 as any,open:100,high:108,low:95,close:102}]);
    chart.timeScale().setVisibleLogicalRange({from:-10,to:30});vi.advanceTimersByTime(20);
    const before=series.coordinateToPrice(0)!-series.coordinateToPrice(374)!;
    chart.timeScale().subscribeVisibleLogicalRangeChange(range=>{
      if(range && range.to-range.from>50)chart.timeScale().setVisibleLogicalRange({from:-15,to:35});
    });
    zoomChart(chart,2);vi.advanceTimersByTime(20);
    expect(series.coordinateToPrice(0)!-series.coordinateToPrice(374)!).toBeCloseTo(before);
    const timeRange=chart.timeScale().getVisibleLogicalRange();
    for(const factor of [0,-1,NaN,Infinity])zoomChart(chart,factor);
    expect(chart.timeScale().getVisibleLogicalRange()).toEqual(timeRange);
    chart.timeScale().fitContent();vi.advanceTimersByTime(20);
    expect(series.coordinateToPrice(0)!-series.coordinateToPrice(374)!).toBeCloseTo(before);chart.remove();
  });
  it('does not clear the canvas backing store for same-size option updates', () => {
    const el=host(),chart=createChart(el,{width:800,height:400});
    const canvas=el.querySelector('canvas')!;
    const width=vi.spyOn(canvas,'width','set'),height=vi.spyOn(canvas,'height','set');
    chart.applyOptions({rightPriceScale:{scaleMargins:{top:.1,bottom:.1}}});
    chart.resize(800,400);
    expect(width).not.toHaveBeenCalled();expect(height).not.toHaveBeenCalled();
    chart.resize(900,500);expect(width).toHaveBeenCalledOnce();expect(height).toHaveBeenCalledOnce();chart.remove();
  });
  it('uses a broader presentation floor for sparse 4h candles without changing tick prices', () => {
    const short=createChart(host(),{width:800,height:400}),long=createChart(host(),{width:800,height:400});
    setChartInterval(short,5);setChartInterval(long,14400);
    const a=short.addSeries(CandlestickSeries),b=long.addSeries(CandlestickSeries);
    const rows=[{time:14400 as any,open:100,high:100.001,low:99.999,close:100.0005}];
    a.setData(rows);b.setData(rows);vi.advanceTimersByTime(20);
    const shortMove=Math.abs(a.priceToCoordinate(100)!-a.priceToCoordinate(100.0005)!);
    const longMove=Math.abs(b.priceToCoordinate(100)!-b.priceToCoordinate(100.0005)!);
    expect(shortMove/longMove).toBeCloseTo(Math.sqrt(14400/5));
    expect(a.data()).toEqual(rows);expect(b.data()).toEqual(rows);
    const open=b.priceToCoordinate(100);
    b.update({...rows[0],close:100.0006});vi.advanceTimersByTime(20);
    expect(b.priceToCoordinate(100)).toBe(open);short.remove();long.remove();
  });
  it('scales the right axis on drag, resets only price on axis double-click, and resets both on chart double-click', () => {
    const el=host(),chart=createChart(el,{width:800,height:400});
    const series=chart.addSeries(CandlestickSeries);series.setData([{time:60 as any,open:100,high:108,low:95,close:102}]);
    chart.timeScale().setVisibleLogicalRange({from:-10,to:30});vi.advanceTimersByTime(20);
    const canvas=el.querySelector('canvas')!;canvas.setPointerCapture=vi.fn();
    const span=()=>series.coordinateToPrice(0)!-series.coordinateToPrice(374)!;
    const original=span(),range=chart.timeScale().getVisibleLogicalRange();
    for(const [type,y] of [['pointerdown',180],['pointermove',130],['pointerup',130]] as const){
      const event=new MouseEvent(type,{clientX:760,clientY:y});Object.defineProperty(event,'pointerId',{value:1});canvas.dispatchEvent(event);
    }
    vi.advanceTimersByTime(20);expect(span()).toBeLessThan(original);
    expect(chart.timeScale().getVisibleLogicalRange()).toEqual(range);
    canvas.dispatchEvent(new MouseEvent('dblclick',{clientX:760,clientY:180}));vi.advanceTimersByTime(20);
    expect(span()).toBeCloseTo(original);expect(chart.timeScale().getVisibleLogicalRange()).toEqual(range);
    zoomPriceScale(chart,.5);zoomChart(chart,.5);vi.advanceTimersByTime(20);
    canvas.dispatchEvent(new MouseEvent('dblclick',{clientX:200,clientY:180}));vi.advanceTimersByTime(20);
    expect(span()).toBeCloseTo(original);expect(chart.timeScale().getVisibleLogicalRange()).toEqual({from:0,to:8});chart.remove();
  });
  it('prevents panning into a fully blank past/future and keeps live candle anchored on button zoom', () => {
    const chart=createChart(host(),{width:800,height:400});const series=chart.addSeries(CandlestickSeries);
    series.setData([{time:60 as any,open:100,high:108,low:95,close:102},{time:120 as any,open:102,high:109,low:98,close:104}]);
    for(const range of [{from:-1000,to:-900},{from:1000,to:1100}]){
      chart.timeScale().setVisibleLogicalRange(range);const view=chart.timeScale().getVisibleLogicalRange()!;
      expect(view.to).toBeGreaterThan(0);expect(view.from).toBeLessThan(1);
    }
    chart.timeScale().setVisibleLogicalRange({from:-20,to:5});vi.advanceTimersByTime(20);
    const x=chart.timeScale().timeToCoordinate(120 as any);
    zoomChart(chart,.7);vi.advanceTimersByTime(20);expect(chart.timeScale().timeToCoordinate(120 as any)).toBeCloseTo(Number(x));
    chart.remove();
  });
  it('retains viewport across replacement series, aligns overlays, and disposes canvas', () => {
    const el=host(); const chart=createChart(el,{width:800,height:400});
    const first=chart.addSeries(CandlestickSeries);
    first.setData([{time:60 as any,open:100,high:108,low:95,close:102},{time:120 as any,open:102,high:109,low:98,close:104}]);
    chart.timeScale().setVisibleLogicalRange({from:-3,to:30}); vi.advanceTimersByTime(20);
    const x=chart.timeScale().timeToCoordinate(90 as any);
    expect(chart.timeScale().coordinateToTime(x!)).toBe(90);
    expect(first.coordinateToPrice(first.priceToCoordinate(102)!)).toBeCloseTo(102);
    chart.removeSeries(first); const next=chart.addSeries(AreaSeries); next.setData([{time:60 as any,value:102},{time:120 as any,value:104}]);
    expect(chart.timeScale().getVisibleLogicalRange()).toEqual({from:-3,to:30});
    chart.remove(); expect(el.querySelector('canvas')).toBeNull(); vi.advanceTimersByTime(100);
  });
});
