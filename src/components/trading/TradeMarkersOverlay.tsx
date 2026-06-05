import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#00C076";
const DN = "#F6465D";

const parseTime = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v > 1_000_000_000_000 ? Math.floor(v / 1000) : Math.floor(v);
  if (typeof v === "string") { const n = Number(v); if (Number.isFinite(n)) return n > 1_000_000_000_000 ? Math.floor(n / 1000) : Math.floor(n); const p = Date.parse(v); if (!Number.isNaN(p)) return Math.floor(p / 1000); }
  if (v instanceof Date) return Math.floor(v.getTime() / 1000);
  return null;
};

const getX = (chart: IChartApi, trade: ActiveTrade) => {
  try {
    const t = trade.marker_time != null && Number.isFinite(trade.marker_time)
      ? trade.marker_time
      : parseTime(trade.opened_at);
    if (t != null) {
      const x = chart.timeScale().timeToCoordinate(t as Time);
      if (x != null && Number.isFinite(x)) return x;
      const idx = chart.timeScale().timeToIndex(t as Time, true);
      if (idx != null) {
        const x2 = chart.timeScale().logicalToCoordinate(idx as never);
        if (x2 != null && Number.isFinite(x2)) return x2;
      }
    }
  } catch {}
  try {
    if (trade.marker_logical != null && Number.isFinite(trade.marker_logical)) {
      const x = chart.timeScale().logicalToCoordinate(trade.marker_logical as never);
      if (x != null && Number.isFinite(x)) return x;
    }
  } catch {}
  try {
    const vr = chart.timeScale().getVisibleLogicalRange();
    if (vr) return chart.timeScale().logicalToCoordinate(vr.from + 2 as never);
  } catch {}
  return null;
};

interface Props { chart: IChartApi; series: ISeriesApi<SeriesType>; assetSymbol: string; trades: ActiveTrade[]; timeframeSeconds: number; }

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades }: Props) => {
  const cRef = useRef<HTMLDivElement>(null);
  const elMap = useRef<Record<string, HTMLDivElement>>({});
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
    const map = elMap.current;

    Object.keys(map).forEach((id) => {
      if (!cur.has(id)) { map[id].remove(); delete map[id]; }
    });

    myTrades.forEach((t) => {
      if (map[t.id]) return;
      const d = document.createElement("div");
      d.style.cssText = "position:absolute;pointer-events:none;height:2px;width:28px;border-radius:1px;display:none;z-index:9999";
      container.appendChild(d);
      map[t.id] = d;
    });

    return () => { Object.values(map).forEach((e) => e.remove()); elMap.current = {}; };
  }, [myTrades]);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const container = cRef.current;
      const map = elMap.current;
      const allTrades = trRef.current;
      const chartApi = chRef.current;
      const seriesApi = srRef.current;
      if (!container || !chartApi || !seriesApi) { rafId = requestAnimationFrame(tick); return; }
      const cw = container.clientWidth;
      const ch = container.clientHeight;

      allTrades.forEach((trade) => {
        if (trade.asset_symbol !== assetSymbol) return;
        const el = map[trade.id];
        if (!el) return;

        let x: number | null = null;
        let y: number | null = null;
        try { x = getX(chartApi, trade); } catch {}
        try { y = seriesApi.priceToCoordinate(trade.entry_price); } catch {}
        if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) {
          el.style.display = "none";
          return;
        }

        el.style.display = "block";
        el.style.background = trade.direction === "higher" ? UP : DN;
        el.style.left = `${Math.max(2, Math.min(x, cw - 30))}px`;
        el.style.top = `${Math.max(1, Math.min(y - 1, ch - 3))}px`;
      });

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [assetSymbol]);

  return <div ref={cRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 9999, isolation: "isolate" }} />;
};
