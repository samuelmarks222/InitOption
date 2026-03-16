import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, History, Trophy, BarChart3, LogOut, User } from "lucide-react";

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">BP</span>
            </div>
            <span className="text-xl font-bold text-foreground">BinaryPredict</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/trade">
              <Button variant="trading" size="sm">Trade Now</Button>
            </Link>
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {profile?.display_name || profile?.username || "Trader"}
          </h1>
          <p className="text-muted-foreground mt-1">Here's your trading overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-3xl font-bold text-foreground">${profile?.balance?.toFixed(2) || "0.00"}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Trades</p>
              <p className="text-3xl font-bold text-foreground">{profile?.total_trades || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-3xl font-bold text-trading-green">{winRate}%</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Profit</p>
              <p className={`text-3xl font-bold ${(profile?.total_profit || 0) >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                ${profile?.total_profit?.toFixed(2) || "0.00"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Trades */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <History className="w-5 h-5" /> Recent Trades
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTrades.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No trades yet. Start trading!</p>
              ) : (
                <div className="space-y-3">
                  {recentTrades.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                      <div className="flex items-center gap-3">
                        {trade.direction === "higher" ? (
                          <TrendingUp className="w-4 h-4 text-trading-green" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-trading-red" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{trade.asset_symbol}</p>
                          <p className="text-xs text-muted-foreground">{trade.direction.toUpperCase()} • ${trade.amount}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${trade.status === "won" ? "text-trading-green" : trade.status === "lost" ? "text-trading-red" : "text-muted-foreground"}`}>
                          {trade.status === "open" ? "Active" : trade.profit > 0 ? `+$${trade.profit.toFixed(2)}` : `-$${Math.abs(trade.profit).toFixed(2)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{trade.status.toUpperCase()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Trophy className="w-5 h-5 text-trading-orange" /> Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No traders yet</p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((trader, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-trading-orange text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{trader.display_name || trader.username || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground">
                            {trader.total_trades} trades • {trader.total_trades > 0 ? ((trader.total_wins / trader.total_trades) * 100).toFixed(0) : 0}% win
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-bold ${trader.total_profit >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                        ${trader.total_profit?.toFixed(2)}
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
