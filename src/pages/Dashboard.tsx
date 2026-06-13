import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, History, Trophy, BarChart3, LogOut, User } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { SiteLogo } from "@/components/branding/SiteLogo";

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const { platformName, initials } = useSiteBranding();
  const { formatMoney } = useCurrency();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: trades } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("opened_at", { ascending: false })
        .limit(10);
      if (trades) setRecentTrades(trades);

      const { data: leaders } = await supabase
        .from("profiles")
        .select("username, display_name, total_profit, total_trades, total_wins")
        .order("total_profit", { ascending: false })
        .limit(10);
      if (leaders) setLeaderboard(leaders);
    };
    load();
  }, [user]);

  const winRate = profile && profile.total_trades > 0
    ? ((profile.total_wins / profile.total_trades) * 100).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <SiteLogo
            to="/"
            variant="light"
            className="max-w-full"
            imageClassName="h-10 w-auto max-w-[240px] object-contain object-left"
            centered={false}
          />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Link to="/trade">
              <Button variant="trading" size="sm">Trade Now</Button>
            </Link>
            <button onClick={signOut} className="text-slate-500 hover:text-slate-900">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Welcome, {profile?.display_name || profile?.username || "Trader"}
          </h1>
          <p className="text-slate-500 mt-1">Here's your trading overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Balance</p>
              <p className="text-3xl font-bold text-slate-900">{formatMoney(profile?.balance ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Total Trades</p>
              <p className="text-3xl font-bold text-slate-900">{profile?.total_trades || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Win Rate</p>
              <p className="text-3xl font-bold text-trading-green">{winRate}%</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Total Profit</p>
              <p className={`text-3xl font-bold ${(profile?.total_profit || 0) >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                {formatMoney(profile?.total_profit ?? 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Trades */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <History className="w-5 h-5" /> Recent Trades
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTrades.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No trades yet. Start trading!</p>
              ) : (
                <div className="space-y-3">
                  {recentTrades.map((trade) => (
                    <div key={trade.id} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        {trade.direction === "higher" ? (
                          <TrendingUp className="w-4 h-4 text-trading-green" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-trading-red" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{trade.asset_symbol}</p>
                          <p className="text-xs text-slate-500">{trade.direction.toUpperCase()} • {formatMoney(trade.amount)}</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className={`text-sm font-medium ${trade.status === "won" ? "text-trading-green" : trade.status === "lost" ? "text-trading-red" : "text-slate-500"}`}>
                          {trade.status === "open"
                            ? "Active"
                            : trade.profit > 0
                              ? `+${formatMoney(trade.profit)}`
                              : trade.profit < 0
                                ? `-${formatMoney(Math.abs(trade.profit))}`
                                : formatMoney(0)}
                        </p>
                        <p className="text-xs text-slate-500">{trade.status.toUpperCase()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Trophy className="w-5 h-5 text-trading-orange" /> Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No traders yet</p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((trader, i) => (
                    <div key={i} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-trading-orange text-primary-foreground" : "bg-slate-200 text-slate-700"}`}>
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{trader.display_name || trader.username || "Anonymous"}</p>
                          <p className="text-xs text-slate-500">
                            {trader.total_trades} trades • {trader.total_trades > 0 ? ((trader.total_wins / trader.total_trades) * 100).toFixed(0) : 0}% win
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-bold ${trader.total_profit >= 0 ? "text-trading-green" : "text-trading-red"} sm:text-right`}>
                        {formatMoney(trader.total_profit ?? 0)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
