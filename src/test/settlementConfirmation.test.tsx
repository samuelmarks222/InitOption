// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { TradingProvider, useTrading } from '@/hooks/useTrading';
import { toast } from '@/hooks/use-toast';
import { winningNotification } from '@/lib/winningNotifications';
const state = vi.hoisted(() => ({
  profile:{id:'user-1',balance:1000,total_deposit:1000,total_profit:0,total_trades:0,total_wins:0,reserved_withdrawal_balance:0},
  user:{id:'user-1'}, refresh:vi.fn(async()=>{}),
  trade: null as Record<string, any> | null,
  settle: null as null | ((value: any)=>void),
  settleCalls:0, lastUpdate:null as Record<string,any> | null,
  entryQuote:100, exitQuote:110, quoteAvailable:true, quoteRequests:[] as [string, number | undefined][],
}));
vi.mock('@/lib/otcMarket',()=>({isInternalOTC:true,requestOTCQuote:vi.fn(async(symbol: string, at?: number)=>{
  state.quoteRequests.push([symbol,at]);
  if(!state.quoteAvailable)throw new Error('OTC service offline');
  return {symbol,price:at===undefined?state.entryQuote:state.exitQuote,timestamp:at??Date.now()/1000,sequence:1};
})}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user,profile:state.profile,refreshProfile:state.refresh})}));
vi.mock('@/contexts/VipContext',()=>({useVip:()=>({refreshVip:state.refresh})}));
vi.mock('@/integrations/appwrite/authService',()=>({clerkUserIdToUuid:(id: string)=>id}));
vi.mock('@/lib/tradeBalanceAudit',()=>({insertTradeBalanceAudit:vi.fn(async()=>{})}));
vi.mock('@/lib/tradeSounds',()=>({playTradeOpenSound:vi.fn(async()=>{}),playTradeResultSound:vi.fn(async()=>{})}));
vi.mock('@/hooks/use-toast',()=>({toast:vi.fn()}));
vi.mock('@/integrations/api/client',()=>({api:{
  rpc:vi.fn(async()=>({data:null,error:null})),
  from:(table: string)=>{
    let operation='read',payload: Record<string,any>={},single=false;
    const chain: any={
      select:()=>chain,eq:()=>chain,neq:()=>chain,gte:()=>chain,order:()=>chain,limit:()=>chain,
      single:()=>{single=true;return chain;},
      insert:(row: Record<string,any>)=>{operation='insert';payload=row;return chain;},
      update:(row: Record<string,any>)=>{operation='update';payload=row;return chain;},
      then:(resolve: (value:any)=>void,reject:(reason:unknown)=>void)=>{
        if(table==='trades'&&operation==='insert') {state.trade={id:'trade-1',...payload};return Promise.resolve({data:state.trade,error:null}).then(resolve,reject);}
        if(table==='trades'&&operation==='update') {
          state.lastUpdate=payload;state.settleCalls++;
          return new Promise(done=>{state.settle=(response)=>{if(response.data)state.trade=response.data;done(response);};}).then(resolve,reject);
        }
        return Promise.resolve({data:table==='profiles'?state.profile:(single?null:[]),error:null}).then(resolve,reject);
      },
    };return chain;
  },
}}));
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));state.trade=null;state.settle=null;state.settleCalls=0;state.lastUpdate=null;state.entryQuote=100;state.exitQuote=110;state.quoteAvailable=true;state.quoteRequests=[];});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();localStorage.clear();});
async function expiredTrade(exit=110) {
  state.exitQuote=exit;
  const hook=renderHook(()=>useTrading(),{wrapper:TradingProvider});
  await act(async()=>{});
  act(()=>hook.result.current.setCurrentPrice(100));
  await act(async()=>{expect(await hook.result.current.openTrade('EUR/USD','higher',100,100,1,.92)).toBe(true);});
  act(()=>hook.result.current.setCurrentPrice(exit));
  await act(async()=>{vi.advanceTimersByTime(1100);});
  return hook;
}
describe('OTC entry and expiry receipts',()=>{
  it('uses the requested symbol server receipt rather than a different active chart price',async()=>{
    const hook=renderHook(()=>useTrading(),{wrapper:TradingProvider});await act(async()=>{});
    state.entryQuote=1.12345678;
    act(()=>hook.result.current.setCurrentPrice(99999));
    await act(async()=>{expect(await hook.result.current.openTrade('EUR/USD','higher',10,22222,1,.92)).toBe(true);});
    expect(state.trade?.entry_price).toBe(1.12345678);expect(state.quoteRequests[0][0]).toBe('EUR/USD');
  });
  it('settles against the symbol expiry receipt, not the current selected chart price',async()=>{
    const hook=renderHook(()=>useTrading(),{wrapper:TradingProvider});await act(async()=>{});
    state.entryQuote=1.1;state.exitQuote=1.2;
    await act(async()=>{expect(await hook.result.current.openTrade('EUR/USD','higher',10,22222,1,.92)).toBe(true);});
    act(()=>hook.result.current.setCurrentPrice(99999));
    await act(async()=>{vi.advanceTimersByTime(1100);});
    expect(state.lastUpdate?.exit_price).toBe(1.2);
    expect(state.quoteRequests.at(-1)).toEqual(['EUR/USD',new Date(state.trade!.opened_at).getTime()/1000+1]);
  });
  it('refuses to open on an unavailable server quote',async()=>{
    const hook=renderHook(()=>useTrading(),{wrapper:TradingProvider});await act(async()=>{});state.quoteAvailable=false;
    await act(async()=>{expect(await hook.result.current.openTrade('EUR/USD','higher',10,100,1,.92)).toBe(false);});
    expect(state.trade).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({title:'Trade not opened',description:'OTC service offline',variant:'destructive'}));
  });
});
describe('notifications wait for actual settlement acknowledgement',()=>{
  it('emits no provisional win, then emits exactly one result using the persisted amounts',async()=>{
    const {result}=await expiredTrade();
    expect(state.settleCalls).toBe(1);expect(result.current.pendingSettlements).toHaveLength(0);
    await act(async()=>{state.settle!({data:{...state.trade,status:'won',profit:185,exit_price:110,closed_at:'2026-11-04T10:00:01Z'},error:null});});
    expect(result.current.pendingSettlements).toHaveLength(1);
    expect(winningNotification(result.current.pendingSettlements[0])?.profit).toBe(85);
    await act(async()=>{vi.advanceTimersByTime(1000);});
    expect(result.current.pendingSettlements).toHaveLength(1);expect(state.settleCalls).toBe(1);
  });
  it('never emits a winning notification for a confirmed loss',async()=>{
    const {result}=await expiredTrade(90);
    await act(async()=>{state.settle!({data:{...state.trade,status:'lost',profit:0,exit_price:90,closed_at:'2026-11-04T10:00:01Z'},error:null});});
    expect(result.current.pendingSettlements).toHaveLength(1);
    expect(winningNotification(result.current.pendingSettlements[0])).toBeNull();
  });
  it('emits nothing when persistence fails, including while awaiting a retry',async()=>{
    vi.spyOn(console,'error').mockImplementation(()=>{});
    const {result}=await expiredTrade();
    await act(async()=>{state.settle!({data:null,error:{message:'database unavailable'}});});
    expect(result.current.pendingSettlements).toHaveLength(0);
    await act(async()=>{vi.advanceTimersByTime(1000);});
    expect(state.settleCalls).toBe(2);expect(result.current.pendingSettlements).toHaveLength(0);
    await act(async()=>{state.settle!({data:null,error:{message:'still unavailable'}});});
    await act(async()=>{vi.advanceTimersByTime(2000);});
    await act(async()=>{state.settle!({data:null,error:{message:'failed'}});});
    expect(result.current.pendingSettlements).toHaveLength(0);
  });
});
