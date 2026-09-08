import { useEffect, useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import AssetSymbolMark from "./AssetSymbolMark";
import { useDynamicAssets } from "@/contexts/DynamicAssetContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { OTCPriceEngine, TIMEFRAMES, type OHLCCandle, type TimeframeConfig } from "./engine/priceEngine";

interface PairInfoModalProps {
  symbol: string;
  onClose: () => void;
  onTradeNow?: (symbol: string) => void;
}

const getSmoothPathD = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
};

const formatPercent = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue >= 0 ? "+" : ""}${safeValue.toFixed(2)}%`;
};

export const PairInfoModal = ({ symbol, onClose, onTradeNow }: PairInfoModalProps) => {
  const { getAsset } = useDynamicAssets();
  const { formatMoney } = useCurrency();
  const [selectedTimeframe, setSelectedTimeframe] = useState<"5m" | "60m" | "1d">("5m");
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const asset = getAsset(symbol);
  const basePrice = asset?.price ?? 1.08523;
  const engine = useMemo(
    () => new OTCPriceEngine(symbol, basePrice, asset?.type),
    [asset?.type, basePrice, symbol],
  );
  const payout = Math.round(asset?.maxProfit ?? 74);

  const seed = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const chartConfig: TimeframeConfig = selectedTimeframe === "5m"
    ? TIMEFRAMES["5m"]
    : selectedTimeframe === "60m"
      ? TIMEFRAMES["1h"]
      : { ...TIMEFRAMES["2h"], label: "1d", historical: 72 };
  const candles = useMemo(
    () => engine.generateHistory(chartConfig, nowSec, chartConfig.historical),
    [chartConfig, engine, nowSec],
  );
  const currentPrice = candles[candles.length - 1]?.close ?? basePrice;
  const firstPrice = candles[0]?.open ?? currentPrice;
  const changeFor = (periodCandles: number) => {
    const start = candles[Math.max(0, candles.length - periodCandles)]?.open ?? firstPrice;
    return ((currentPrice - start) / start) * 100;
  };
  const sessionChange = asset?.change24h ?? changeFor(12);
  const buySentiment = Math.max(5, Math.min(95, Math.round(50 + sessionChange * 3)));
  const sellSentiment = 100 - buySentiment;
  const change5m = changeFor(1);
  const change60m = changeFor(12);
  const change1d = changeFor(72);
  const change1m = asset?.change24h ?? changeFor(72);
  const change1y = asset?.change24h ?? changeFor(72);
  const changeYtd = asset?.change24h ?? changeFor(72);

  const pointsCount = 40;
  const chartWidth = 400;
  const chartHeight = 150;

  useEffect(() => {
    const interval = window.setInterval(() => setNowSec(Date.now() / 1000), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const rawValues = candles.slice(-pointsCount).map((candle: OHLCCandle) => candle.close);

  const minV = Math.min(...rawValues);
  const maxV = Math.max(...rawValues);
  const vRange = Math.max(maxV - minV, 0.0005);

  const points = rawValues.map((v, idx) => ({
    x: 10 + (idx / (pointsCount - 1)) * (chartWidth - 20),
    y: chartHeight - 15 - ((v - minV) / vRange) * (chartHeight - 30),
  }));

  const smoothPathD = getSmoothPathD(points);
  const areaPathD = points.length > 1
    ? `${smoothPathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
    : "";

  const today = new Date();
  const scheduleRows = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toLocaleDateString("en-US", { day: "numeric", month: "long" });
    const weekdayStr = d.toLocaleDateString("en-US", { weekday: "long" });
    return { date: dateStr, weekday: weekdayStr, time: "03:00 - 02:59" };
  });

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#111827]/80 p-3 backdrop-blur-[3px] select-none" onClick={onClose}>
      <div className="relative max-h-[calc(100vh-24px)] w-full max-w-[800px] overflow-y-auto rounded-[8px] border border-[#30394d] bg-[#293143] p-4 text-white shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-[-1px] top-[-1px] z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#293143] shadow-md transition-colors hover:bg-[#dbe4f0]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
          <div className="flex items-center gap-2.5">
            <AssetSymbolMark symbol={symbol} size={24} />
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wide">{symbol}</h2>
            <span className="text-sm font-extrabold text-[#ff9d1c]">{payout}%</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-xs font-bold text-white">Open Now</span>
            <span className="text-xs text-[#8993a8]">/ Closes today at 02:59</span>
          </div>
        </div>

        <div className="my-4 border-b border-dashed border-[#2b3548]" />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[11px] font-medium text-[#9ba6bb]">Price Now</p>
              <p className="mt-0.5 text-base font-black text-white">{currentPrice.toFixed(5)}</p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#9ba6bb]">Session Change</p>
              <p className={`mt-0.5 whitespace-nowrap text-sm font-black ${sessionChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatPercent(sessionChange)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onTradeNow?.(symbol);
              onClose();
            }}
            className="flex items-center gap-2 rounded-[4px] bg-[#087bd8] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#0084FF]/25 transition-all hover:bg-[#1190f0]"
          >
            Trade Now <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-[7px] bg-[#353d50] px-3 py-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-baseline gap-1">
              <span className="text-base text-white">Buy</span>
              <span className="text-[11px] font-medium text-[#8993a8]">Traders' Sentiment</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#e9544f]">{sellSentiment}%</span>
              <span className="text-[#10c878]">{buySentiment}%</span>
            </div>
          </div>
          <div className="mt-2 flex h-[4px] w-full overflow-hidden rounded-full bg-[#242d3f]">
            <div className="h-full bg-[#e03e3e] transition-all duration-300" style={{ width: `${sellSentiment}%` }} />
            <div className="h-full bg-[#0fa055] transition-all duration-300" style={{ width: `${buySentiment}%` }} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs font-bold sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-medium text-[#9ba6bb]">Minimum investment</p>
            <p className="mt-0.5 font-black text-white">{formatMoney(1)}</p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-[#9ba6bb]">Profit - 1 min</p>
            <p className="mt-0.5 font-black text-emerald-400">{payout}%</p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-[#9ba6bb]">Profit - 5+ min</p>
            <p className="mt-0.5 font-black text-emerald-400">{payout + 1}%</p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-[#9ba6bb]">Expiry time</p>
            <p className="mt-0.5 font-black text-white">1 min - 4 hour</p>
          </div>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col space-y-3 rounded-lg bg-[#353d50] p-0">
            <div className="grid grid-cols-3 border-b border-[#444d61] text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedTimeframe("5m")}
                className={`min-w-0 px-2 py-3 text-left transition-colors sm:px-4 ${selectedTimeframe === "5m" ? "bg-[#3d465a] text-white" : "text-[#a0aabd] hover:text-white"}`}
              >
                <span className="block truncate">5 min change</span>
                <span className="block truncate text-[#10c878]">
                  {formatPercent(change5m)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTimeframe("60m")}
                className={`min-w-0 px-2 py-3 text-left transition-colors sm:px-4 ${selectedTimeframe === "60m" ? "bg-[#3d465a] text-white" : "text-[#a0aabd] hover:text-white"}`}
              >
                <span className="block truncate">60 min change</span>
                <span className="block truncate text-[#10c878]">
                  {formatPercent(change60m)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTimeframe("1d")}
                className={`min-w-0 px-2 py-3 text-left transition-colors sm:px-4 ${selectedTimeframe === "1d" ? "bg-[#3d465a] text-white" : "text-[#a0aabd] hover:text-white"}`}
              >
                <span className="block truncate">1 day change</span>
                <span className="block truncate text-[#10c878]">
                  {formatPercent(change1d)}
                </span>
              </button>
            </div>

            <div className="relative h-[190px] w-full overflow-hidden px-0">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full">
                <defs>
                  <linearGradient id="pairInfoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2585f1" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#2585f1" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {Array.from({ length: 6 }).map((_, i) => (
                  <line key={`vgrid-${i}`} x1={i * 75 + 10} x2={i * 75 + 10} y1="0" y2={chartHeight} stroke="#222b3d" strokeWidth="1" />
                ))}
                {Array.from({ length: 4 }).map((_, i) => (
                  <line key={`hgrid-${i}`} x1="0" x2={chartWidth} y1={i * 40 + 10} y2={i * 40 + 10} stroke="#222b3d" strokeWidth="1" />
                ))}

                <path d={areaPathD} fill="url(#pairInfoGrad)" />
                <path d={smoothPathD} fill="none" stroke="#2585f1" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-[#444d61] px-3 py-3 text-[10px] font-bold text-[#a0aabd] sm:px-4 sm:text-[11px]">
              <div className="min-w-0 truncate">
                1 month change{" "}
                <span className={change1m >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {formatPercent(change1m)}
                </span>
              </div>
              <div className="min-w-0 truncate">
                1 year change{" "}
                <span className={change1y >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {formatPercent(change1y)}
                </span>
              </div>
              <div className="min-w-0 truncate">
                YTD change{" "}
                <span className={changeYtd >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {formatPercent(changeYtd)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-2 rounded-lg bg-[#353d50] p-4">
            <h4 className="text-sm font-bold text-white">Trading Schedule</h4>

            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#232d3f] text-gray-500 font-semibold">
                    <th className="pb-1.5">Date</th>
                    <th className="pb-1.5">Weekday</th>
                    <th className="pb-1.5 text-right">Trading Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2738] font-bold text-gray-300">
                  {scheduleRows.map((row) => (
                    <tr key={row.date} className="hover:text-white">
                      <td className="py-1">{row.date}</td>
                      <td className="py-1">{row.weekday}</td>
                      <td className="py-1 text-right text-gray-400">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
