// @vitest-environment jsdom
import { useCallback, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmedSettlement, winningNotification, type WinningNotification } from '@/lib/winningNotifications';
import { WinningNotifications } from '@/components/trading/WinningNotifications';
import type { TradeSettlement } from '@/hooks/useTrading';
import { createDefaultWebsiteContent, normalizeWebsiteContent } from '@/lib/websiteContent';
vi.mock('@/contexts/CurrencyContext', () => ({ useCurrency: () => ({ formatMoney: (value: number) => `$${value.toFixed(2)}` }) }));
const trade: TradeSettlement = {id:'trade-1',asset_symbol:'EUR/USD',direction:'higher',amount:100,profit:192,status:'won',settled_at:'2026-11-04T10:00:00.000Z',entry_price:1,exit_price:1.1,expiry_seconds:60,payout_rate:.92};
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('confirmed winning notification logic', () => {
  it('uses actual persisted payout minus investment, not a predicted payout rate', () => {
    expect(winningNotification({...trade,payout_rate:.1})).toMatchObject({profit:92,payout:192,investment:100,direction:'UP',style:'standard'});
    expect(winningNotification(trade,92)?.style).toBe('big');
    expect(winningNotification({...trade,direction:'lower'},93)?.direction).toBe('DOWN');
  });
  it('rejects pending, losing, corrupt, and unprofitable results', () => {
    for (const invalid of [{status:'lost'},{status:'open'},{status:'pending'},{profit:0},{profit:100},{profit:NaN},{amount:0},{settled_at:''}]) {
      expect(winningNotification({...trade,...invalid} as TradeSettlement)).toBeNull();
    }
    expect(confirmedSettlement(null,{id:trade.id})).toBeNull();
    expect(confirmedSettlement({...trade,closed_at:trade.settled_at,status:'open'},{id:trade.id})).toBeNull();
    expect(confirmedSettlement({...trade,closed_at:trade.settled_at},{id:'another-trade'})).toBeNull();
  });
  it('normalizes a matching acknowledged settlement row before showing its win', () => {
    const confirmed=confirmedSettlement({...trade,amount:'100',profit:'192',closed_at:trade.settled_at},{id:trade.id,marker_time:600});
    expect(confirmed?.expiry_time).toBe(660);
    expect(winningNotification(confirmed!)).toMatchObject({id:trade.id,profit:92,payout:192});
  });
  it('defaults and persists the admin big-win threshold through existing website content', () => {
    expect(createDefaultWebsiteContent('Test').tradingDefaults.bigWinProfitThreshold).toBe(500);
    const raw=JSON.stringify({tradingDefaults:{bigWinProfitThreshold:75}});
    expect(normalizeWebsiteContent(raw,'Test').tradingDefaults.bigWinProfitThreshold).toBe(75);
    expect(normalizeWebsiteContent(JSON.stringify({tradingDefaults:{bigWinProfitThreshold:-1}}),'Test').tradingDefaults.bigWinProfitThreshold).toBe(500);
  });
});
function NotificationsHarness({initial}: {initial: WinningNotification[]}) {
  const [results,setResults]=useState(initial);
  const dismiss=useCallback((id: string)=>setResults(current=>current.filter(item=>item.id!==id)),[]);
  return <WinningNotifications results={results} onDismiss={dismiss} />;
}
describe('standard and big winning cards', () => {
  it('shows both designs with their own amounts, and supports independent manual dismissal', () => {
    const one=winningNotification(trade)!;
    const two=winningNotification({...trade,id:'trade-2',asset_symbol:'BTC/USD',profit:1092,direction:'lower'})!;
    render(<NotificationsHarness initial={[one,two]} />);
    expect(screen.getByText('TRADE WON')).toBeTruthy(); expect(screen.getByText('BIG WIN!')).toBeTruthy();
    expect(screen.getByText('+$92.00')).toBeTruthy(); expect(screen.getByText('+$992.00')).toBeTruthy();
    expect(screen.getByText('$192.00')).toBeTruthy(); expect(screen.getByText('$1092.00')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Dismiss win for EUR/USD'));
    expect(screen.queryByText('TRADE WON')).toBeNull(); expect(screen.getByText('BTC/USD')).toBeTruthy();
  });
  it('auto-dismisses independently and starts queued cards only when displayed', () => {
    vi.useFakeTimers();
    const one=winningNotification(trade)!;
    const two=winningNotification({...trade,id:'trade-2',asset_symbol:'BTC/USD',profit:1092})!;
    const three=winningNotification({...trade,id:'trade-3',asset_symbol:'GBP/USD'})!;
    render(<NotificationsHarness initial={[one,two,three]} />);
    expect(screen.queryByText('GBP/USD')).toBeNull();
    act(()=>vi.advanceTimersByTime(6000));
    expect(screen.queryByText('EUR/USD')).toBeNull(); expect(screen.getByText('GBP/USD')).toBeTruthy();
    act(()=>vi.advanceTimersByTime(2500));
    expect(screen.queryByText('BTC/USD')).toBeNull(); expect(screen.getByText('GBP/USD')).toBeTruthy();
    act(()=>vi.advanceTimersByTime(3500)); expect(screen.queryAllByRole('status')).toHaveLength(0);
  });
  it('shows only one mobile card at a time, leaving other wins queued', () => {
    vi.stubGlobal('matchMedia', () => ({ matches:true, addEventListener:vi.fn(), removeEventListener:vi.fn() }));
    const one=winningNotification(trade)!;
    const two=winningNotification({...trade,id:'trade-2',asset_symbol:'BTC/USD',profit:1092})!;
    render(<NotificationsHarness initial={[one,two]} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByText('BTC/USD')).toBeNull();
    fireEvent.click(screen.getByLabelText('Dismiss win for EUR/USD'));
    expect(screen.getByText('BTC/USD')).toBeTruthy();
  });

});
