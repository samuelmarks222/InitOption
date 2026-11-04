import {describe,it,expect} from 'vitest';
import {liveViewport,constrainViewport} from '@/components/trading/engine/native/viewport';
import {TimeCoordinates} from '@/components/trading/engine/native/scales';

describe('sparse OTC history presentation',()=>{
  for(const width of [360,960,1440])for(const count of [1,2,3,6,70]){
    it(`places ${count} candles at the live edge without stretching (${width}px)`,()=>{
      const range=liveViewport(width,count,count+6),span=range.to-range.from;
      const liveFraction=(count-1-range.from)/span;
      expect(liveFraction).toBeGreaterThan(.75);expect(liveFraction).toBeLessThan(.95);
      if(count<=6)expect(width/span*.72).toBeLessThanOrEqual(12);
      const normalized=constrainViewport(range,count,500);
      expect(normalized.from).toBeCloseTo(range.from);expect(normalized.to).toBeCloseTo(range.to);
    });
  }
  it('allows empty past space for sparse data but bounds panning beyond the live edge',()=>{
    const normalized=constrainViewport({from:-1000,to:-900},2,500);
    expect(normalized.from).toBeLessThan(0);expect(normalized.to).toBeGreaterThan(1);
    const past=constrainViewport({from:20,to:100},500,500);
    expect(past).toEqual({from:20,to:100});
    expect(constrainViewport({from:1000,to:1100},2,500).to).toBeLessThan(30);
  });
  for(const seconds of [5,60,120,300,600,900,1800,14400]){
    it(`uses the selected ${seconds}s interval on a one-candle axis`,()=>{
      const time=new TimeCoordinates();time.times=[14400];time.intervalSeconds=seconds;
      expect(time.logicalToTime(1)).toBe(14400+seconds);
      expect(time.logicalToTime(-2)).toBe(14400-seconds*2);
      expect(time.timeToLogical(14400+seconds*3)).toBe(3);
    });
  }
});
