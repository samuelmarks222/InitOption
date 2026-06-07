import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useVip } from "@/contexts/VipContext";
import { toast } from "@/hooks/use-toast";
import {
  getAvailableLiveBalanceForTrading,
  getEffectiveLiveBalance,
  getReservedWithdrawalBalance,
  getStoredLiveBalance,
  getStoredLiveBalanceAfterPendingTrade,
  getStoredLiveBalanceAfterSettlementCredit,
  hasFundedLiveAccount,
} from "@/lib/live-balance";
import { insertTradeBalanceAudit } from "@/lib/tradeBalanceAudit";
import { filterRetainedTradeHistory, getTradeHistoryCutoffIso } from "@/lib/tradeHistoryRetention";
import { resolveFreshTradeMarkerTime } from "@/lib/tradeMarkerTime";
import { buildTradeInsertPayload } from "@/lib/tradePersistence";
import {
  clearStoredTradeMarkerTime,
  getStoredTradeMarkerLogical,
  getStoredTradeMarkerTime,
  setStoredTradeMarkerSnapshot,
} from "@/lib/tradeMarkerCache";
import { playTradeCloseSound, playTradeOpenSound } from "@/lib/tradeSounds";

export type TradeDirection = "higher" | "lower";
export type TradeHistoryEntry = Tables<"trades">;
export type OpenTradeHandler = (
  assetSymbol: string,
  direction: TradeDirection,
  amount: number,
  entryPrice: number,
  expirySeconds: number,
  payoutRate?: number,
  markerTimeOverride?: number | null,
  markerLogicalOverride?: number | null,
  timeframeSecondsOverride?: number | null,
) => Promise<boolean>;

export interface ActiveTrade {
  id: string;
  asset_symbol: string;
  direction: TradeDirection;
  amount: number;
  entry_price: number;
  marker_time?: number;
  marker_logical?: number;
  expiry_seconds: number;
  payout_rate: number;
  opened_at: string;
  timeLeft: number;
  tournament_participant_id?: string | null;
  showSettlementOverlay?: boolean;
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
const supabaseAny = supabase as any;

const requestDepositGuide = (reason: "deposit_required" | "insufficient_balance") => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("trade_deposit_guide_requested", {
      detail: { reason },
    }),
  );
};

const describeTradeInsertError = (message: string, isTournamentTrade: boolean, balanceRestored: boolean) => {
  if (isTournamentTrade && message.includes("tournament_participant_id")) {
    return balanceRestored
      ? "Tournament trading is missing the latest database update. Your tournament balance was restored."
      : "Tournament trading is missing the latest database update. Please review the latest migration before trading again.";
  }

  return balanceRestored ? `${message} Your balance was restored.` : message;
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
  const pendingLiveBalanceRef = useRef(0);
  const pendingTournamentBalanceRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    tournamentParticipantIdRef.current = tournamentParticipantId;
  }, [tournamentParticipantId]);

  const reserveLiveBalance = useCallback((amount: number) => {
    pendingLiveBalanceRef.current += Math.max(0, amount);
  }, []);

  const releaseLiveBalance = useCallback((amount: number) => {
    pendingLiveBalanceRef.current = Math.max(0, pendingLiveBalanceRef.current - Math.max(0, amount));
  }, []);

  const getReservedTournamentBalance = useCallback((participantId: string) => {
    return pendingTournamentBalanceRef.current.get(participantId) ?? 0;
  }, []);

  const reserveTournamentBalance = useCallback((participantId: string, amount: number) => {
    const currentReserved = pendingTournamentBalanceRef.current.get(participantId) ?? 0;
    pendingTournamentBalanceRef.current.set(participantId, currentReserved + Math.max(0, amount));
  }, []);

  const releaseTournamentBalance = useCallback((participantId: string, amount: number) => {
    const currentReserved = pendingTournamentBalanceRef.current.get(participantId) ?? 0;
    const nextReserved = Math.max(0, currentReserved - Math.max(0, amount));

    if (nextReserved === 0) {
      pendingTournamentBalanceRef.current.delete(participantId);
      return;
    }

    pendingTournamentBalanceRef.current.set(participantId, nextReserved);
  }, []);

  const setCurrentPrice = useCallback((price: number, markerTime?: number) => {
    currentPriceRef.current = price;
    if (typeof markerTime === "number" && Number.isFinite(markerTime)) {
      currentMarkerTimeRef.current = markerTime;
    }
  }, []);

  const clearLatestSettlement = useCallback(() => {
    setLatestSettlement(null);
  }, []);

  const userId = user?.id ?? null;

  useEffect(() => {
    setActiveTrades([]);
    setTradeHistory([]);
    setLatestSettlement(null);

    if (!userId) {
      return;
    }

    let cancelled = false;

    const loadTrades = async () => {
      const [{ data: historyData }, { data: openData }] = await Promise.all([
        supabase
          .from("trades")
          .select("*")
          .eq("user_id", userId)
          .neq("status", "open")
          .gte("closed_at", getTradeHistoryCutoffIso())
          .order("closed_at", { ascending: false })
          .limit(50),
        supabase
          .from("trades")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "open")
          .order("opened_at", { ascending: false }),
      ]);

      if (openData) {
        const restoredActiveTrades: ActiveTrade[] = openData.map((trade) => {
          const elapsed = (Date.now() - new Date(trade.opened_at).getTime()) / 1000;
          const timeLeft = Math.max(0, trade.expiry_seconds - elapsed);
          const storedMarkerTime = getStoredTradeMarkerTime(trade.id);
          const storedMarkerLogical = getStoredTradeMarkerLogical(trade.id);

          return {
            ...trade,
            marker_time:
              typeof storedMarkerTime === "number" && Number.isFinite(storedMarkerTime)
                ? storedMarkerTime
                : Math.floor(new Date(trade.opened_at).getTime() / 1000),
            marker_logical:
              typeof storedMarkerLogical === "number" && Number.isFinite(storedMarkerLogical)
                ? storedMarkerLogical
                : undefined,
            timeLeft,
            tournament_participant_id: trade.tournament_participant_id ?? null,
            showSettlementOverlay: false,
          };
        });

        if (!cancelled) {
          setActiveTrades(restoredActiveTrades);
        }
      }

      if (historyData && !cancelled) {
        setTradeHistory(filterRetainedTradeHistory(historyData));
      }
    };

    void loadTrades();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (tradeHistory.length === 0) {
      return;
    }

    const pruneTradeHistory = () => {
      setTradeHistory((current) => {
        const next = filterRetainedTradeHistory(current);
        return next.length === current.length ? current : next;
      });
    };

    pruneTradeHistory();

    const timerId = window.setInterval(pruneTradeHistory, 60 * 1000);
    return () => window.clearInterval(timerId);
  }, [tradeHistory.length]);

  const resolveTrade = useCallback(async (trade: ActiveTrade) => {
    const exitPrice = currentPriceRef.current;
    const won =
      (trade.direction === "higher" && exitPrice > trade.entry_price) ||
      (trade.direction === "lower" && exitPrice < trade.entry_price);

    const profit = won ? trade.amount + trade.amount * trade.payout_rate : 0;
    const netProfit = won ? trade.amount * trade.payout_rate : -trade.amount;
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

    clearStoredTradeMarkerTime(trade.id);

    try {
      await supabase.rpc("process_trade_referral_commission", {
        p_trade_id: trade.id,
        p_event: "trade_close",
      });
    } catch {
      // Ignore referral commission failures so trade resolution never blocks.
    }

    try {
      await supabaseAny.rpc("process_social_trade_close", {
        p_trade_id: trade.id,
      });
    } catch {
      // Ignore social trade feed failures so settlement never blocks.
    }

    const participantId = trade.tournament_participant_id;
    if (participantId) {
      const { data: participant } = await supabase
        .from("tournament_participants")
        .select("current_balance")
        .eq("id", participantId)
        .single();

      if (participant) {
        const tournamentBalanceBefore = Number(participant.current_balance ?? 0);
        const newTournamentBalance = tournamentBalanceBefore + profit;

        await supabase
          .from("tournament_participants")
          .update({
            current_balance: newTournamentBalance,
            updated_at: settledAt,
          })
        .eq("id", participantId);

        if (user?.id) {
          void insertTradeBalanceAudit({
            user_id: user.id,
            trade_id: trade.id,
            event_type: "trade_close",
            account_scope: "tournament",
            asset_symbol: trade.asset_symbol,
            direction: trade.direction,
            status,
            amount: trade.amount,
            payout_rate: trade.payout_rate,
            profit,
            change_amount: profit,
            balance_before: tournamentBalanceBefore,
            balance_after: newTournamentBalance,
            available_balance_before: tournamentBalanceBefore,
            available_balance_after: newTournamentBalance,
            reserved_withdrawal_balance: 0,
            context: {
              entry_price: trade.entry_price,
              exit_price: exitPrice,
              expiry_seconds: trade.expiry_seconds,
              opened_at: trade.opened_at,
              settled_at: settledAt,
              tournament_participant_id: participantId,
            },
          });
        }
      }
    } else if (user && profile) {
      const fundedLiveAccount = hasFundedLiveAccount(profile);
      const creditedAmount = profit;
      const { data: liveProfileSnapshot } = await supabase
        .from("profiles")
        .select("balance, reserved_withdrawal_balance, total_trades, total_wins, total_profit")
        .eq("id", user.id)
        .single();

      const currentStoredLiveBalance = getStoredLiveBalance(liveProfileSnapshot ?? profile);
      const reservedWithdrawalBalance = getReservedWithdrawalBalance(liveProfileSnapshot ?? profile);
      const availableLiveBalanceBefore = getEffectiveLiveBalance(liveProfileSnapshot ?? profile);
      const nextStoredLiveBalance = fundedLiveAccount
        ? getStoredLiveBalanceAfterSettlementCredit(liveProfileSnapshot ?? profile, creditedAmount)
        : currentStoredLiveBalance;
      const nextAvailableLiveBalance = Math.max(0, nextStoredLiveBalance - reservedWithdrawalBalance);
      const totalTrades = Number(liveProfileSnapshot?.total_trades ?? profile.total_trades ?? 0);
      const totalWins = Number(liveProfileSnapshot?.total_wins ?? profile.total_wins ?? 0);
      const totalProfit = Number(liveProfileSnapshot?.total_profit ?? profile.total_profit ?? 0);

      await supabase
        .from("profiles")
        .update({
          balance: nextStoredLiveBalance,
          total_trades: totalTrades + (fundedLiveAccount ? 1 : 0),
          total_wins: totalWins + (fundedLiveAccount && won ? 1 : 0),
          total_profit: totalProfit + (fundedLiveAccount ? netProfit : 0),
          updated_at: settledAt,
        })
        .eq("id", user.id);

      void insertTradeBalanceAudit({
        user_id: user.id,
        trade_id: trade.id,
        event_type: "trade_close",
        account_scope: "live",
        asset_symbol: trade.asset_symbol,
        direction: trade.direction,
        status,
        amount: trade.amount,
        payout_rate: trade.payout_rate,
        profit,
        change_amount: creditedAmount,
        balance_before: currentStoredLiveBalance,
        balance_after: nextStoredLiveBalance,
        available_balance_before: availableLiveBalanceBefore,
        available_balance_after: nextAvailableLiveBalance,
        reserved_withdrawal_balance: reservedWithdrawalBalance,
        context: {
          entry_price: trade.entry_price,
          exit_price: exitPrice,
          expiry_seconds: trade.expiry_seconds,
          opened_at: trade.opened_at,
          settled_at: settledAt,
        },
      });

      void refreshProfile();
      void refreshVip();
    }

    void playTradeCloseSound();

    if (trade.showSettlementOverlay) {
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
    }

    if (user) {
      const { data } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "open")
        .gte("closed_at", getTradeHistoryCutoffIso())
        .order("closed_at", { ascending: false })
        .limit(50);

      if (data) {
        setTradeHistory(filterRetainedTradeHistory(data));
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
            if (trade.id.startsWith("temp_")) {
              updated.push({ ...trade, timeLeft: 0 });
              return;
            }

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
      payoutRate: number = 0.86,
      markerTimeOverride?: number | null,
      markerLogicalOverride?: number | null,
      timeframeSecondsOverride?: number | null,
    ) => {
      if (!user || !profile) {
        toast({ title: "Please log in to trade", variant: "destructive" });
        return false;
      }

      const activePid = tournamentParticipantIdRef.current;
      const actualEntryPrice = currentPriceRef.current > 0 ? currentPriceRef.current : entryPrice;
      const openedAt = new Date().toISOString();
      const markerSkewAllowance =
        typeof timeframeSecondsOverride === "number" && Number.isFinite(timeframeSecondsOverride)
          ? Math.max(10, Math.floor(timeframeSecondsOverride))
          : undefined;
      const markerTime = resolveFreshTradeMarkerTime(
        markerTimeOverride === undefined ? currentMarkerTimeRef.current : markerTimeOverride,
        openedAt,
        markerSkewAllowance,
      );
      const normalizedAmount = Math.round(Math.max(0, Number(amount) || 0) * 100) / 100;
      const optimisticId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const optimisticTrade: ActiveTrade = {
        id: optimisticId,
        asset_symbol: assetSymbol,
        direction,
        amount: normalizedAmount,
        entry_price: actualEntryPrice,
        marker_time: markerTime,
        marker_logical:
          typeof markerLogicalOverride === "number" && Number.isFinite(markerLogicalOverride)
            ? markerLogicalOverride
            : undefined,
        expiry_seconds: expirySeconds,
        payout_rate: payoutRate,
        opened_at: openedAt,
        timeLeft: expirySeconds,
        tournament_participant_id: activePid ?? null,
        showSettlementOverlay: true,
      };
      let rollbackLiveBalance: number | null = null;
      let rollbackTournamentBalance: number | null = null;
      let balanceCommitPromise: Promise<any> | null = null;

      if (activePid) {
        const { data: participant } = await supabase
          .from("tournament_participants")
          .select("current_balance")
          .eq("id", activePid)
          .single();

        const availableTournamentBalance =
          (participant?.current_balance ?? 0) - getReservedTournamentBalance(activePid);

        if (!participant || availableTournamentBalance < normalizedAmount) {
          toast({
            title: "Insufficient tournament balance",
            description: "Your arena balance is too low.",
            variant: "destructive",
          });
          return false;
        }

        rollbackTournamentBalance = Number(participant.current_balance ?? 0);
        reserveTournamentBalance(activePid, normalizedAmount);
        setActiveTrades((prev) => [...prev, optimisticTrade]);

        balanceCommitPromise = supabaseAny
          .from("tournament_participants")
          .update({
            current_balance: rollbackTournamentBalance - normalizedAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", activePid);
      } else {
        const pendingLiveBalance = Math.max(0, pendingLiveBalanceRef.current);
        const availableLiveBalance = getAvailableLiveBalanceForTrading(profile, pendingLiveBalance);

        if (!hasFundedLiveAccount(profile)) {
          requestDepositGuide("deposit_required");
          return false;
        }

        if (normalizedAmount > availableLiveBalance) {
          requestDepositGuide("insufficient_balance");
          return false;
        }

        if (normalizedAmount <= 0) {
          toast({ title: "Invalid amount", variant: "destructive" });
          return false;
        }

        rollbackLiveBalance = Math.max(0, getStoredLiveBalance(profile) - pendingLiveBalance);
        reserveLiveBalance(normalizedAmount);
        setActiveTrades((prev) => [...prev, optimisticTrade]);

        balanceCommitPromise = supabaseAny
          .from("profiles")
          .update({
            balance: getStoredLiveBalanceAfterPendingTrade(profile, normalizedAmount, pendingLiveBalance),
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }

      const [balanceCommitResult, tradeInsertResult] = await Promise.all([
        balanceCommitPromise,
        supabase
          .from("trades")
          .insert(buildTradeInsertPayload({
            userId: user.id,
            assetSymbol,
            direction,
            amount: normalizedAmount,
            entryPrice: actualEntryPrice,
            markerTime,
            expirySeconds,
            payoutRate,
            openedAt,
            tournamentParticipantId: activePid ?? null,
          }))
          .select()
          .single(),
      ]);

      const balanceCommitError = balanceCommitResult?.error ?? null;
      const tradeInsertError = tradeInsertResult.error ?? null;
      const insertedTrade = tradeInsertResult.data ?? null;

      if (balanceCommitError || tradeInsertError) {
        setActiveTrades((prev) => prev.filter((trade) => trade.id !== optimisticId));
        const rollbackTimestamp = new Date().toISOString();
        let balanceRestored = false;

        if (insertedTrade?.id && balanceCommitError) {
          await supabase.from("trades").delete().eq("id", insertedTrade.id);
        }

        if (activePid) {
          releaseTournamentBalance(activePid, normalizedAmount);

          if (!balanceCommitError && rollbackTournamentBalance !== null) {
            const { error: rollbackError } = await supabase
              .from("tournament_participants")
              .update({
                current_balance: rollbackTournamentBalance,
                updated_at: rollbackTimestamp,
              })
              .eq("id", activePid);

            balanceRestored = !rollbackError;
          } else {
            balanceRestored = !balanceCommitError;
          }
        } else {
          if (!balanceCommitError && rollbackLiveBalance !== null) {
            const { error: rollbackError } = await supabase
              .from("profiles")
              .update({
                balance: rollbackLiveBalance,
                updated_at: rollbackTimestamp,
              })
              .eq("id", user.id);

            balanceRestored = !rollbackError;
            if (balanceRestored) {
              void refreshProfile();
            }
          }

          releaseLiveBalance(normalizedAmount);
        }

        const failureMessage = tradeInsertError?.message || balanceCommitError?.message || "Trade placement failed.";
        toast({
          title: "Trade failed",
          description: describeTradeInsertError(failureMessage, Boolean(activePid), balanceRestored),
          variant: "destructive",
        });
        return false;
      }

      if (activePid) {
        const tournamentBalanceBefore = rollbackTournamentBalance ?? 0;
        const tournamentBalanceAfter = Math.max(0, tournamentBalanceBefore - normalizedAmount);

        void insertTradeBalanceAudit({
          user_id: user.id,
          trade_id: insertedTrade.id,
          event_type: "trade_open",
          account_scope: "tournament",
          asset_symbol: assetSymbol,
          direction,
          status: "open",
          amount: normalizedAmount,
          payout_rate: payoutRate,
          profit: null,
          change_amount: -normalizedAmount,
          balance_before: tournamentBalanceBefore,
          balance_after: tournamentBalanceAfter,
          available_balance_before: tournamentBalanceBefore,
          available_balance_after: tournamentBalanceAfter,
          reserved_withdrawal_balance: 0,
          context: {
            entry_price: actualEntryPrice,
            expiry_seconds: expirySeconds,
            opened_at: openedAt,
            marker_time: markerTime,
            marker_logical: markerLogicalOverride ?? null,
            tournament_participant_id: activePid,
          },
        });
      } else {
        const reservedWithdrawalBalance = getReservedWithdrawalBalance(profile);
        const availableLiveBalanceBefore = getAvailableLiveBalanceForTrading(profile, Math.max(0, pendingLiveBalanceRef.current - normalizedAmount));
        const storedLiveBalanceBefore = rollbackLiveBalance ?? getStoredLiveBalance(profile);
        const storedLiveBalanceAfter = getStoredLiveBalanceAfterPendingTrade(
          { ...profile, balance: storedLiveBalanceBefore },
          normalizedAmount,
          0,
        );
        const availableLiveBalanceAfter = Math.max(0, storedLiveBalanceAfter - reservedWithdrawalBalance);

        void insertTradeBalanceAudit({
          user_id: user.id,
          trade_id: insertedTrade.id,
          event_type: "trade_open",
          account_scope: "live",
          asset_symbol: assetSymbol,
          direction,
          status: "open",
          amount: normalizedAmount,
          payout_rate: payoutRate,
          profit: null,
          change_amount: -normalizedAmount,
          balance_before: storedLiveBalanceBefore,
          balance_after: storedLiveBalanceAfter,
          available_balance_before: availableLiveBalanceBefore,
          available_balance_after: availableLiveBalanceAfter,
          reserved_withdrawal_balance: reservedWithdrawalBalance,
          context: {
            entry_price: actualEntryPrice,
            expiry_seconds: expirySeconds,
            opened_at: openedAt,
            marker_time: markerTime,
            marker_logical: markerLogicalOverride ?? null,
          },
        });
      }

      toast({
        title: `Trade opened with price: ${actualEntryPrice.toFixed(5)} ${assetSymbol} (OTC)`,
        variant: "funding",
      });

      setActiveTrades((prev) =>
        prev.map((trade) =>
          trade.id === optimisticId
            ? {
                ...insertedTrade,
                marker_time: markerTime,
                marker_logical:
                  typeof markerLogicalOverride === "number" && Number.isFinite(markerLogicalOverride)
                    ? markerLogicalOverride
                    : undefined,
                timeLeft: Math.max(0, expirySeconds - (Date.now() - new Date(openedAt).getTime()) / 1000),
                tournament_participant_id: activePid ?? null,
                showSettlementOverlay: true,
              }
            : trade
        )
      );
      setStoredTradeMarkerSnapshot(insertedTrade.id, markerTime, markerLogicalOverride);

      void playTradeOpenSound();

      const sideEffects = [
        supabase.rpc("process_trade_referral_commission", {
          p_trade_id: insertedTrade.id,
          p_event: "trade_open",
        }),
        supabaseAny.rpc("process_social_trade_open", {
          p_trade_id: insertedTrade.id,
        }),
      ];

      if (activePid) {
        releaseTournamentBalance(activePid, normalizedAmount);
        void Promise.allSettled(sideEffects);
      } else {
        void Promise.allSettled([
          ...sideEffects,
          refreshProfile(),
          refreshVip(),
        ]).finally(() => {
          releaseLiveBalance(normalizedAmount);
        });
      }

      return true;
    },
    [
      getReservedTournamentBalance,
      profile,
      refreshProfile,
      refreshVip,
      releaseLiveBalance,
      releaseTournamentBalance,
      reserveLiveBalance,
      reserveTournamentBalance,
      user,
    ]
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
