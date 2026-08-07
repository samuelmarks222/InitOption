import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ShieldCheck, Target, TrendingDown, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { normalizeAssetCategory } from "@/lib/assets";

type TradeRow = Tables<"trades">;
type ProfileRow = Pick<Tables<"profiles">, "id" | "username" | "display_name">;
type PlatformSettingsRow = Pick<Tables<"platform_settings">, "enforce_max_exposure" | "min_trade_amount" | "max_trade_amount" | "updated_at">;

type ExposureRow = {
  asset: string;
  long: number;
  short: number;
  net: number;
};

type SuspiciousTrader = {
  id: string;
  label: string;
  trades: number;
  wins: number;
  winRate: number;
  profit: number;
};

const formatMoney = (value: number) => `$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatSignedMoney = (value: number) => `${value >= 0 ? "+" : "-"}${formatMoney(value).replace("$", "$")}`;

const getTraderLabel = (profilesById: Map<string, ProfileRow>, userId: string) => {
  const profile = profilesById.get(userId);
  return profile?.display_name || profile?.username || `User ${userId.slice(0, 8).toUpperCase()}`;
};

const RiskManagement = () => {
  const [loading, setLoading] = useState(true);
  const [exposures, setExposures] = useState<ExposureRow[]>([]);
  const [controls, setControls] = useState<PlatformSettingsRow | null>(null);
  const [watchlist, setWatchlist] = useState<SuspiciousTrader[]>([]);

  useEffect(() => {
    const fetchRiskData = async () => {
      setLoading(true);

      const [openTradesResult, closedTradesResult, settingsResult] = await Promise.all([
        api.from("trades")
          .select("id, user_id, asset_symbol, direction, amount, status, opened_at, expiry_seconds")
          .eq("status", "open")
          .limit(2000),
        api.from("trades")
          .select("user_id, asset_symbol, profit, status")
          .neq("status", "open")
          .limit(4000),
        api.from("platform_settings")
          .select("enforce_max_exposure, min_trade_amount, max_trade_amount, updated_at")
          .limit(1)
          .maybeSingle(),
      ]);

      if (openTradesResult.error) {
        console.error("Failed to load open trades for risk management", openTradesResult.error);
      }

      if (closedTradesResult.error) {
        console.error("Failed to load closed trades for risk management", closedTradesResult.error);
      }

      if (settingsResult.error) {
        console.error("Failed to load platform settings for risk management", settingsResult.error);
      }

      const exposureMap = new Map<string, ExposureRow>();
      (openTradesResult.data ?? []).forEach((trade) => {
        const current = exposureMap.get(trade.asset_symbol) ?? {
          asset: trade.asset_symbol,
          long: 0,
          short: 0,
          net: 0,
        };

        if (trade.direction === "higher") {
          current.long += Number(trade.amount ?? 0);
        } else {
          current.short += Number(trade.amount ?? 0);
        }

        current.net = current.long - current.short;
        exposureMap.set(trade.asset_symbol, current);
      });

      const nextExposures = Array.from(exposureMap.values()).sort((left, right) => Math.abs(right.net) - Math.abs(left.net));
      setExposures(nextExposures);
      setControls(settingsResult.data ?? null);

      const tradingStats = new Map<string, { trades: number; wins: number; profit: number }>();
      (closedTradesResult.data ?? []).forEach((trade) => {
        if (normalizeAssetCategory(undefined, trade.asset_symbol) !== "OTC") return;

        const current = tradingStats.get(trade.user_id) ?? { trades: 0, wins: 0, profit: 0 };
        current.trades += 1;
        current.wins += trade.status === "won" ? 1 : 0;
        current.profit += Number(trade.profit ?? 0);
        tradingStats.set(trade.user_id, current);
      });

      const suspiciousIds = Array.from(tradingStats.entries())
        .filter(([, stats]) => stats.trades >= 10 && (stats.wins / stats.trades) * 100 >= 85)
        .map(([userId]) => userId);

      let profilesById = new Map<string, ProfileRow>();
      if (suspiciousIds.length > 0) {
        const { data: suspiciousProfiles, error: suspiciousProfilesError } = await api.from("profiles")
          .select("id, username, display_name")
          .in("id", suspiciousIds);

        if (suspiciousProfilesError) {
          console.error("Failed to load suspicious trader profiles", suspiciousProfilesError);
        } else {
          profilesById = new Map((suspiciousProfiles ?? []).map((profile) => [profile.id, profile]));
        }
      }

      setWatchlist(
        suspiciousIds
          .map((userId) => {
            const stats = tradingStats.get(userId);
            if (!stats) return null;

            return {
              id: userId,
              label: getTraderLabel(profilesById, userId),
              trades: stats.trades,
              wins: stats.wins,
              winRate: Number(((stats.wins / stats.trades) * 100).toFixed(1)),
              profit: stats.profit,
            };
          })
          .filter((trader): trader is SuspiciousTrader => trader !== null)
          .sort((left, right) => right.winRate - left.winRate),
      );

      setLoading(false);
    };

    void fetchRiskData();
  }, []);

  const totals = useMemo(() => {
    const long = exposures.reduce((sum, row) => sum + row.long, 0);
    const short = exposures.reduce((sum, row) => sum + row.short, 0);
    return {
      long,
      short,
      net: long - short,
      assets: exposures.length,
    };
  }, [exposures]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
            <AlertTriangle className="text-yellow-500" />
            Risk Management
          </h2>
          <p className="mt-1 text-sm text-slate-300">Review real open-trade exposure, platform controls, and trading win-rate anomalies.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard
          title="Higher Exposure"
          value={formatMoney(totals.long)}
          icon={<TrendingUp className="h-5 w-5 text-green-400" />}
          tone="green"
        />
        <StatCard
          title="Lower Exposure"
          value={formatMoney(totals.short)}
          icon={<TrendingDown className="h-5 w-5 text-red-400" />}
          tone="red"
        />
        <StatCard
          title="Net Skew"
          value={formatSignedMoney(totals.net)}
          icon={<Target className="h-5 w-5 text-[#0fa053]" />}
          tone="blue"
        />
        <StatCard
          title="Tracked Assets"
          value={loading ? "..." : totals.assets.toString()}
          icon={<ShieldCheck className="h-5 w-5 text-yellow-400" />}
          tone="yellow"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] shadow-lg md:col-span-2">
          <div className="border-b border-[#2a2f42] bg-[#1a1e2b] p-4">
            <h3 className="font-bold text-white">Current Asset Exposure</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm text-slate-200">
              <thead className="border-b border-[#2a2f42] bg-[#1a1e2b] text-xs uppercase text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-semibold">Asset</th>
                  <th className="px-6 py-3 font-semibold">Total Higher</th>
                  <th className="px-6 py-3 font-semibold">Total Lower</th>
                  <th className="px-6 py-3 font-semibold">Net Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">
                      Loading exposure data...
                    </td>
                  </tr>
                ) : exposures.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">
                      No open trades are currently contributing to platform exposure.
                    </td>
                  </tr>
                ) : (
                  exposures.map((row) => (
                    <tr key={row.asset} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-bold text-white">{row.asset}</td>
                      <td className="px-6 py-4 font-mono text-green-400">{formatMoney(row.long)}</td>
                      <td className="px-6 py-4 font-mono text-red-400">{formatMoney(row.short)}</td>
                      <td className={`px-6 py-4 font-mono font-bold ${row.net >= 0 ? "text-white" : "text-red-300"}`}>
                        {formatSignedMoney(row.net)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] p-6 shadow-lg">
          <h3 className="mb-4 border-b border-[#2a2f42] pb-2 text-lg font-bold text-white">Connected Controls</h3>
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-[#2a2f42] bg-[#0e1017] p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Max Exposure Guard</div>
              <div className="mt-2 text-base font-semibold text-white">
                {controls?.enforce_max_exposure ? "Enabled" : "Disabled"}
              </div>
            </div>

            <div className="rounded-xl border border-[#2a2f42] bg-[#0e1017] p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Min Trade Amount</div>
              <div className="mt-2 text-base font-semibold text-white">
                {controls ? formatMoney(Number(controls.min_trade_amount ?? 0)) : "Not configured"}
              </div>
            </div>

            <div className="rounded-xl border border-[#2a2f42] bg-[#0e1017] p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Max Trade Amount</div>
              <div className="mt-2 text-base font-semibold text-white">
                {controls ? formatMoney(Number(controls.max_trade_amount ?? 0)) : "Not configured"}
              </div>
            </div>

            <p className="text-xs leading-6 text-slate-400">
              Risk controls shown here are read from saved platform settings. No fabricated limits or simulated triggers are displayed.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-l-4 border-l-yellow-500 border-[#2a2f42] bg-[#1a1e2b] p-6 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="font-bold text-white">Trading Watchlist</h4>
            <p className="mt-1 text-sm text-slate-300">
              Traders are flagged here only when they have at least 10 closed trades and an observed trading win rate of 85% or higher.
            </p>
          </div>
          <Link
            to="/admin/users"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#2a2f42] bg-[#1a1e2b] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a1e2b]"
          >
            <Users className="h-4 w-4" />
            Review Users
          </Link>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="text-sm text-slate-400">Loading trading watchlist...</div>
          ) : watchlist.length === 0 ? (
            <div className="rounded-xl border border-[#2a2f42] bg-[#0e1017] p-4 text-sm text-slate-300">
              No traders currently meet the trading watchlist threshold.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {watchlist.map((trader) => (
                <div key={trader.id} className="rounded-xl border border-[#2a2f42] bg-[#0e1017] p-4">
                  <div className="font-bold text-white">{trader.label}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                    <span className="rounded-full bg-[#1a1e2b] px-2.5 py-1">{trader.trades} trades</span>
                    <span className="rounded-full bg-[#1a1e2b] px-2.5 py-1">{trader.winRate}% win rate</span>
                    <span className="rounded-full bg-[#1a1e2b] px-2.5 py-1">{formatSignedMoney(trader.profit)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone: "green" | "red" | "blue" | "yellow";
}) => {
  const toneClass =
    tone === "green"
      ? "bg-green-500/10"
      : tone === "red"
        ? "bg-red-500/10"
        : tone === "yellow"
          ? "bg-yellow-500/10"
          : "bg-[#0fa053]/10";

  return (
    <div className="rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-300">{title}</div>
          <div className="mt-2 text-2xl font-bold text-white">{value}</div>
        </div>
        <div className={`rounded-xl border border-[#2a2f42] p-3 ${toneClass}`}>{icon}</div>
      </div>
    </div>
  );
};

export default RiskManagement;

