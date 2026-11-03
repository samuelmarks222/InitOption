import type { TradeSettlement } from '@/hooks/useTrading';
export interface WinningNotification {
  id: string;
  asset: string;
  direction: 'UP' | 'DOWN';
  investment: number;
  profit: number;
  payout: number;
  style: 'standard' | 'big';
}
export const DEFAULT_BIG_WIN_THRESHOLD = 500;
export function winningNotification(trade: TradeSettlement, threshold = DEFAULT_BIG_WIN_THRESHOLD): WinningNotification | null {
  // `profit` in the settlement schema is the gross return, including principal.
  if (trade.status !== 'won' || !trade.settled_at || !Number.isFinite(Date.parse(trade.settled_at))
    || !Number.isFinite(trade.amount) || trade.amount <= 0 || !Number.isFinite(trade.profit)
    || trade.profit <= trade.amount || !trade.id || !trade.asset_symbol
    || !['higher','lower'].includes(trade.direction)) return null;
  const profit = Math.round((trade.profit - trade.amount) * 1e8) / 1e8;
  const safeThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : DEFAULT_BIG_WIN_THRESHOLD;
  return { id: trade.id, asset: trade.asset_symbol, direction: trade.direction === 'higher' ? 'UP' : 'DOWN',
    investment: trade.amount, profit, payout: trade.profit, style: profit >= safeThreshold ? 'big' : 'standard' };
}

/** Only a successfully persisted settlement row may enter the result UI. */
export function confirmedSettlement(row: Record<string, unknown> | null, trade: { id: string; marker_time?: number; marker_logical?: number }): TradeSettlement | null {
  if (!row || row.id !== trade.id || !['won','lost'].includes(String(row.status))) return null;
  const amount = Number(row.amount), payout = Number(row.profit);
  if (!Number.isFinite(amount) || amount <= 0 || row.profit === null || !Number.isFinite(payout) || payout < 0
    || !row.closed_at || !Number.isFinite(Date.parse(String(row.closed_at)))
    || !['higher','lower'].includes(String(row.direction)) || typeof row.asset_symbol !== 'string') return null;
  return { id: trade.id, asset_symbol: row.asset_symbol, direction: row.direction as 'higher' | 'lower', amount,
    entry_price: Number(row.entry_price), exit_price: Number(row.exit_price), expiry_seconds: Number(row.expiry_seconds),
    payout_rate: Number(row.payout_rate), profit: payout, status: row.status as 'won' | 'lost', settled_at: String(row.closed_at),
    marker_time: trade.marker_time ?? null, marker_logical: trade.marker_logical ?? null,
    expiry_time: typeof trade.marker_time === 'number' ? trade.marker_time + Number(row.expiry_seconds) : null };
}
