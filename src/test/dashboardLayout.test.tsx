// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TradingHeader from '@/components/trading/TradingHeader';
import AssetInfo from '@/components/trading/AssetInfo';
import TradingPanel from '@/components/trading/TradingPanel';
import { NavigationSidebar } from '@/components/navigation/NavigationSidebar';
vi.mock('@/hooks/useTrading', () => ({ useTrading: () => ({ activeTrades: [], tradeHistory: [], openTrade: vi.fn() }) }));
vi.mock('@/lib/tradingPreferences', () => ({ useTradingPreferences: () => ({ preferences: { upTrendColor:'#0fa055', downTrendColor:'#e85b4e', oneClickTrade:true } }) }));
vi.mock('@/components/trading/TradingDeskContext', () => ({ useTradingDesk: () => ({ isSignalMode:false }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key:string) => key }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: null }) }));
vi.mock('@/hooks/useStaffAccess', () => ({ useStaffAccess: () => ({ isAdmin: false }) }));
vi.mock('@/hooks/useSiteBranding', () => ({ useSiteBranding: () => ({ platformName: 'InitOption', logoUrl: null }) }));
vi.mock('@/contexts/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', formatMoney: (value: number) => `$${value.toFixed(2)}` }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ unreadCount: 0 }) }));
vi.mock('@/contexts/DynamicAssetContext', () => ({ useDynamicAssets: () => ({ getAsset: () => undefined }) }));
vi.mock('@/components/notifications/NotificationBell', () => ({ NotificationBell: () => <button>Notifications</button> }));
vi.mock('@/components/trading/AccountModals', () => ({ AccountDropdown: () => <div>Account options</div> }));
vi.mock('@/components/trading/AssetSymbolMark', () => ({ default: ({symbol}: {symbol:string}) => <span aria-hidden="true">{symbol.slice(0,2)}</span> }));
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const eur = { symbol:'EUR/USD', type:'OTC' as const, name:'Euro / US Dollar', basePrice:1.1, icon:'', flags:[], maxProfit:92, price:1.1, change:0 };
const gbp = { ...eur, symbol:'GBP/CHF', name:'Pound / Franc', maxProfit:89 };
describe('compact trading dashboard controls', () => {
  it('preserves branding, balance, account, funding and navigation actions in the compact header', () => {
    const toggle=vi.fn(),deposit=vi.fn(),withdraw=vi.fn();
    render(<MemoryRouter><TradingHeader balance={10} demoBalance={457} accountType="demo" openTabs={[]} onRemoveTab={vi.fn()} onAddAssetClick={vi.fn()} onSwitchAccount={vi.fn()} onOpenDeposit={deposit} onOpenWithdrawal={withdraw} onOpenProfile={vi.fn()} onUpdateDemoBalance={vi.fn()} onResetDemoBalance={vi.fn()} onOpenSettings={vi.fn()} onOpenHistory={vi.fn()} onToggleNavigation={toggle} navigationExpanded /></MemoryRouter>);
    expect(screen.getByRole('link').textContent).toContain('InitOption');
    expect(screen.getAllByText('$457.00')).toHaveLength(2); // responsive desktop and mobile controls
    const menu=screen.getByRole('button',{name:'Toggle navigation'});
    expect(menu.getAttribute('aria-expanded')).toBe('true');fireEvent.click(menu);expect(toggle).toHaveBeenCalledOnce();
    fireEvent.click(screen.getAllByRole('button',{name:'Deposit'})[0]);expect(deposit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button',{name:'Withdrawal'}));expect(withdraw).toHaveBeenCalledOnce();
    fireEvent.click(screen.getAllByRole('button',{name:/DEMO ACCOUNT/})[0]);expect(screen.getAllByText('Account options')).toHaveLength(2);
  });
  it('keeps all workspace destinations available when the menu toggle moves to the header', () => {
    const select=vi.fn();
    render(<NavigationSidebar activeWorkspace={null} onSelectWorkspace={select} showMenuButton={false} />);
    expect(screen.queryByRole('button',{name:/Collapse navigation/})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Support'}));expect(select).toHaveBeenLastCalledWith('support');
    fireEvent.click(screen.getByRole('button',{name:'Trade'}));expect(select).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole('button',{name:'Settings'})).toBeTruthy();
  });
  it('separates the right order form and scrollable history without losing controls or unavailable-asset protection', () => {
    const {container}=render(<TradingPanel asset={{symbol:'EUR/USD',price:1.1,maxProfit:92,available:false}} demoBalance={457} accountType="demo" onDemoBalanceChange={vi.fn()} activeTradesOverride={[]} tradeHistoryOverride={[]} />);
    const form=container.querySelector('.trading-order-form')!;
    const history=container.querySelector('.trading-history-card')!;
    expect(form.parentElement).toBe(history.parentElement);
    expect(form.contains(screen.getByRole('button',{name:/Buy/}))).toBe(true);
    expect(screen.getByRole('button',{name:/Buy/}).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button',{name:/Sell/}).hasAttribute('disabled')).toBe(true);
    const tabs=history.querySelectorAll('.trading-history-tabs > button');
    expect(tabs[0].getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(tabs[1]);expect(tabs[1].getAttribute('aria-pressed')).toBe('true');
  });
  it('keeps compact asset tabs selectable, closable and keyboard-accessible without losing payouts', () => {
    const select=vi.fn(),remove=vi.fn(),add=vi.fn();
    render(<AssetInfo asset={eur} onSelectAsset={vi.fn()} onOpenSelector={add} onAddAssetClick={add} openTabs={[eur,gbp]} activeTabId={eur.symbol} onSelectTab={select} onRemoveTab={remove} />);
    const tab=screen.getByRole('button',{name:/EUR\/USD \(OTC\).*92%/});
    expect(tab.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button',{name:/GBP\/CHF \(OTC\).*89%/}));expect(select).toHaveBeenCalledWith('GBP/CHF');
    fireEvent.click(screen.getByRole('button',{name:'Close GBP/CHF (OTC)'}));expect(remove).toHaveBeenCalledWith('GBP/CHF');expect(select).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('Add asset pair'));expect(add).toHaveBeenCalledOnce();
  });
});
