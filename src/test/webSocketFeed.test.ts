import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMarketDataFeed } from '@/components/trading/engine/marketDataFeed';
import { TIMEFRAMES } from '@/components/trading/engine/priceEngine';

class MockSocket extends EventTarget {
  static CLOSED=3;
  static OPEN=1;
  static instances: MockSocket[]=[];
  static failNext=false;
  readyState=0;
  sent: string[]=[];
  constructor(readonly url: string) {
    super();
    if (MockSocket.failNext) { MockSocket.failNext=false; throw new Error('socket unavailable'); }
    MockSocket.instances.push(this);
  }
  send(message: string) { this.sent.push(message); }
  open() { this.readyState=1; this.dispatchEvent(new Event('open')); }
  close() { this.readyState=3; this.dispatchEvent(new Event('close')); }
  message(payload: unknown) {
    const event=new Event('message');
    Object.defineProperty(event,'data',{value:JSON.stringify(payload)});
    this.dispatchEvent(event);
  }
}
let nextSymbol=0;
function setup() {
  const symbol=`TEST-${nextSymbol++}`;
  const onTick=vi.fn(),onStatusChange=vi.fn(),onError=vi.fn();
  const feed=createMarketDataFeed({
    websocketUrl:'wss://test.invalid/market',
    subscription:{symbol,basePrice:100,timeframe:TIMEFRAMES['5s']},
    callbacks:{onTick,onStatusChange,onError},
  });
  return {symbol,feed,onTick,onStatusChange,onError};
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(600000);
  MockSocket.instances=[]; MockSocket.failNext=false;
  vi.stubGlobal('WebSocket',MockSocket); vi.spyOn(Math,'random').mockReturnValue(0);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('real WebSocket market feed', () => {
  it('subscribes and delivers sorted batches, ignoring malformed and wrong-symbol ticks', () => {
    const {feed,symbol,onTick}=setup(); feed.connect(); const socket=MockSocket.instances[0]; socket.open();
    expect(JSON.parse(socket.sent[0])).toMatchObject({type:'subscribe',symbol});
    socket.message({ticks:[{symbol,timestamp:602,price:102,sequence:2},null,{symbol,timestamp:601,price:101,sequence:1},{symbol:'wrong',timestamp:603,price:999}]});
    expect(onTick.mock.calls.map(([tick])=>tick.price)).toEqual([101,102]);
    socket.message({type:'tick',symbol,timestamp:603,price:'not-a-price'});
    expect(onTick).toHaveBeenCalledTimes(2); feed.disconnect();
  });
  it('retains deduplication cursors across reconnects without a simulated fallback', () => {
    const {feed,symbol,onTick,onStatusChange}=setup(); feed.connect(); const first=MockSocket.instances[0]; first.open();
    first.message({symbol,timestamp:600,price:100,sequence:8}); first.close();
    expect(onStatusChange).toHaveBeenLastCalledWith('reconnecting');
    vi.advanceTimersByTime(750); const second=MockSocket.instances[1]; second.open();
    second.message({symbol,timestamp:600,price:100,sequence:8});
    second.message({symbol,timestamp:601,price:101,sequence:9});
    expect(onTick.mock.calls.map(([tick])=>tick.price)).toEqual([100,101]);
    vi.advanceTimersByTime(10000); expect(onTick).toHaveBeenCalledTimes(2); feed.disconnect();
  });
  it('detaches old socket callbacks on manual disconnect and cancels retries', () => {
    const {feed,symbol,onTick}=setup(); feed.connect(); const old=MockSocket.instances[0]; old.open();
    feed.disconnect(); vi.advanceTimersByTime(1000); feed.connect(); const current=MockSocket.instances[1]; current.open();
    old.message({symbol,timestamp:600,price:999}); old.close();
    current.message({symbol,timestamp:600,price:101});
    expect(onTick).toHaveBeenCalledTimes(1); expect(onTick.mock.calls[0][0].price).toBe(101);
    current.close(); feed.disconnect(); vi.advanceTimersByTime(30000);
    expect(MockSocket.instances).toHaveLength(2);
  });
  it('reports socket constructor failures and retries without throwing out of connect', () => {
    const {feed,onError}=setup(); MockSocket.failNext=true;
    expect(()=>feed.connect()).not.toThrow(); expect(onError).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(750); expect(MockSocket.instances).toHaveLength(1); feed.disconnect();
  });
  it('deduplicates replay across feed recreation when switching timeframes', () => {
    const {feed,symbol,onTick}=setup(); feed.connect(); const first=MockSocket.instances[0]; first.open();
    first.message({symbol,timestamp:600,price:100,sequence:3}); feed.disconnect();
    const next=createMarketDataFeed({websocketUrl:'wss://test.invalid/market',subscription:{symbol,basePrice:100,timeframe:TIMEFRAMES['1m']},callbacks:{onTick}});
    next.connect(); const second=MockSocket.instances[0];
    expect(MockSocket.instances).toHaveLength(1);
    second.message({symbol,timestamp:600,price:100,sequence:3}); second.message({symbol,timestamp:601,price:102,sequence:4});
    expect(onTick).toHaveBeenCalledTimes(2); next.disconnect();
  });
  it('shares a transport across simultaneous timeframe subscribers and rejects simulation in live mode', () => {
    const {feed,symbol,onTick}=setup(); feed.connect(); const socket=MockSocket.instances[0]; socket.open();
    const other=vi.fn();
    const next=createMarketDataFeed({websocketUrl:'wss://test.invalid/market',subscription:{symbol,basePrice:100,timeframe:TIMEFRAMES['4h']},callbacks:{onTick:other}});
    next.connect(); expect(MockSocket.instances).toHaveLength(1);
    socket.message({symbol,timestamp:600,price:999,source:'simulated'});
    socket.message({symbol,timestamp:600,price:101});
    socket.message({symbol,timestamp:600,price:101});
    expect(onTick).toHaveBeenCalledTimes(1); expect(other).toHaveBeenCalledTimes(1);
    feed.disconnect(); socket.message({symbol,timestamp:601,price:102});
    expect(onTick).toHaveBeenCalledTimes(1); expect(other).toHaveBeenCalledTimes(2);
    next.disconnect(); vi.advanceTimersByTime(1000); expect(socket.readyState).toBe(MockSocket.CLOSED);
  });

  it('sorts ticks with the same exchange timestamp by sequence before calculating OHLC', () => {
    const {feed,symbol,onTick}=setup(); feed.connect(); const socket=MockSocket.instances[0]; socket.open();
    socket.message({ticks:[{symbol,timestamp:600,price:110,sequence:2},{symbol,timestamp:600,price:95,sequence:1}]});
    expect(onTick.mock.calls.map(([tick])=>tick.price)).toEqual([95,110]);
    feed.disconnect();
  });

  it('rejects missing, malformed, far-future timestamps and missing symbols rather than inventing tick coordinates', () => {
    const {feed,symbol,onTick}=setup(); feed.connect(); const socket=MockSocket.instances[0]; socket.open();
    for (const timestamp of [undefined,'',null,'not-time',-1,1e30]) socket.message({symbol,timestamp,price:999});
    socket.message({timestamp:600,price:999});
    socket.message({symbol,timestamp:600,price:999,sequence:1.5});
    expect(onTick).not.toHaveBeenCalled();
    socket.message({symbol,timestamp:600,price:100,sequence:1});
    expect(onTick).toHaveBeenCalledOnce(); feed.disconnect();
  });

});
