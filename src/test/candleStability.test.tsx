// @vitest-environment jsdom
import { act,cleanup,render,screen } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import CandleIntervalStatus,{candleIntervalProgress} from '@/components/trading/CandleIntervalStatus';
import { PriceCoordinates } from '@/components/trading/engine/native/scales';
import { CandleAggregator } from '@/components/trading/engine/native/realtime';
import { resetSync } from '@/lib/serverTimeSync';
afterEach(()=>{cleanup();vi.useRealTimers();resetSync();});
describe('stable price-domain fitting',()=>{
  it('does not move the candle open or axis when close/high fluctuate within the viewport',()=>{
    const scale=new PriceCoordinates();scale.height=500;scale.fit(100,101);
    const anchor=scale.priceToCoordinate(100), bounds=[scale.min,scale.max];
    for(const high of [101.02,100.9,101.05,101,100.98]){
      scale.fit(100,high);expect([scale.min,scale.max]).toEqual(bounds);
      expect(scale.priceToCoordinate(100)).toBe(anchor);
    }
  });
  it('expands only when needed, retains headroom, and refits explicitly rather than breathing on each tick',()=>{
    const scale=new PriceCoordinates();scale.fit(100,101);const previous=scale.max;
    scale.fit(100,102);expect(scale.max).toBeGreaterThan(102);expect(scale.max).toBeGreaterThan(previous);
    const bounds=[scale.min,scale.max];scale.fit(100.5,100.6);expect([scale.min,scale.max]).toEqual(bounds);
    scale.refitAuto();scale.fit(100.5,100.6);expect(scale.max-scale.min).toBeLessThan(.2);
  });
  it('keeps manual whole-chart zoom intact when new data arrives',()=>{
    const scale=new PriceCoordinates();scale.height=500;scale.fit(100,101);scale.zoomAt(.5,250);
    const bounds=[scale.min,scale.max];scale.fit(50,150);expect([scale.min,scale.max]).toEqual(bounds);
    scale.reset();scale.fit(50,150);expect(scale.max-scale.min).toBeGreaterThan(100);
  });
});
describe('timeframe means aggregation duration, not a different price speed',()=>{
  it('updates both live closes from identical ticks but closes only the 5s candle at 5 seconds',()=>{
    vi.useFakeTimers();vi.setSystemTime(14400000);
    const shortClose=vi.fn(),longClose=vi.fn();
    const short=new CandleAggregator(5,shortClose,vi.fn()),long=new CandleAggregator(14400,longClose,vi.fn());
    for(let i=0;i<50;i++){
      const tick={timestamp:14400+i/10,price:100+Math.sin(i)*.1};short.onTick(tick);long.onTick(tick);
      expect(short.getCurrentCandle()?.close).toBe(long.getCurrentCandle()?.close);
    }
    vi.advanceTimersByTime(5000);expect(shortClose).toHaveBeenCalledOnce();expect(longClose).not.toHaveBeenCalled();
    expect(short.getCurrentCandle()?.time).toBe(14405);expect(long.getCurrentCandle()?.time).toBe(14400);
    short.destroy();long.destroy();
  });
  it('progress advances 2880 times faster on 5s than 4h at the same instant',()=>{
    const short=candleIntervalProgress(14401,5),long=candleIntervalProgress(14401,14400);
    expect(short.remaining).toBe(4);expect(long.remaining).toBe(14399);
    expect(short.fraction/long.fraction).toBeCloseTo(2880);
  });
  it('renders the selected duration/countdown, changes it on timeframe switch, and explains shared prices',()=>{
    vi.useFakeTimers();vi.setSystemTime(14400000);
    const view=render(<CandleIntervalStatus label="5s" seconds={5} live />);
    expect(screen.getByRole('timer').textContent).toContain('5s candle');
    act(()=>vi.advanceTimersByTime(1000));expect(screen.getByRole('timer').textContent).toContain('00:04');
    view.rerender(<CandleIntervalStatus label="4h" seconds={14400} live />);
    expect(screen.getByRole('timer').textContent).toContain('03:59:59');
    expect(screen.getByTitle(/same price stream/)).toBeTruthy();
    view.rerender(<CandleIntervalStatus label="4h" seconds={14400} live={false} />);
    expect(screen.getByRole('timer').textContent).toContain('Waiting for server prices');
    view.unmount();expect(vi.getTimerCount()).toBe(0);
  });
});
