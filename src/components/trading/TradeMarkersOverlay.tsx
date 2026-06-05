import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#00C076";
const DN = "#F6465D";

interface Props { chart: IChartApi; series: ISeriesApi<SeriesType>; assetSymbol: string; trades: ActiveTrade[]; timeframeSeconds: number; }

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades }: Props) => {
  const cRef = useRef<HTMLDivElement>(null);
  const barMap = useRef<Record<string, HTMLDivElement>>({});
  const trRef = useRef(trades);
  const srRef = useRef(series);

  useEffect(() => { trRef.current = trades; }, [trades]);
  useEffect(() => { srRef.current = series; }, [series]);

  const myTrades = trades.filter((t) => t.asset_symbol === assetSymbol);

  // Create/remove bar elements
  useEffect(() => {
    const container = cRef.current;
    if (!container) return;
    const cur = new Set(myTrades.map((t) => t.id));
    const map = barMap.current;

    Object.keys(map).forEach((id) => {
      if (!cur.has(id)) { map[id].remove(); delete map[id]; }
    });

    myTrades.forEach((t) => {
      if (map[t.id]) return;
      const bar = document.createElement("div");
      bar.style.cssText = "position:absolute;pointer-events:none;height:3px;width:40px;border-radius:2px;display:none;z-index:9999";
      container.appendChild(bar);
      map[t.id] = bar;
    });

    return () => { Object.values(map).forEach((e) => e.remove()); barMap.current = {}; };
  }, [myTrades]);

  // RAF loop: position bars at FIXED X (left edge), Y tracks entry price
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const container = cRef.current;
      const map = barMap.current;
      const allTrades = trRef.current;
      const seriesApi = srRef.current;
      if (!container || !seriesApi) { rafId = requestAnimationFrame(tick); return; }
      const ch = container.clientHeight;

      allTrades.forEach((trade) => {
        if (trade.asset_symbol !== assetSymbol) return;
        const bar = map[trade.id];
        if (!bar) return;

        let y: number | null = null;
        try { y = seriesApi.priceToCoordinate(trade.entry_price); } catch {}
        if (y == null || !Number.isFinite(y)) { bar.style.display = "none"; return; }

        bar.style.display = "block";
        bar.style.background = trade.direction === "higher" ? UP : DN;
        bar.style.left = "4px";
        bar.style.top = `${Math.max(1, Math.min(y - 1, ch - 3))}px`;
      });

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [assetSymbol]);

  return <div ref={cRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 9999 }} />;
};
