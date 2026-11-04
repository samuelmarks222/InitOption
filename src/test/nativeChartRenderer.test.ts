// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { liveViewport } from '@/components/trading/engine/native/viewport';
import { createChart, setChartInterval, zoomChart, CandlestickSeries, AreaSeries, BarSeries, LineSeries, HistogramSeries } from '@/components/trading/engine/native/chart';
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
  it('zooms both time and price coordinates together for candles and indicator overlays', () => {
    const chart=createChart(host(),{width:800,height:400});
    const series=chart.addSeries(CandlestickSeries), indicator=chart.addSeries(LineSeries);
    const rows=[{time:60 as any,open:100,high:108,low:95,close:102},{time:120 as any,open:102,high:109,low:98,close:104}];
    series.setData(rows);indicator.setData([{time:60 as any,value:102},{time:120 as any,value:104}]);
    chart.timeScale().setVisibleLogicalRange({from:-10,to:30});vi.advanceTimersByTime(20);
    const x1=chart.timeScale().timeToCoordinate(60 as any)!,x2=chart.timeScale().timeToCoordinate(120 as any)!;
    const y1=series.priceToCoordinate(100)!,y2=series.priceToCoordinate(104)!;
    const centerPrice=series.coordinateToPrice(187)!;
    zoomChart(chart,.5);vi.advanceTimersByTime(20);
    expect(chart.timeScale().getVisibleLogicalRange()).toEqual({from:0,to:20});
    expect(chart.timeScale().timeToCoordinate(120 as any)!-chart.timeScale().timeToCoordinate(60 as any)!).toBeCloseTo(2*(x2-x1));
    expect(series.priceToCoordinate(100)!-series.priceToCoordinate(104)!).toBeCloseTo(2*(y1-y2));
    expect(series.priceToCoordinate(centerPrice)).toBeCloseTo(187);
    expect(indicator.priceToCoordinate(104)).toBe(series.priceToCoordinate(104));
    expect(series.data()).toEqual(rows);
    zoomChart(chart,2);vi.advanceTimersByTime(20);
    expect(series.priceToCoordinate(100)).toBeCloseTo(y1);
    expect(chart.timeScale().getVisibleLogicalRange()).toEqual({from:-10,to:30});chart.remove();
  });
  it('anchors wheel zoom on both coordinates under the pointer and preserves manual scale across ticks', () => {
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
    expect(series.coordinateToPrice(0)!-series.coordinateToPrice(374)!).toBeCloseTo(span*Math.exp(-.15));
    series.update({time:120 as any,open:102,high:120,low:90,close:104});vi.advanceTimersByTime(20);
    expect(series.coordinateToPrice(100)).toBeCloseTo(price);
    chart.priceScale('right').applyOptions({autoScale:true});vi.advanceTimersByTime(20);
    expect(series.coordinateToPrice(0)!-series.coordinateToPrice(374)!).toBeGreaterThan(30);chart.remove();
  });
  it('zooms both axes with a two-finger pinch and honors disabled scaling', () => {
    const el=host(),chart=createChart(el,{width:800,height:400});
    const series=chart.addSeries(CandlestickSeries);series.setData([{time:60 as any,open:100,high:108,low:95,close:102}]);
    chart.timeScale().setVisibleLogicalRange({from:-10,to:30});vi.advanceTimersByTime(20);
    const canvas=el.querySelector('canvas')!;canvas.setPointerCapture=vi.fn();
    const pointer=(type:string,id:number,x:number)=>{const event=new MouseEvent(type,{clientX:x,clientY:187});Object.defineProperty(event,'pointerId',{value:id});canvas.dispatchEvent(event);};
    const before=series.coordinateToPrice(0)!-series.coordinateToPrice(374)!;
    pointer('pointerdown',1,200);pointer('pointerdown',2,400);pointer('pointermove',2,600);vi.advanceTimersByTime(20);
    const range=chart.timeScale().getVisibleLogicalRange()!;
    expect(range.to-range.from).toBeCloseTo(20);
    expect(series.coordinateToPrice(0)!-series.coordinateToPrice(374)!).toBeCloseTo(before*.5);
    chart.applyOptions({handleScale:false});pointer('pointermove',2,700);vi.advanceTimersByTime(20);
    expect(chart.timeScale().getVisibleLogicalRange()).toEqual(range);chart.remove();
  });
  it('uses the final constrained time span for price zoom and fitContent restores autoscale', () => {
    const chart=createChart(host(),{width:800,height:400});
    const series=chart.addSeries(CandlestickSeries);
    series.setData([{time:60 as any,open:100,high:108,low:95,close:102}]);
    chart.timeScale().setVisibleLogicalRange({from:-10,to:30});vi.advanceTimersByTime(20);
    const before=series.coordinateToPrice(0)!-series.coordinateToPrice(374)!;
    chart.timeScale().subscribeVisibleLogicalRangeChange(range=>{
      if(range && range.to-range.from>50)chart.timeScale().setVisibleLogicalRange({from:-15,to:35});
    });
    zoomChart(chart,2);vi.advanceTimersByTime(20);
    expect(series.coordinateToPrice(0)!-series.coordinateToPrice(374)!).toBeCloseTo(before*50/40);
    const timeRange=chart.timeScale().getVisibleLogicalRange();
    for(const factor of [0,-1,NaN,Infinity])zoomChart(chart,factor);
    expect(chart.timeScale().getVisibleLogicalRange()).toEqual(timeRange);
    chart.timeScale().fitContent();vi.advanceTimersByTime(20);
    expect(series.coordinateToPrice(0)!-series.coordinateToPrice(374)!).toBeCloseTo(before);chart.remove();
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
