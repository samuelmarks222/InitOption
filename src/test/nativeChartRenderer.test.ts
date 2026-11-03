// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createChart, CandlestickSeries, AreaSeries, BarSeries, LineSeries, HistogramSeries } from '@/components/trading/engine/native/chart';
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
