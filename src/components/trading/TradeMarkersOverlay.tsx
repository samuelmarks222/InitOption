import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#00C076";
const DN = "#F6465D";

const getCandleX = (chart: IChartApi, trade: ActiveTrade): number | null => {
  try {
    const t = trade.marker_time != null && Number.isFinite(trade.marker_time) ? trade.marker_time : null;
    if (t == null) return null;
    const x = chart.timeScale().timeToCoordinate(t as Time);
    if (x != null && Number.isFinite(x)) return x;
    const idx = chart.timeScale().timeToIndex(t as Time, true);
    if (idx != null) {
      const x2 = chart.timeScale().logicalToCoordinate(idx as never);
      if (x2 != null && Number.isFinite(x2)) return x2;
    }
  } catch {}
  return null;
};

interface Props { chart: IChartApi; series: ISeriesApi<SeriesType>; assetSymbol: string; trades: ActiveTrade[]; timeframeSeconds: number; }

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades }: Props) => {
  const cRef = useRef<HTMLDivElement>(null);
  const barMap = useRef<Record<string, HTMLDivElement>>({});
  const trRef = useRef(trades);
  const chRef = useRef(chart);
  const srRef = useRef(series);

  useEffect(() => { trRef.current = trades; }, [trades]);
  useEffect(() => { chRef.current = chart; }, [chart]);
  useEffect(() => { srRef.current = series; }, [series]);

  const myTrades = trades.filter((t) => t.asset_symbol === assetSymbol);

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
      bar.style.cssText = "position:absolute;pointer-events:none;height:3px;width:44px;border-radius:2px;display:none;z-index:9999";
      container.appendChild(bar);
      map[t.id] = bar;
    });

    return () => { Object.values(map).forEach((e) => e.remove()); barMap.current = {}; };
  }, [myTrades]);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const container = cRef.current;
      const map = barMap.current;
      const allTrades = trRef.current;
      const chartApi = chRef.current;
      const seriesApi = srRef.current;
      if (!container || !chartApi || !seriesApi) { rafId = requestAnimationFrame(tick); return; }
      const cw = container.clientWidth;
      const ch = container.clientHeight;

      allTrades.forEach((trade) => {
        if (trade.asset_symbol !== assetSymbol) return;
        const bar = map[trade.id];
        if (!bar) return;

        let x: number | null = null;
        let y: number | null = null;
        try { x = getCandleX(chartApi, trade); } catch {}
        try { y = seriesApi.priceToCoordinate(trade.entry_price); } catch {}
        if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) {
          bar.style.display = "none";
          return;
        }

        bar.style.display = "block";
        bar.style.background = trade.direction === "higher" ? UP : DN;
        bar.style.left = `${Math.max(2, Math.min(x - 2, cw - 46))}px`;
        bar.style.top = `${Math.max(1, Math.min(y - 1, ch - 3))}px`;
      });

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [assetSymbol]);

  return <div ref={cRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 9999 }} />;
};
