import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useVip } from "@/contexts/VipContext";
import { toast } from "@/hooks/use-toast";
import { getEffectiveLiveBalance, hasFundedLiveAccount } from "@/lib/live-balance";

export type TradeDirection = "higher" | "lower";
export type TradeHistoryEntry = Tables<"trades">;
export type OpenTradeHandler = (
  assetSymbol: string,
  direction: TradeDirection,
  amount: number,
  entryPrice: number,
  expirySeconds: number,
  payoutRate?: number
) => Promise<boolean>;

export interface ActiveTrade {
  id: string;
  asset_symbol: string;
  direction: TradeDirection;
  amount: number;
  entry_price: number;
  marker_time?: number;
  expiry_seconds: number;
  payout_rate: number;
  opened_at: string;
  timeLeft: number;
  tournament_participant_id?: string | null;
}

export interface TradeSettlement {
  id: string;
  asset_symbol: string;
  direction: TradeDirection;
  amount: number;
  entry_price: number;
  exit_price: number;
  expiry_seconds: number;
  payout_rate: number;
  profit: number;
  status: "won" | "lost";
  settled_at: string;
}

interface TradingContextValue {
  activeTrades: ActiveTrade[];
  tradeHistory: TradeHistoryEntry[];
  latestSettlement: TradeSettlement | null;
  tournamentParticipantId: string | null;
  setTournamentParticipantId: (id: string | null) => void;
  clearLatestSettlement: () => void;
  openTrade: OpenTradeHandler;
  setCurrentPrice: (price: number, markerTime?: number) => void;
}

const TradingContext = createContext<TradingContextValue | null>(null);

const requestDepositGuide = (reason: "deposit_required" | "insufficient_balance") => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("trade_deposit_guide_requested", {
      detail: { reason },
    }),
  );
};

export const TradingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, refreshProfile } = useAuth();
  const { refreshVip } = useVip();
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryEntry[]>([]);
  const [latestSettlement, setLatestSettlement] = useState<TradeSettlement | null>(null);
  const [tournamentParticipantId, setTournamentParticipantId] = useState<string | null>(null);
  const currentPriceRef = useRef<number>(0);
  const currentMarkerTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tournamentParticipantIdRef = useRef<string | null>(null);

  useEffect(() => {
    tournamentParticipantIdRef.current = tournamentParticipantId;
  }, [tournamentParticipantId]);

  const setCurrentPrice = useCallback((price: number, markerTime?: number) => {
    currentPriceRef.current = price;
    if (typeof markerTime === "number" && Number.isFinite(markerTime)) {
      currentMarkerTimeRef.current = markerTime;
    }
  }, []);

  const clearLatestSettlement = useCallback(() => {
    setLatestSettlement(null);
  }, []);

  useEffect(() => {
    if (!user) {
      setActiveTrades([]);
      setTradeHistory([]);
      setLatestSettlement(null);
      return;
    }

    const loadTrades = async () => {
      const [{ data: historyData }, { data: openData }] = await Promise.all([
        supabase
          .from("trades")
          .select("*")
          .eq("user_id", user.id)
          .neq("status", "open")
          .order("closed_at", { ascending: false })
          .limit(50),
        supabase
          .from("trades")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "open")
          .order("opened_at", { ascending: false }),
      ]);

      if (historyData) {
        setTradeHistory(historyData);
      }

      if (openData) {
        const restoredActiveTrades: ActiveTrade[] = openData.map((trade) => {
          const elapsed = (Date.now() - new Date(trade.opened_at).getTime()) / 1000;
          const timeLeft = Math.max(0, trade.expiry_seconds - elapsed);

          return {
            ...trade,
            marker_time: Math.floor(new Date(trade.opened_at).getTime() / 1000),
            timeLeft,
            tournament_participant_id: trade.tournament_participant_id ?? null,
          };
        });

        setActiveTrades(restoredActiveTrades);
      }
    };

    void loadTrades();
  }, [user]);

  const resolveTrade = useCallback(async (trade: ActiveTrade) => {
    const exitPrice = currentPriceRef.current;
    const won =
      (trade.direction === "higher" && exitPrice > trade.entry_price) ||
      (trade.direction === "lower" && exitPrice < trade.entry_price);

    const profit = won ? trade.amount * trade.payout_rate : -trade.amount;
    const status: "won" | "lost" = won ? "won" : "lost";
    const settledAt = new Date().toISOString();

    await supabase
      .from("trades")
      .update({
        exit_price: exitPrice,
        status,
        profit,
        closed_at: settledAt,
      })
      .eq("id", trade.id);

    try {
      await supabase.rpc("process_trade_referral_commission", {
        p_trade_id: trade.id,
        p_event: "trade_close",
      });
    } catch {
      // Ignore referral commission failures so trade resolution never blocks.
    }

    const participantId = trade.tournament_participant_id;
    if (participantId) {
      const { data: participant } = await supabase
        .from("tournament_participants")
        .select("current_balance")
        .eq("id", participantId)
        .single();

      if (participant) {
        const newTournamentBalance = won
          ? participant.current_balance + trade.amount + trade.amount * trade.payout_rate
          : participant.current_balance;

        await supabase
          .from("tournament_participants")
          .update({
            current_balance: newTournamentBalance,
            updated_at: settledAt,
          })
          .eq("id", participantId);
      }
    } else if (user && profile) {
      const fundedLiveAccount = hasFundedLiveAccount(profile);
      const liveBalance = getEffectiveLiveBalance(profile);
      const newBalance = fundedLiveAccount && won ? liveBalance + trade.amount + trade.amount * trade.payout_rate : liveBalance;

      await supabase
        .from("profiles")
        .update({
          balance: newBalance,
          total_trades: profile.total_trades + (fundedLiveAccount ? 1 : 0),
          total_wins: profile.total_wins + (fundedLiveAccount && won ? 1 : 0),
          total_profit: profile.total_profit + (fundedLiveAccount ? profit : 0),
          updated_at: settledAt,
        })
        .eq("id", user.id);

      void refreshProfile();
      void refreshVip();
    }

    setLatestSettlement({
      id: trade.id,
      asset_symbol: trade.asset_symbol,
      direction: trade.direction,
      amount: trade.amount,
      entry_price: trade.entry_price,
      exit_price: exitPrice,
      expiry_seconds: trade.expiry_seconds,
      payout_rate: trade.payout_rate,
      profit,
      status,
      settled_at: settledAt,
    });

    if (user) {
      const { data } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "open")
        .order("closed_at", { ascending: false })
        .limit(50);

      if (data) {
        setTradeHistory(data);
      }
    }
  }, [profile, refreshProfile, refreshVip, user]);

  useEffect(() => {
    if (activeTrades.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setActiveTrades((prev) => {
        const updated: ActiveTrade[] = [];
        const expired: ActiveTrade[] = [];
        const canResolveTrades = currentPriceRef.current > 0;

        prev.forEach((trade) => {
          const elapsed = (Date.now() - new Date(trade.opened_at).getTime()) / 1000;
          const timeLeft = Math.max(0, trade.expiry_seconds - elapsed);

          if (timeLeft <= 0) {
            if (canResolveTrades) {
              expired.push({ ...trade, timeLeft: 0 });
            } else {
              updated.push({ ...trade, timeLeft: 0 });
            }
          } else {
            updated.push({ ...trade, timeLeft });
          }
        });

        expired.forEach((trade) => {
          void resolveTrade(trade);
        });

        return updated;
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeTrades.length, resolveTrade]);

  const openTrade = useCallback(
    async (
      assetSymbol: string,
      direction: "higher" | "lower",
      amount: number,
      entryPrice: number,
      expirySeconds: number,
      payoutRate: number = 0.86
    ) => {
      if (!user || !profile) {
        toast({ title: "Please log in to trade", variant: "destructive" });
        return false;
      }

      const activePid = tournamentParticipantIdRef.current;
      const actualEntryPrice = currentPriceRef.current > 0 ? currentPriceRef.current : entryPrice;
      const openedAt = new Date().toISOString();
      const markerTime = currentMarkerTimeRef.current ?? Math.floor(new Date(openedAt).getTime() / 1000);
      const optimisticId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const optimisticTrade: ActiveTrade = {
        id: optimisticId,
        asset_symbol: assetSymbol,
        direction,
        amount,
        entry_price: actualEntryPrice,
        marker_time: markerTime,
        expiry_seconds: expirySeconds,
        payout_rate: payoutRate,
        opened_at: openedAt,
        timeLeft: expirySeconds,
        tournament_participant_id: activePid ?? null,
      };

      if (activePid) {
        const { data: participant } = await supabase
          .from("tournament_participants")
          .select("current_balance")
          .eq("id", activePid)
          .single();

        if (!participant || participant.current_balance < amount) {
          toast({
            title: "Insufficient tournament balance",
            description: "Your arena balance is too low.",
            variant: "destructive",
          });
          return false;
        }

        const { error: tournamentBalanceError } = await supabase
          .from("tournament_participants")
          .update({
            current_balance: participant.current_balance - amount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", activePid);

        if (tournamentBalanceError) {
          toast({ title: "Trade failed", description: tournamentBalanceError.message, variant: "destructive" });
          return false;
        }
      } else {
        const liveBalance = getEffectiveLiveBalance(profile);

        if (!hasFundedLiveAccount(profile)) {
          requestDepositGuide("deposit_required");
          return false;
        }

        if (amount > liveBalance) {
          requestDepositGuide("insufficient_balance");
          return false;
        }

        if (amount <= 0) {
          toast({ title: "Invalid amount", variant: "destructive" });
          return false;
        }

        const { error: balanceError } = await supabase
          .from("profiles")
          .update({ balance: liveBalance - amount })
          .eq("id", user.id);

        if (balanceError) {
          toast({ title: "Trade failed", description: balanceError.message, variant: "destructive" });
          return false;
        }
      }

      setActiveTrades((prev) => [...prev, optimisticTrade]);

      const { data, error } = await supabase
        .from("trades")
        .insert({
          user_id: user.id,
          asset_symbol: assetSymbol,
          direction,
          amount,
          entry_price: actualEntryPrice,
          expiry_seconds: expirySeconds,
          payout_rate: payoutRate,
          status: "open",
          opened_at: openedAt,
          tournament_participant_id: activePid ?? null,
        })
        .select()
        .single();

      if (error) {
        setActiveTrades((prev) => prev.filter((trade) => trade.id !== optimisticId));
        toast({ title: "Trade failed", description: error.message, variant: "destructive" });
        return false;
      }

      try {
        await supabase.rpc("process_trade_referral_commission", {
          p_trade_id: data.id,
          p_event: "trade_open",
        });
      } catch {
        // Ignore referral commission failures so trade placement never blocks.
      }

      await refreshProfile();
      await refreshVip();

      setActiveTrades((prev) =>
        prev.map((trade) =>
          trade.id === optimisticId
            ? {
                ...data,
                marker_time: markerTime,
                timeLeft: Math.max(0, expirySeconds - (Date.now() - new Date(openedAt).getTime()) / 1000),
                tournament_participant_id: activePid ?? null,
              }
            : trade
        )
      );

      return true;
    },
    [profile, refreshProfile, refreshVip, user]
  );

  const value = {
    activeTrades,
    tradeHistory,
    latestSettlement,
    tournamentParticipantId,
    setTournamentParticipantId,
    clearLatestSettlement,
    openTrade,
    setCurrentPrice,
  };

  return React.createElement(TradingContext.Provider, { value }, children);
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error("useTrading must be used within a TradingProvider");
  }
  return context;
};
