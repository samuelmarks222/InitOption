import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { animateViewport } from '@/components/trading/engine/native/viewportAnimation';
import { CandleAggregator } from '@/components/trading/engine/native/realtime';
import { syncServerTime, resetSync, getServerTimeOffset } from '@/lib/serverTimeSync';
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(600000); resetSync();
  vi.stubGlobal('requestAnimationFrame',(fn: (now: number)=>void)=>setTimeout(()=>fn(performance.now()),16));
  vi.stubGlobal('cancelAnimationFrame',(id: number)=>clearTimeout(id));
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();resetSync();});
describe('viewport-only scrolling',()=>{
  it('eases the live viewport without altering candle timing or jumping to the final range',()=>{
    let range={from:0,to:100};
    const scale={getVisibleLogicalRange:()=>range,setVisibleLogicalRange:(next:typeof range)=>{range=next;}};
    animateViewport(scale,{from:1,to:101});
    vi.advanceTimersByTime(80); expect(range.from).toBeGreaterThan(0); expect(range.from).toBeLessThan(1);
    vi.advanceTimersByTime(120); expect(range).toEqual({from:1,to:101});
  });
  it('stops following as soon as a user changes their viewport',()=>{
    let range={from:0,to:100};
    const scale={getVisibleLogicalRange:()=>range,setVisibleLogicalRange:(next:typeof range)=>{range=next;}};
    animateViewport(scale,{from:1,to:101}); vi.advanceTimersByTime(32);
    range={from:-100,to:0}; vi.advanceTimersByTime(300);
    expect(range).toEqual({from:-100,to:0});
  });
});
describe('synchronized candle boundary clocks',()=>{
  it('reschedules the next boundary after server clock synchronization',async()=>{
    const closed=vi.fn(); const engine=new CandleAggregator(5,closed,vi.fn());
    engine.onTick({timestamp:600,price:100});
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({timestamp:604})})));
    await syncServerTime();
    expect(getServerTimeOffset()).toBe(4000);
    vi.advanceTimersByTime(999); expect(closed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(closed).toHaveBeenCalledTimes(1);
    expect(engine.getCurrentCandle()?.time).toBe(605); engine.destroy();
  });
  it('keeps the last valid clock offset during a temporary sync failure',async()=>{
    const fetchMock=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({timestamp:604})}).mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch',fetchMock);
    await syncServerTime(); expect(getServerTimeOffset()).toBe(4000);
    await syncServerTime(); expect(getServerTimeOffset()).toBe(4000);
  });
});
