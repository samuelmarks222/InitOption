import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {createMarketDataFeed} from '@/components/trading/engine/marketDataFeed';
import {TIMEFRAMES} from '@/components/trading/engine/priceEngine';
import {observedHistory} from '@/components/trading/engine/native/observedHistory';
class Socket {
  static instances: Socket[]=[];
  onopen?:()=>void;onmessage?:(e:any)=>void;onerror?:()=>void;onclose?:()=>void;
  sent:string[]=[];
  constructor(public url:string){Socket.instances.push(this);}
  send(value:string){this.sent.push(value);}
  close(){this.onclose?.();}
  message(value:any){this.onmessage?.({data:JSON.stringify(value)});}
}
let count=0;
function setup(timeframe:'5s'|'4h'='5s',symbol=`OTC-${count++}`){
  const onTick=vi.fn(),onHistory=vi.fn(),onStatusChange=vi.fn();
  const callbacks={onTick,onHistory,onStatusChange};
  const feed=createMarketDataFeed({websocketUrl:'ws://local/otc/ticks',internalOTC:true,subscription:{symbol,basePrice:99999,timeframe:TIMEFRAMES[timeframe]},callbacks});
  return {feed,symbol,...callbacks};
}
const tick=(symbol:string,sequence:number,price='100.12345678',seconds=600)=>({symbol,t:String(Math.round(seconds*1e6)),p:price,sequence,source:'internal-otc'});
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(600000);Socket.instances=[];vi.stubGlobal('WebSocket',Socket);});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
describe('dashboard native internal OTC adapter',()=>{
  it('hydrates shared server history before ticks and shares one connection across intervals',()=>{
    const first=setup();first.feed.connect();const socket=Socket.instances[0];socket.onopen?.();
    expect(JSON.parse(socket.sent[0])).toEqual({type:'subscribe',symbol:first.symbol});
    socket.message({type:'snapshot',source:'internal-otc',symbol:first.symbol,session:'server-one',ticks:[tick(first.symbol,1,'100',595),tick(first.symbol,2,'101',600)]});
    expect(first.onHistory).toHaveBeenCalledOnce();expect(first.onTick).not.toHaveBeenCalled();
    expect(observedHistory.snapshot('ws://local/otc/ticks',first.symbol,5,600).history[0].close).toBe(100);
    const second=setup('4h',first.symbol);second.feed.connect();expect(Socket.instances).toHaveLength(1);expect(second.onHistory).toHaveBeenCalledOnce();
    socket.message(tick(first.symbol,3,'99.12345678',600.1));expect(first.onTick.mock.calls[0][0].price).toBe(99.12345678);expect(second.onTick).toHaveBeenCalledOnce();
    first.feed.disconnect();second.feed.disconnect();vi.advanceTimersByTime(1000);
  });
  it('rejects duplicates, out-of-order and wrong-source data without generating prices',()=>{
    const first=setup();first.feed.connect();const socket=Socket.instances[0];socket.onopen?.();socket.message({type:'snapshot',source:'internal-otc',symbol:first.symbol,session:'one',ticks:[tick(first.symbol,1)]});
    socket.message(tick(first.symbol,1));socket.message(tick('wrong',2));socket.message({...tick(first.symbol,2),source:'simulated'});socket.message(tick(first.symbol,2,'102',599));
    expect(first.onTick).not.toHaveBeenCalled();vi.advanceTimersByTime(30000);expect(first.onTick).not.toHaveBeenCalled();
    socket.message(tick(first.symbol,2,'98',600.1));expect(first.onTick).toHaveBeenCalledOnce();first.feed.disconnect();vi.advanceTimersByTime(1000);
  });
  it('reconnects and replaces session history rather than mixing two price paths',()=>{
    const first=setup();first.feed.connect();const socket=Socket.instances[0];socket.onopen?.();socket.message({type:'snapshot',source:'internal-otc',symbol:first.symbol,session:'one',ticks:[tick(first.symbol,10,'100')]});
    socket.close();vi.advanceTimersByTime(500);const next=Socket.instances[1];next.onopen?.();next.message({type:'snapshot',source:'internal-otc',symbol:first.symbol,session:'two',ticks:[tick(first.symbol,1,'200',600.1)]});
    const snapshot=observedHistory.snapshot('ws://local/otc/ticks',first.symbol,5,600.2);expect(snapshot.current?.open).toBe(200);expect(snapshot.current?.volume).toBe(1);
    expect(first.onHistory).toHaveBeenCalledTimes(2);first.feed.disconnect();vi.advanceTimersByTime(1000);
  });
});
