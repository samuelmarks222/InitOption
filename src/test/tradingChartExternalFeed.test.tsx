import {act, renderHook} from '@testing-library/react';
import {useEffect, useRef} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useTradingPriceChart} from '@/components/trading/chart-core/useTradingPriceChart';
import {createMarketDataFeed} from '@/components/trading/engine/marketDataFeed';
import {TIMEFRAMES} from '@/components/trading/engine/priceEngine';

const fakes=vi.hoisted(()=>({charts:[] as any[]}));
vi.mock('@/lib/otcMarket',()=>({isInternalOTC:false,marketWebSocketUrl:()=> 'wss://market.invalid/ticks'}));
vi.mock('@/components/trading/chart-core/LightweightChart',()=>({LightweightChart:class {
  scale={setVisibleLogicalRange:vi.fn(),subscribeVisibleLogicalRangeChange:vi.fn(),unsubscribeVisibleLogicalRangeChange:vi.fn()};
  series={setData:vi.fn(),update:vi.fn(),setKind:vi.fn(),getActiveSeries:vi.fn(()=>({}))};
  chart={timeScale:()=>this.scale};destroy=vi.fn();zoom=vi.fn();latest=vi.fn();reset=vi.fn();
  constructor(){fakes.charts.push(this);}
}}));
class Socket extends EventTarget {
  static instances:Socket[]=[]; static CLOSED=3; static OPEN=1;
  readyState=0; sent:string[]=[];
  constructor(public url:string){super();Socket.instances.push(this);}
  send(data:string){this.sent.push(data);}
  open(){this.readyState=1;this.dispatchEvent(new Event('open'));}
  close(){this.readyState=3;this.dispatchEvent(new Event('close'));}
  message(data:unknown){const event=new Event('message');Object.defineProperty(event,'data',{value:JSON.stringify(data)});this.dispatchEvent(event);}
}
const symbol='INTEGRATION-EXTERNAL-TEST';
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(600000);Socket.instances=[];fakes.charts.length=0;vi.stubGlobal('WebSocket',Socket);});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
describe('external market feed to chart integration',()=>{
  it('uses all ordered ticks even when the feed has second-precision timestamps',async()=>{
    const container={current:document.createElement('div')};
    const {rerender,unmount}=renderHook(({kind})=>{
      const chart=useTradingPriceChart(container,symbol,5,kind); const ref=useRef(chart);ref.current=chart;
      useEffect(()=>{const feed=createMarketDataFeed({websocketUrl:'wss://market.invalid/ticks',subscription:{symbol,basePrice:100,timeframe:TIMEFRAMES['5s']},callbacks:{
        onTick:tick=>ref.current.onTick(tick),onStatusChange:status=>ref.current.onStatus(status),onHistory:()=>ref.current.onHistory(),
      }});feed.connect();return()=>feed.disconnect();},[]);
      return chart;
    },{initialProps:{kind:'candles' as 'candles'|'bars'}});
    const socket=Socket.instances[0];act(()=>socket.open());
    act(()=>socket.message({symbol,timestamp:600.1,price:100,sequence:1}));
    act(()=>socket.message({ticks:[{symbol,timestamp:605,price:102,sequence:3},{symbol,timestamp:605,price:98,sequence:2}]}));
    expect(fakes.charts[0].series.update.mock.calls.map(([bar]:any[])=>bar)).toEqual([
      {time:605,open:98,high:98,low:98,close:98},
      {time:605,open:98,high:102,low:98,close:102},
    ]);
    rerender({kind:'bars'});expect(Socket.instances).toHaveLength(1);
    expect(fakes.charts[0].series.setKind).toHaveBeenLastCalledWith('bars');
    unmount();await act(async()=>{await vi.advanceTimersByTimeAsync(1000);});
  });
});
