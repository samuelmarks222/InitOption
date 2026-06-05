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
    if (trade.marker_time != null && Number.isFinite(trade.marker_time)) {
      const x = chart.timeScale().timeToCoordinate(trade.marker_time as Time);
      if (x != null && Number.isFinite(x)) return x;
    }
  } catch {}
  try {
    if (trade.marker_logical != null && Number.isFinite(trade.marker_logical)) {
      const x = chart.timeScale().logicalToCoordinate(trade.marker_logical as never);
      if (x != null && Number.isFinite(x)) return x;
    }
  } catch {}
  try {
    const t = parseTime(trade.opened_at);
    if (t != null) {
      const x = chart.timeScale().timeToCoordinate(t as Time);
      if (x != null && Number.isFinite(x)) return x;
    }
  } catch {}
  try {
    const t = trade.marker_time != null && Number.isFinite(trade.marker_time) ? trade.marker_time : parseTime(trade.opened_at);
    if (t != null) {
      const idx = chart.timeScale().timeToIndex(t as Time, true);
      if (idx != null) {
        const x = chart.timeScale().logicalToCoordinate(idx as never);
        if (x != null && Number.isFinite(x)) return x;
      }
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
  const markersRef = useRef<Record<string, HTMLDivElement>>({});
  const trRef = useRef(trades);
  const chRef = useRef(chart);
  const srRef = useRef(series);

  useEffect(() => { trRef.current = trades; }, [trades]);
  useEffect(() => { chRef.current = chart; }, [chart]);
  useEffect(() => { srRef.current = series; }, [series]);

  const myTrades = trades.filter((t) => t.asset_symbol === assetSymbol);

  useEffect(() => {
    const el = cRef.current; if (!el) return;
    const cur = new Set(myTrades.map((t) => t.id));
    const markers = markersRef.current;

    Object.keys(markers).forEach((id) => {
      if (!cur.has(id)) { markers[id].remove(); delete markers[id]; }
    });

    myTrades.forEach((t) => {
      if (markers[t.id]) return;
      const d = document.createElement("div");
      d.style.cssText = "position:absolute;pointer-events:none;height:2px;width:28px;border-radius:1px;display:none";
      el.appendChild(d);
      markers[t.id] = d;
    });

    return () => { Object.values(markers).forEach((e) => e.remove()); markersRef.current = {}; };
  }, [myTrades]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const container = cRef.current;
      if (!container) { raf = requestAnimationFrame(loop); return; }
      const ch = container.clientHeight;
      const markers = markersRef.current;
      const current = trRef.current;
      const cr = chRef.current;
      const sr = srRef.current;
      if (!cr || !sr) { raf = requestAnimationFrame(loop); return; }

      current.forEach((trade) => {
        if (trade.asset_symbol !== assetSymbol) return;
        const e = markers[trade.id];
        if (!e) return;

        let x: number | null = null;
        let y: number | null = null;
        try { x = getX(cr, trade); } catch {}
        try { y = sr.priceToCoordinate(trade.entry_price); } catch {}
        if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) { e.style.display = "none"; return; }

        const col = trade.direction === "higher" ? UP : DN;
        e.style.display = "";
        e.style.background = col;
        e.style.left = `${x}px`;
        e.style.top = `${Math.max(1, Math.min(y - 1, ch - 2))}px`;
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <div ref={cRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 85 }} />;
};
