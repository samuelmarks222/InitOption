import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import AssetSymbolMark from "./AssetSymbolMark";
import { useDynamicAssets } from "@/contexts/DynamicAssetContext";
import { useCurrency } from "@/contexts/CurrencyContext";

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

export const PairInfoModal = ({ symbol, onClose, onTradeNow }: PairInfoModalProps) => {
  const { getAsset } = useDynamicAssets();
  const { formatMoney } = useCurrency();
  const [selectedTimeframe, setSelectedTimeframe] = useState<"5m" | "60m" | "1d">("5m");

  const asset = getAsset(symbol);
  const currentPrice = asset?.price ?? 1.08523;
  const payout = Math.round(asset?.maxProfit ?? 74);

  const seed = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const buySentiment = 60 + (seed % 35);
  const sellSentiment = 100 - buySentiment;
  const sessionChange = ((seed % 17) / 100 - 0.08).toFixed(2);
  const change5m = ((seed % 11) / 100 - 0.03).toFixed(2);
  const change60m = ((seed % 23) / 100 - 0.10).toFixed(2);
  const change1d = ((seed % 31) / 100 - 0.15).toFixed(2);
  const change1m = ((seed % 19) / 100 - 0.09).toFixed(2);
  const change1y = ((seed % 41) / 100 - 0.20).toFixed(2);
  const changeYtd = ((seed % 29) / 100 - 0.05).toFixed(2);

  const pointsCount = 40;
  const chartWidth = 400;
  const chartHeight = 150;

  const rawValues: number[] = [];
  let val = currentPrice;
  for (let i = 0; i < pointsCount; i++) {
    const progress = i / pointsCount;
    const wave = Math.sin(progress * Math.PI * 4 + seed) * 0.0015;
    const noise = (Math.sin(i * 13.7 + seed) * 0.0008);
    rawValues.push(val + wave + noise);
  }

  const minV = Math.min(...rawValues);
  const maxV = Math.max(...rawValues);
  const vRange = Math.max(maxV - minV, 0.0005);

  const points = rawValues.map((v, idx) => ({
    x: 10 + (idx / (pointsCount - 1)) * (chartWidth - 20),
    y: chartHeight - 15 - ((v - minV) / vRange) * (chartHeight - 30),
  }));

  const smoothPathD = getSmoothPathD(points);
  const areaPathD = `${smoothPathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  const today = new Date();
  const scheduleRows = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toLocaleDateString("en-US", { day: "numeric", month: "long" });
    const weekdayStr = d.toLocaleDateString("en-US", { weekday: "long" });
    return { date: dateStr, weekday: weekdayStr, time: "03:00 - 02:59" };
  });

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm select-none" onClick={onClose}>
      <div className="relative w-full max-w-[760px] overflow-hidden rounded-[12px] border border-[#2d384c] bg-[#1a2130] p-6 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-gray-300 transition-colors hover:bg-white hover:text-black"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-between pr-10">
          <div className="flex items-center gap-2.5">
            <AssetSymbolMark symbol={symbol} size={24} />
            <h2 className="text-base font-extrabold text-white uppercase tracking-wide">{symbol}</h2>
            <span className="text-base font-extrabold text-[#FFB800]">{payout}%</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-emerald-400">Open Now</span>
            <span className="text-gray-400">/ Closes today at 02:59</span>
          </div>
        </div>

        <div className="my-4 border-b border-dashed border-[#2b3548]" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[11px] font-bold text-gray-400">Price Now</p>
              <p className="mt-0.5 text-lg font-black text-white">{currentPrice.toFixed(5)}</p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-400">Session Change</p>
              <p className={`mt-0.5 text-sm font-black ${Number(sessionChange) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {Number(sessionChange) >= 0 ? `+${sessionChange}%` : `${sessionChange}%`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onTradeNow?.(symbol);
              onClose();
            }}
            className="flex items-center gap-2 rounded-lg bg-[#0084FF] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#0084FF]/25 hover:bg-[#0070df] transition-all"
          >
            Trade Now <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-gray-300">
              Buy <span className="text-[11px] font-medium text-gray-400">Traders' Sentiment</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-red-400">{sellSentiment}%</span>
              <span className="text-emerald-400">{buySentiment}%</span>
            </div>
          </div>

          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#242d3f]">
            <div className="h-full bg-[#e03e3e] transition-all duration-300" style={{ width: `${sellSentiment}%` }} />
            <div className="h-full bg-[#0fa055] transition-all duration-300" style={{ width: `${buySentiment}%` }} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-4 rounded-lg bg-[#141a26] p-3 text-xs font-bold">
          <div>
            <p className="text-[11px] font-medium text-gray-400">Minimum investment</p>
            <p className="mt-0.5 font-black text-white">$1</p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-gray-400">Profit - 1 min</p>
            <p className="mt-0.5 font-black text-emerald-400">{payout}%</p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-gray-400">Profit - 5+ min</p>
            <p className="mt-0.5 font-black text-emerald-400">{payout + 1}%</p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-gray-400">Expiry time</p>
            <p className="mt-0.5 font-black text-white">1 min - 4 hour</p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]">
          <div className="flex flex-col space-y-3 rounded-lg bg-[#141a26] p-4 border border-[#232d3f]">
            <div className="flex items-center gap-4 text-xs font-bold border-b border-[#232d3f] pb-3">
              <button
                type="button"
                onClick={() => setSelectedTimeframe("5m")}
                className={`flex items-center gap-1.5 transition-colors ${selectedTimeframe === "5m" ? "text-white font-extrabold" : "text-gray-400 hover:text-white"}`}
              >
                <span>5 min change</span>
                <span className={Number(change5m) >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {Number(change5m) >= 0 ? `+${change5m}%` : `${change5m}%`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTimeframe("60m")}
                className={`flex items-center gap-1.5 transition-colors ${selectedTimeframe === "60m" ? "text-white font-extrabold" : "text-gray-400 hover:text-white"}`}
              >
                <span>60 min change</span>
                <span className={Number(change60m) >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {Number(change60m) >= 0 ? `+${change60m}%` : `${change60m}%`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTimeframe("1d")}
                className={`flex items-center gap-1.5 transition-colors ${selectedTimeframe === "1d" ? "text-white font-extrabold" : "text-gray-400 hover:text-white"}`}
              >
                <span>1 day change</span>
                <span className={Number(change1d) >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {Number(change1d) >= 0 ? `+${change1d}%` : `${change1d}%`}
                </span>
              </button>
            </div>

            <div className="relative h-[140px] w-full overflow-hidden">
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

            <div className="flex items-center justify-between border-t border-[#232d3f] pt-3 text-[11px] font-bold text-gray-400">
              <div>
                1 month change{" "}
                <span className={Number(change1m) >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {Number(change1m) >= 0 ? `+${change1m}%` : `${change1m}%`}
                </span>
              </div>
              <div>
                1 year change{" "}
                <span className={Number(change1y) >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {Number(change1y) >= 0 ? `+${change1y}%` : `${change1y}%`}
                </span>
              </div>
              <div>
                YTD change{" "}
                <span className={Number(changeYtd) >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {Number(changeYtd) >= 0 ? `+${changeYtd}%` : `${changeYtd}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-2 rounded-lg bg-[#141a26] p-4 border border-[#232d3f]">
            <h4 className="text-xs font-bold text-gray-300">Trading Schedule</h4>

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
