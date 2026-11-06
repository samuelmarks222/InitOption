import { act, renderHook } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTradingPriceChart } from '@/components/trading/chart-core/useTradingPriceChart';
import { createMarketDataFeed } from '@/components/trading/engine/marketDataFeed';
import { TIMEFRAMES } from '@/components/trading/engine/priceEngine';

const fakes = vi.hoisted(() => ({instances: [] as any[]}));
vi.mock('@/lib/otcMarket', async importOriginal => ({...await importOriginal<typeof import('@/lib/otcMarket')>(), isInternalOTC:true, marketWebSocketUrl: () => '/api/otc'}));
vi.mock('@/lib/otcHistory', () => ({requestOTCHistory: vi.fn(async () => ({candles:[],hasMore:false}))}));
vi.mock('@/components/trading/chart-core/LightweightChart', () => ({LightweightChart: class {
  scale = {setVisibleLogicalRange: vi.fn(), subscribeVisibleLogicalRangeChange: vi.fn(), unsubscribeVisibleLogicalRangeChange: vi.fn()};
  series = {setData: vi.fn(), update: vi.fn(), setKind: vi.fn(), getActiveSeries: vi.fn(() => ({}))};
  chart = {timeScale: () => this.scale};
  destroy = vi.fn(); zoom = vi.fn(); latest = vi.fn(); reset = vi.fn();
  constructor() {fakes.instances.push(this);}
}}));

const symbol = 'INTEGRATION-TEST-CHART';
const tick = (sequence: number, price: number) => ({symbol,sequence,source:'internal-otc',t:String(sequence * 100000),p:price.toFixed(8)});
const snapshot = {type:'snapshot',symbol,session:'fixture',source:'internal-otc',serverTime:600.1,cursor:6001,catchingUp:false,
  ticks:[tick(6001,100)], candles:[{time:595,open:99,high:101,low:98,close:100,volume:50},{time:600,open:100,high:100,low:100,close:100,volume:2}]};
const batch = (sequence:number, price:number) => ({type:'batch',symbol,session:'fixture',source:'internal-otc',serverTime:sequence/10,cursor:sequence,catchingUp:false,ticks:[tick(sequence,price)]});

beforeEach(() => {vi.useFakeTimers(); vi.setSystemTime(600000); fakes.instances.length=0;});
afterEach(() => {vi.unstubAllGlobals(); vi.useRealTimers();});

describe('existing HTTP market feed to chart integration', () => {
  it('hydrates recorded OHLC and applies incoming server ticks without recreating the chart', async () => {
    const responses = [snapshot,batch(6002,98),batch(6003,102),batch(6050,103)];
    const fetch = vi.fn(async () => ({ok:true,json:async()=>responses.shift() ?? {...batch(6050,103),ticks:[]}}));
    vi.stubGlobal('fetch',fetch);
    const container = {current: document.createElement('div')};
    const {result,unmount} = renderHook(() => {
      const chart = useTradingPriceChart(container,symbol,5,'candles');
      const ref = useRef(chart); ref.current=chart;
      useEffect(() => {
        const feed = createMarketDataFeed({internalOTC:true,websocketUrl:'/api/otc',subscription:{symbol,basePrice:100,timeframe:TIMEFRAMES['5s']},callbacks:{
          onHistory:()=>ref.current.onHistory(), onTick:tick=>ref.current.onTick(tick), onStatusChange:status=>ref.current.onStatus(status),
        }});
        feed.connect(); return () => feed.disconnect();
      },[]);
      return chart;
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    const chart = fakes.instances[0];
    expect(result.current.status).toBe('live');
    expect(chart.series.setData).toHaveBeenCalledWith(snapshot.candles,false);
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(chart.series.update.mock.calls.map(([bar]:any[])=>bar)).toEqual([
      {time:600,open:100,high:100,low:98,close:98,volume:3},
      {time:600,open:100,high:102,low:98,close:102,volume:4},
      {time:605,open:103,high:103,low:103,close:103},
    ]);
    expect(chart.series.setData).toHaveBeenCalledTimes(1);
    expect(fakes.instances).toHaveLength(1);
    unmount(); await act(async () => {await vi.advanceTimersByTimeAsync(1000);});
  });
});
