// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AssetManagement from '@/pages/admin/AssetManagement';

const calls = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock('@/integrations/api/client', () => ({ api: { from: calls.from } }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/components/trading/AssetSymbolMark', () => ({ default: () => null }));
vi.mock('@/data/assetsLibrary', () => ({ ASSETS_LIBRARY: [
  { symbol: 'EUR/USD', name: 'Euro Dollar', category: 'CURRENCIES' },
  { symbol: 'BTC/USD', name: 'Bitcoin', category: 'CRYPTO' },
] }));

beforeEach(() => {
  vi.clearAllMocks();
  calls.select.mockResolvedValue({ data: [{ id: '1', symbol: 'EUR/USD', status: 'active', payout_pct: 80 }], error: null });
  calls.eq.mockResolvedValue({ error: null });
  calls.update.mockReturnValue({ eq: calls.eq });
  calls.from.mockReturnValue({ select: calls.select, update: calls.update });
});
afterEach(cleanup);

describe('Asset Library', () => {
  it('shows the asset library without the removed collection controls or requests', async () => {
    render(<AssetManagement />);
    expect(await screen.findByText('Euro Dollar')).toBeTruthy();
    expect(screen.queryByText('Background history collection')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Run one cycle' })).toBeNull();
    expect(calls.from).toHaveBeenCalledTimes(1);
    expect(calls.from).toHaveBeenCalledWith('assets_config');
    fireEvent.change(screen.getByPlaceholderText('Search by symbol or name...'), { target: { value: 'Bitcoin' } });
    expect(screen.queryByText('Euro Dollar')).toBeNull();
    expect(screen.getByText('Bitcoin')).toBeTruthy();
  });
  it('keeps asset status management working', async () => {
    render(<AssetManagement />);
    await screen.findByText('Euro Dollar');
    const row = screen.getByText('Euro Dollar').closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Disable Asset' }));
    await waitFor(() => expect(calls.update).toHaveBeenCalledWith({ status: 'inactive' }));
    expect(calls.eq).toHaveBeenCalledWith('id', '1');
  });
});
