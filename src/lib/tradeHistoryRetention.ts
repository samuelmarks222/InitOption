export const TRADE_HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000;

type TradeHistoryLike = {
  closed_at?: string | null;
  opened_at?: string | null;
};

const getTradeHistoryTimestamp = ({ closed_at, opened_at }: TradeHistoryLike) => {
  const timestamp = Date.parse(closed_at ?? opened_at ?? "");
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
};

export const getTradeHistoryCutoffIso = (now = Date.now()) =>
  new Date(now - TRADE_HISTORY_RETENTION_MS).toISOString();

export const isTradeHistoryEntryRetained = (trade: TradeHistoryLike, now = Date.now()) => {
  const timestamp = getTradeHistoryTimestamp(trade);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return now - timestamp <= TRADE_HISTORY_RETENTION_MS;
};

export const filterRetainedTradeHistory = <T extends TradeHistoryLike>(trades: T[], now = Date.now()) =>
  trades.filter((trade) => isTradeHistoryEntryRetained(trade, now));
