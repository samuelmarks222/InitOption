import { useMemo } from "react";
import {
  Activity,
  BarChart2,
  CircleDollarSign,
  Globe,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useDynamicAssets } from "@/contexts/DynamicAssetContext";

const PRICE_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
});

const PERCENT_FORMATTER = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

export const WorkspaceMarket = () => {
  const { assets, loading } = useDynamicAssets();

  const movers = useMemo(
    () => [...assets].sort((left, right) => Math.abs(right.change24h) - Math.abs(left.change24h)).slice(0, 6),
    [assets],
  );

  const overview = useMemo(() => {
    const rising = assets.filter((asset) => asset.change24h >= 0).length;
    const falling = assets.filter((asset) => asset.change24h < 0).length;
    const averageMove =
      assets.length > 0
        ? Number(
            (assets.reduce((sum, asset) => sum + Math.abs(asset.change24h), 0) / assets.length).toFixed(2),
          )
        : 0;
    const averagePayout =
      assets.length > 0 ? Math.round(assets.reduce((sum, asset) => sum + asset.maxProfit, 0) / assets.length) : 0;
    const highestPayout = [...assets].sort((left, right) => right.maxProfit - left.maxProfit)[0] ?? null;

    return {
      rising,
      falling,
      averageMove,
      averagePayout,
      highestPayout,
    };
  }, [assets]);

  const marketBreadth = useMemo(() => {
    const total = overview.rising + overview.falling;

    return {
      risingPct: total > 0 ? Number(((overview.rising / total) * 100).toFixed(1)) : 0,
      fallingPct: total > 0 ? Number(((overview.falling / total) * 100).toFixed(1)) : 0,
    };
  }, [overview.falling, overview.rising]);

  const assetMix = useMemo(() => {
    const counts = assets.reduce<Record<string, number>>((accumulator, asset) => {
      accumulator[asset.type] = (accumulator[asset.type] ?? 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts)
      .map(([type, count]) => ({
        type,
        count,
        pct: assets.length > 0 ? Number(((count / assets.length) * 100).toFixed(1)) : 0,
      }))
      .sort((left, right) => right.count - left.count);
  }, [assets]);

  const guidePoints = [
    "Use the mover list to spot instruments with the strongest 24-hour momentum.",
    "Compare breadth and asset mix before switching focus from one market type to another.",
    "Check payout leaders when you want faster filtering for high-return contracts.",
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#0c141d] font-copy text-white">
      <div className="relative overflow-hidden border-b border-white/8 bg-[linear-gradient(180deg,#101a25_0%,#0c141d_100%)] px-4 py-6 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(24,92,142,0.2),transparent_42%),radial-gradient(circle_at_85%_18%,rgba(17,153,105,0.14),transparent_24%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#96bed2]">
            <Globe className="h-3.5 w-3.5 text-[#86c7ff]" />
            Market Overview
          </div>
          <h2 className="font-display mt-4 text-[2rem] font-bold leading-[1.06] text-white">
            A cleaner market board with the signals traders actually need.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            This section now focuses on live movers, breadth, asset mix, and payout context instead of filler widgets.
            It is designed to help users understand what the market is doing before they place a trade.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { label: "Assets tracked", value: `${assets.length}` },
              { label: "Rising today", value: `${overview.rising}` },
              { label: "Average move", value: PERCENT_FORMATTER(overview.averageMove) },
              { label: "Average payout", value: `${overview.averagePayout}%` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,25,37,0.96),rgba(9,17,27,0.98))] px-4 py-4 shadow-[0_14px_34px_rgba(0,0,0,0.2)]"
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7ea4bb]">{item.label}</div>
                <div className="font-display mt-2 text-xl font-bold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <section className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.98))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7ea4bb]">
                <Activity className="h-4 w-4 text-[#7fe2b5]" />
                Live Movers
              </div>
              <h3 className="font-display mt-3 text-2xl font-bold text-white">Momentum across the board</h3>
            </div>
            {overview.highestPayout ? (
              <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-right">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Highest payout</div>
                <div className="mt-2 font-display text-lg font-bold text-white">
                  {overview.highestPayout.symbol}
                </div>
                <div className="text-sm text-[#7fe2b5]">{overview.highestPayout.maxProfit}% return</div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-[76px] rounded-[18px] border border-white/8 bg-white/[0.03]" />
              ))
            ) : movers.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
                No active assets are available yet.
              </div>
            ) : (
              movers.map((asset) => {
                const isUp = asset.change24h >= 0;
                return (
                  <div
                    key={asset.symbol}
                    className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 transition-colors hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-lg font-bold text-white">{asset.symbol}</span>
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                            {asset.type}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-slate-400">{asset.name}</div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`inline-flex items-center gap-1 text-sm font-bold ${
                            isUp ? "text-[#7fe2b5]" : "text-[#ff8f8f]"
                          }`}
                        >
                          {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {PERCENT_FORMATTER(asset.change24h)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{asset.maxProfit}% payout</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/8 pt-3 text-sm">
                      <span className="text-slate-400">Current price</span>
                      <span className="font-semibold text-white">{PRICE_FORMATTER.format(asset.price)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.98))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7ea4bb]">
            <BarChart2 className="h-4 w-4 text-[#86c7ff]" />
            Market Breadth
          </div>
          <h3 className="font-display mt-3 text-2xl font-bold text-white">How broad today&apos;s move is</h3>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            Breadth shows whether strength is concentrated in a few instruments or spread across the wider board.
          </p>

          <div className="mt-5 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
            <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.16em]">
              <span className="text-[#7fe2b5]">{marketBreadth.risingPct.toFixed(1)}% rising</span>
              <span className="text-[#ff8f8f]">{marketBreadth.fallingPct.toFixed(1)}% falling</span>
            </div>
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[#18a35d]" style={{ width: `${marketBreadth.risingPct}%` }} />
              <div className="h-full bg-[#d85757]" style={{ width: `${marketBreadth.fallingPct}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-[16px] border border-white/8 bg-[#102119] px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7fe2b5]">Advancing</div>
                <div className="mt-2 font-display text-xl font-bold text-white">{overview.rising}</div>
              </div>
              <div className="rounded-[16px] border border-white/8 bg-[#241416] px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff8f8f]">Declining</div>
                <div className="mt-2 font-display text-xl font-bold text-white">{overview.falling}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.98))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7ea4bb]">
            <CircleDollarSign className="h-4 w-4 text-[#7fe2b5]" />
            Asset Mix
          </div>
          <h3 className="font-display mt-3 text-2xl font-bold text-white">Where live opportunities are concentrated</h3>

          <div className="mt-5 space-y-3">
            {assetMix.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
                Asset mix will appear here once live instruments are available.
              </div>
            ) : (
              assetMix.map((item) => (
                <div key={item.type} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-white">{item.type}</div>
                      <div className="text-xs text-slate-500">{item.count} instruments</div>
                    </div>
                    <div className="text-sm font-bold text-slate-200">{item.pct.toFixed(1)}%</div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-[linear-gradient(90deg,#23c973,#15975a)]" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.98))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7ea4bb]">
            <ShieldCheck className="h-4 w-4 text-[#86c7ff]" />
            How To Use This Board
          </div>
          <h3 className="font-display mt-3 text-2xl font-bold text-white">What users should expect here</h3>
          <div className="mt-4 space-y-3">
            {guidePoints.map((point) => (
              <div
                key={point}
                className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-slate-300"
              >
                {point}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
