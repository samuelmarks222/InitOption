import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ActiveTrade {
  id: string;
  asset_symbol: string;
  direction: string;
  amount: number;
  entry_price: number;
  expiry_seconds: number;
  payout_rate: number;
  opened_at: string;
  timeLeft: number;
}

export const useTrading = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const currentPriceRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const setCurrentPrice = (price: number) => {
    currentPriceRef.current = price;
  };

  // Load trade history
  useEffect(() => {
    if (!user) return;
    const loadHistory = async () => {
      const { data } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "open")
        .order("closed_at", { ascending: false })
        .limit(50);
      if (data) setTradeHistory(data);
    };
    loadHistory();
  }, [user]);

  // Countdown timer for active trades
  useEffect(() => {
    if (activeTrades.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setActiveTrades((prev) => {
        const updated: ActiveTrade[] = [];
        const expired: ActiveTrade[] = [];

        prev.forEach((trade) => {
          const elapsed = (Date.now() - new Date(trade.opened_at).getTime()) / 1000;
          const timeLeft = Math.max(0, trade.expiry_seconds - elapsed);
          if (timeLeft <= 0) {
            expired.push(trade);
          } else {
            updated.push({ ...trade, timeLeft });
          }
        });

        // Resolve expired trades
        expired.forEach((trade) => resolveTrade(trade));

        return updated;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTrades.length]);

  const resolveTrade = async (trade: ActiveTrade) => {
    const exitPrice = currentPriceRef.current;
    const won =
      (trade.direction === "higher" && exitPrice > trade.entry_price) ||
      (trade.direction === "lower" && exitPrice < trade.entry_price);

    const profit = won ? trade.amount * trade.payout_rate : -trade.amount;
    const status = won ? "won" : "lost";

    // Update trade in DB
    await supabase
      .from("trades")
      .update({
        exit_price: exitPrice,
        status,
        profit,
        closed_at: new Date().toISOString(),
      })
      .eq("id", trade.id);

    // Update profile balance and stats
    if (user && profile) {
      const newBalance = profile.balance + (won ? trade.amount + trade.amount * trade.payout_rate : 0);
      await supabase
        .from("profiles")
        .update({
          balance: newBalance,
          total_trades: profile.total_trades + 1,
          total_wins: profile.total_wins + (won ? 1 : 0),
          total_profit: profile.total_profit + profit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      await refreshProfile();
    }

    toast({
      title: won ? "🎉 Trade Won!" : "😔 Trade Lost",
      description: `${trade.asset_symbol} ${trade.direction.toUpperCase()} — ${won ? "+" : ""}$${profit.toFixed(2)}`,
      variant: won ? "default" : "destructive",
    });

    // Refresh history
    const { data } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user!.id)
      .neq("status", "open")
      .order("closed_at", { ascending: false })
      .limit(50);
    if (data) setTradeHistory(data);
  };

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
      if (amount > profile.balance) {
        toast({ title: "Insufficient balance", variant: "destructive" });
        return false;
      }
      if (amount <= 0) {
        toast({ title: "Invalid amount", variant: "destructive" });
        return false;
      }

      // Deduct balance
      await supabase
        .from("profiles")
        .update({ balance: profile.balance - amount })
        .eq("id", user.id);

      // Create trade record
      const { data, error } = await supabase
        .from("trades")
        .insert({
          user_id: user.id,
          asset_symbol: assetSymbol,
          direction,
          amount,
          entry_price: entryPrice,
          expiry_seconds: expirySeconds,
          payout_rate: payoutRate,
          status: "open",
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Trade failed", description: error.message, variant: "destructive" });
        return false;
      }

      await refreshProfile();

      setActiveTrades((prev) => [
        ...prev,
        {
          ...data,
          timeLeft: expirySeconds,
        },
      ]);

      toast({
        title: `Trade opened: ${direction.toUpperCase()}`,
        description: `${assetSymbol} — $${amount} for ${expirySeconds}s`,
      });

      return true;
    },
    [user, profile, refreshProfile]
  );

  return { activeTrades, tradeHistory, openTrade, setCurrentPrice };
};
