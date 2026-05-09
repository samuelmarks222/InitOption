import { useEffect, useMemo, useState } from "react";
import { useTrading } from "@/hooks/useTrading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { getEffectiveLiveBalance } from "@/lib/live-balance";

export type TransactionType = "deposit" | "withdrawal" | "bonus" | "trade";

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  description: string;
  amount: number;
  balanceAfter: number;
  status?: "approved" | "completed" | "failed" | "pending" | "processing" | "rejected";
}

export interface Trade {
  id: string;
  asset: string;
  direction: "Buy" | "Sell" | "Higher" | "Lower";
  amount: number;
  payout: number;
  profit: number; 
  openTime: string;
  closeTime: string;
}

interface AssetPerformanceEntry {
  asset: string;
  best: number;
  losses: number;
  profit: number;
  trades: number;
  volume: number;
  wins: number;
  worst: number;
}

type WithdrawalRequest = Tables<"withdrawal_requests">;
type DepositRequest = Tables<"deposit_requests">;
type TransactionSeed = Omit<Transaction, "balanceAfter"> & {
  balanceImpact: number;
};

const getTimestamp = (value: string) => new Date(value).getTime();

export const useStatistics = () => {
  const { tradeHistory } = useTrading();
  const { profile } = useAuth();
  const currentBalance = getEffectiveLiveBalance(profile);
  const totalDeposits = Number(profile?.total_deposit ?? 0);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    if (!profile?.id) {
      setDeposits([]);
      return;
    }

    let cancelled = false;

    const loadDeposits = async () => {
      const { data, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (!cancelled && !error) {
        setDeposits(data ?? []);
      }
    };

    void loadDeposits();

    const channel = supabase
      .channel(`statistics-deposits-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deposit_requests", filter: `user_id=eq.${profile.id}` },
        () => {
          void loadDeposits();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) {
      setWithdrawals([]);
      return;
    }

    let cancelled = false;

    const loadWithdrawals = async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (!cancelled && !error) {
        setWithdrawals(data ?? []);
      }
    };

    void loadWithdrawals();

    const channel = supabase
      .channel(`statistics-withdrawals-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawal_requests", filter: `user_id=eq.${profile.id}` },
        () => {
          void loadWithdrawals();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);
  
  // Real-time parsed trades from Supabase history
  const trades = useMemo<Trade[]>(() => {
    return tradeHistory.map(t => ({
      id: t.id,
      asset: t.asset_symbol,
      direction: t.direction === 'higher' ? 'Buy' : 'Sell',
      amount: t.amount,
      payout: t.profit > 0 ? t.amount + t.profit : 0,
      profit: t.profit,
      openTime: t.opened_at,
      closeTime: t.closed_at
    }));
  }, [tradeHistory]);

  const ledgerEntries = useMemo<TransactionSeed[]>(() => {
    const depositEntries = deposits.flatMap((request) => {
      const requestedAmount = Number(request.amount ?? 0);
      if (!requestedAmount) return [];

      const methodName = request.method || "Deposit";
      const isMobileMoneyDeposit = request.provider_name === "sasapay";

      if (request.status === "approved") {
        const creditedAmount = Number(request.credited_amount ?? 0) || requestedAmount;

        return [
          {
            id: `DEP-${request.id}-approved`,
            date: request.processed_at ?? request.created_at,
            type: "deposit" as const,
            description: `Deposit approved - ${methodName}`,
            amount: creditedAmount,
            balanceImpact: creditedAmount,
            status: "approved" as const,
          },
        ];
      }

      if (request.status === "rejected") {
        return [
          {
            id: `DEP-${request.id}-rejected`,
            date: request.processed_at ?? request.created_at,
            type: "deposit" as const,
            description: `Deposit rejected - ${methodName}`,
            amount: 0,
            balanceImpact: 0,
            status: "rejected" as const,
          },
        ];
      }

      return [
        {
          id: `DEP-${request.id}-pending`,
          date: request.created_at,
          type: "deposit" as const,
          description: isMobileMoneyDeposit
            ? `Deposit pending mobile money confirmation - ${methodName}`
            : `Deposit pending admin review - ${methodName}`,
          amount: requestedAmount,
          balanceImpact: 0,
          status: "pending" as const,
        },
      ];
    });

    const tradeEntries = trades.map((trade) => ({
      id: `TXN-${trade.id}`,
      date: trade.closeTime,
      type: "trade" as const,
      description: `Trade ${trade.profit > 0 ? "Win" : "Loss"} - ${trade.asset}`,
      amount: trade.profit,
      balanceImpact: trade.profit,
    }));

    const withdrawalEntries = withdrawals.flatMap((request) => {
      const amount = Number(request.amount ?? 0);
      if (!amount || !request.created_at) return [];

      const methodName = request.method || "Withdrawal";
      const isMobileMoneyWithdrawal = request.provider_name === "sasapay";

      if (isMobileMoneyWithdrawal) {
        if (request.status === "completed") {
          return [
            {
              id: `WD-${request.id}-completed`,
              date: request.completed_at ?? request.processed_at ?? request.created_at,
              type: "withdrawal" as const,
              description: `Withdrawal completed - ${methodName}`,
              amount: -amount,
              balanceImpact: -amount,
              status: "completed" as const,
            },
          ];
        }

        if (request.status === "failed" || request.status === "rejected") {
          return [
            {
              id: `WD-${request.id}-${request.status}`,
              date: request.processed_at ?? request.updated_at ?? request.created_at,
              type: "withdrawal" as const,
              description: `Withdrawal ${request.status} - ${methodName}`,
              amount: 0,
              balanceImpact: 0,
              status: request.status,
            },
          ];
        }

        return [
          {
            id: `WD-${request.id}-${request.status}`,
            date: request.created_at,
            type: "withdrawal" as const,
            description:
              request.status === "processing"
                ? `Withdrawal processing - ${methodName}`
                : request.status === "approved"
                  ? `Withdrawal approved - ${methodName}`
                  : `Withdrawal pending approval - ${methodName}`,
            amount: amount,
            balanceImpact: 0,
            status: (request.status as "approved" | "pending" | "processing"),
          },
        ];
      }

      const entries: TransactionSeed[] = [
        {
          id: `WD-${request.id}-request`,
          date: request.created_at,
          type: "withdrawal",
          description:
            request.status === "pending"
              ? isMobileMoneyWithdrawal
                ? `Withdrawal pending mobile money payout - ${methodName}`
                : `Withdrawal pending - ${methodName}`
              : `Withdrawal submitted - ${methodName}`,
          amount: -amount,
          balanceImpact: -amount,
        },
      ];

      if (request.status === "rejected" && request.processed_at) {
        entries.push({
          id: `WD-${request.id}-refund`,
          date: request.processed_at,
          type: "withdrawal",
          description: `Withdrawal refund - ${methodName}`,
          amount,
          balanceImpact: amount,
        });
      }

      return entries;
    });

    return [...depositEntries, ...tradeEntries, ...withdrawalEntries].sort(
      (left, right) => getTimestamp(right.date) - getTimestamp(left.date),
    );
  }, [deposits, trades, withdrawals]);

  const transactions = useMemo<Transaction[]>(() => {
    let runningBalance = currentBalance;
    return ledgerEntries.map((entry) => {
      const tx = {
        ...entry,
        balanceAfter: runningBalance,
      };
      runningBalance -= entry.balanceImpact;
      return tx;
    });
  }, [currentBalance, ledgerEntries]);

  const tradeStats = useMemo(() => {
    const totalTrades = trades.length;
    let wins = 0;
    let losses = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let bestTrade = 0;
    let worstTrade = 0;

    trades.forEach(t => {
      if (t.profit > 0) {
        wins++;
        grossProfit += t.profit;
        if (t.profit > bestTrade) bestTrade = t.profit;
      } else {
        losses++;
        grossLoss += Math.abs(t.profit);
        if (t.profit < worstTrade) worstTrade = t.profit;
      }
    });

    const totalProfit = grossProfit - grossLoss;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const lossRate = 100 - winRate;
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 999 : 0);
    const averageReturn = totalTrades > 0 ? totalProfit / totalTrades : 0;
    
    const avgWin = wins > 0 ? grossProfit / wins : 0;
    const avgLoss = losses > 0 ? grossLoss / losses : 0;
    const expectancy = (avgWin * (winRate/100)) - (avgLoss * (lossRate/100));

    // Calculate Max Drawdown
    const forwardTrades = [...trades].reverse();
    let forwardBal = Math.max(0, currentBalance - totalProfit);
    let maxDrawdown = 0;
    let currentPeak = forwardBal;

    forwardTrades.forEach(t => {
      forwardBal += t.profit;
      if (forwardBal > currentPeak) {
        currentPeak = forwardBal;
      }
      const drawdown = currentPeak - forwardBal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // Sharpe Ratio Approximation (Standard Deviation logic)
    let sumSq = 0;
    trades.forEach(t => {
      sumSq += Math.pow(t.profit - averageReturn, 2);
    });
    const stdDev = totalTrades > 1 ? Math.sqrt(sumSq / (totalTrades - 1)) : 0;
    const sharpeRatio = stdDev > 0 ? (averageReturn / stdDev) * Math.sqrt(252) : 0; // 252 annualized approx

    // Streaks
    let currentWinStreak = 0;
    let maxWinStreak = 0;
    let currentLossStreak = 0;
    let maxLossStreak = 0;
    
    forwardTrades.forEach(t => {
      if (t.profit > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      }
    });

    // VaR (95% historical) - 5th percentile of returns
    const sortedReturns = [...trades].map(t => t.profit).sort((a,b) => a-b);
    const var95Index = Math.floor(sortedReturns.length * 0.05);
    const var95 = sortedReturns.length > 0 ? sortedReturns[var95Index] : 0;

    const recoveryFactor = maxDrawdown > 0 ? totalProfit / maxDrawdown : (totalProfit > 0 ? 999 : 0);

    return {
      totalTrades, wins, losses, winRate: Math.round(winRate), totalProfit,
      grossProfit, grossLoss, profitFactor, averageReturn,
      bestTrade, worstTrade, expectancy, maxDrawdown,
      sharpeRatio, maxWinStreak, maxLossStreak, var95,
      recoveryFactor, avgWin, avgLoss
    };
  }, [currentBalance, trades]);

  const balanceStats = {
    totalDeposits,
    totalWithdrawals: withdrawals
      .filter((request) =>
        request.provider_name === "sasapay"
          ? request.status === "completed"
          : request.status !== "rejected",
      )
      .reduce((sum, request) => sum + Number(request.amount ?? 0), 0),
    netDeposit:
      totalDeposits -
      withdrawals
        .filter((request) =>
          request.provider_name === "sasapay"
            ? request.status === "completed"
            : request.status !== "rejected",
        )
        .reduce((sum, request) => sum + Number(request.amount ?? 0), 0),
    totalTradeVolume: trades.reduce((acc, t) => acc + t.amount, 0),
    currentBalance
  };

  const equityCurve = useMemo(() => {
    const startingBalance = ledgerEntries.reduce((balance, entry) => balance - entry.balanceImpact, currentBalance);
    let forwardBal = startingBalance;
    let currentPeak = forwardBal;
    
    // Add an initial starting point
    const curve = [{
      date: "Start",
      fullDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      balance: forwardBal,
      drawdown: 0,
      profit: 0
    }];

    [...ledgerEntries]
      .sort((left, right) => getTimestamp(left.date) - getTimestamp(right.date))
      .forEach((entry) => {
      forwardBal += entry.balanceImpact;
      if (forwardBal > currentPeak) currentPeak = forwardBal;
      const drawdown = currentPeak > 0 ? ((currentPeak - forwardBal) / currentPeak) * 100 : 0; 
      
      const dateLabel = new Date(entry.date).toLocaleTimeString(undefined, { hour: '2-digit', minute:'2-digit' });
      
      curve.push({
        date: dateLabel,
        fullDate: entry.date,
        balance: forwardBal,
        drawdown: parseFloat(drawdown.toFixed(2)),
        profit: entry.balanceImpact
      });
    });
    
    return curve;
  }, [currentBalance, ledgerEntries]);

  const assetPerformance = useMemo(() => {
    const assets: Record<string, AssetPerformanceEntry> = {};
    trades.forEach(t => {
      if (!assets[t.asset]) {
        assets[t.asset] = { asset: t.asset, trades: 0, wins: 0, profit: 0, best: 0, worst: 0, volume: 0, losses: 0 };
      }
      assets[t.asset].trades++;
      if (t.profit > 0) {
        assets[t.asset].wins++;
      } else {
        assets[t.asset].losses++;
      }
      assets[t.asset].profit += t.profit;
      assets[t.asset].volume += t.amount;
      if (t.profit > assets[t.asset].best) assets[t.asset].best = t.profit;
      if (t.profit < assets[t.asset].worst) assets[t.asset].worst = t.profit;
    });
    
    return Object.values(assets).map(a => ({
      ...a,
      winRate: Math.round((a.wins / a.trades) * 100),
      avgReturn: a.profit / a.trades
    })).sort((a,b) => b.profit - a.profit);
  }, [trades]);

  const addTransaction = () => {};
  const addTrade = () => {};

  return {
    trades,
    transactions,
    tradeStats,
    balanceStats,
    equityCurve,
    assetPerformance,
    addTransaction,
    addTrade
  };
};
