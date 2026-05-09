import type { ActiveTrade } from "@/hooks/useTrading";

const POSITION_EPSILON = 0.000_001;

export const isTradeCurrentlyWinning = (trade: ActiveTrade, currentPrice: number) =>
  trade.direction === "higher" ? currentPrice > trade.entry_price : currentPrice < trade.entry_price;

export const calculateLiveTradeResult = (trade: ActiveTrade, currentPrice: number) =>
  isTradeCurrentlyWinning(trade, currentPrice) ? trade.amount * trade.payout_rate : -trade.amount;

export const getLiveAssetTradeSummary = (trades: ActiveTrade[], currentPrice: number) => {
  const nextExpiringTrade = trades.reduce<ActiveTrade | null>((soonestTrade, trade) => {
    if (!soonestTrade) {
      return trade;
    }

    return trade.timeLeft < soonestTrade.timeLeft ? trade : soonestTrade;
  }, null);

  const totalLiveResult = trades.reduce(
    (runningTotal, trade) => runningTotal + calculateLiveTradeResult(trade, currentPrice),
    0,
  );

  const netState =
    totalLiveResult > POSITION_EPSILON ? "positive" : totalLiveResult < -POSITION_EPSILON ? "negative" : "neutral";

  return {
    nextExpiringTrade,
    totalLiveResult,
    tradeCount: trades.length,
    netState,
  };
};
