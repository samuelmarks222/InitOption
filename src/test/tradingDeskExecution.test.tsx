// @vitest-environment jsdom
import {act,cleanup,renderHook} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {TradingDeskProvider,useTradingDesk} from '@/components/trading/TradingDeskContext';
const order={assetSymbol:'EUR/USD',direction:'higher' as const,amount:10,entryPrice:1.1,expirySeconds:60,payoutRate:.86};
afterEach(cleanup);
describe('dashboard desk execution contract',()=>{
  it('adapts object orders to the dashboard positional handler without requiring a selected chart',async()=>{
    const demo=vi.fn(async()=>true),live=vi.fn(async()=>true);
    const hook=renderHook(()=>useTradingDesk(),{wrapper:({children})=><TradingDeskProvider onExecuteTrade={live} onExecuteDemoTrade={demo}>{children}</TradingDeskProvider>});
    await act(async()=>{expect(await hook.result.current.executeTrade(order)).toBe(true);});
    expect(demo).toHaveBeenCalledWith('EUR/USD','higher',10,1.1,60,.86);expect(live).not.toHaveBeenCalled();
  });
  it('routes subsequent orders to the currently selected account and current demo balance',async()=>{
    const demo=vi.fn(async()=>true),live=vi.fn(async()=>true);
    let account:'demo'|'live'|'tournament'='demo',balance=100;
    const hook=renderHook(()=>useTradingDesk(),{wrapper:({children})=><TradingDeskProvider initialAccountType={account} initialDemoBalance={balance} onExecuteTrade={live} onExecuteDemoTrade={demo}>{children}</TradingDeskProvider>});
    await act(async()=>{expect(await hook.result.current.executeTrade(order)).toBe(true);});
    balance=5;hook.rerender();
    await act(async()=>{expect(await hook.result.current.executeTrade(order)).toBe(false);});
    account='live';hook.rerender();
    await act(async()=>{expect(await hook.result.current.executeTrade(order)).toBe(true);});
    account='tournament';hook.rerender();
    await act(async()=>{expect(await hook.result.current.executeTrade(order)).toBe(true);});
    expect(demo).toHaveBeenCalledOnce();expect(live).toHaveBeenCalledTimes(2);
  });
  it('rejects malformed orders rather than forwarding undefined arguments to pricing',async()=>{
    const handler=vi.fn(async()=>true);
    const hook=renderHook(()=>useTradingDesk(),{wrapper:({children})=><TradingDeskProvider onExecuteTrade={handler} onExecuteDemoTrade={handler}>{children}</TradingDeskProvider>});
    for(const invalid of [undefined,'EUR/USD',{...order,amount:NaN},{...order,assetSymbol:''},{...order,expirySeconds:0}]){
      await act(async()=>{expect(await hook.result.current.executeTrade(invalid as any)).toBe(false);});
    }
    expect(handler).not.toHaveBeenCalled();
  });
});
