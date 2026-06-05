import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, IPriceLine, LineStyle, Time } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const LINE_COLOR_UP = "#00C076";
const LINE_COLOR_DOWN = "#F6465D";

const getTimeframeLabel = (seconds: number) => {
  if (seconds === 60) return "M1";
  if (seconds === 120) return "M2";
  if (seconds === 180) return "M3";
  if (seconds === 240) return "M4";
  if (seconds === 300) return "M5";
  if (seconds === 600) return "M10";
  if (seconds === 900) return "M15";
  if (seconds === 1800) return "M30";
  if (seconds === 3600) return "H1";
  if (seconds === 7200) return "H2";
  if (seconds === 14400) return "H4";
  if (seconds === 86400) return "D1";
  return `${seconds}s`;
};

type SeriesDataPoint = { time?: unknown; close?: number };

const getLastClose = (s: ISeriesApi<SeriesType>): number | null => {
  try {
    const data = (s as unknown as { data?: () => SeriesDataPoint[] }).data?.();
    if (!data || data.length === 0) return null;
    const last = data[data.length - 1];
    if (typeof last.close === "number" && Number.isFinite(last.close)) return last.close;
    return null;
  } catch {
    return null;
  }
};

interface Props {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  assetSymbol: string;
  trades: ActiveTrade[];
  timeframeSeconds: number;
}

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const priceLineRefs = useRef<Record<string, IPriceLine>>({});
  const seriesRef = useRef(series);
  const markersRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const tradesRef = useRef(trades);

  useEffect(() => {
    seriesRef.current = series;
  }, [series]);

  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  const assetTrades = trades.filter((t) => t.asset_symbol === assetSymbol);

  // Price lines (dashed entry lines)
  useEffect(() => {
    const currentSeries = seriesRef.current;
    if (!currentSeries) return;

    const lines = priceLineRefs.current;
    const tradeIds = new Set(assetTrades.map((t) => t.id));

    Object.keys(lines).forEach((id) => {
      if (!tradeIds.has(id)) {
        try { currentSeries.removePriceLine(lines[id]); } catch { }
        delete lines[id];
      }
    });

    assetTrades.forEach((trade) => {
      const isUp = trade.direction === "higher";
      const color = isUp ? LINE_COLOR_UP : LINE_COLOR_DOWN;
      const options = {
        price: trade.entry_price,
        color,
        lineStyle: LineStyle.Dashed as const,
        lineWidth: 1,
        axisLabelVisible: false,
      };

      if (lines[trade.id]) {
        lines[trade.id].applyOptions(options);
      } else {
        try {
          lines[trade.id] = currentSeries.createPriceLine(options);
        } catch { }
      }
    });
  }, [assetTrades]);

  useEffect(() => {
    return () => {
      const s = seriesRef.current;
      const lines = priceLineRefs.current;
      Object.keys(lines).forEach((id) => {
        try { s?.removePriceLine(lines[id]); } catch { }
      });
      priceLineRefs.current = {};
    };
  }, []);

  // HTML pill markers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const markers = markersRef.current;
    const tradeIds = new Set(assetTrades.map((t) => t.id));

    markers.forEach((el, id) => {
      if (!tradeIds.has(id)) {
        el.remove();
        markers.delete(id);
      }
    });

    assetTrades.forEach((trade) => {
      if (markers.has(trade.id)) return;

      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.pointerEvents = "none";
      el.style.whiteSpace = "nowrap";
      el.style.padding = "3px 10px";
      el.style.borderRadius = "20px";
      el.style.fontSize = "11px";
      el.style.fontWeight = "700";
      el.style.fontFamily = "Inter, monospace";
      el.style.color = "#FFFFFF";
      el.style.background = "rgba(26, 26, 42, 0.88)";
      el.style.border = "1px solid";
      el.style.zIndex = "5";
      container.appendChild(el);
      markers.set(trade.id, el);
    });

    return () => {
      markers.forEach((el) => el.remove());
      markers.clear();
    };
  }, [assetTrades]);

  // Position and update markers every frame
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let reqId = 0;

    const loop = () => {
      const markers = markersRef.current;
      const currentTrades = tradesRef.current;

      markers.forEach((el, id) => {
        const trade = currentTrades.find((t) => t.id === id);
        if (!trade) return;

        const x =
          trade.marker_time != null && Number.isFinite(trade.marker_time)
            ? chart.timeScale().timeToCoordinate(trade.marker_time as Time)
            : null;
        const y = series.priceToCoordinate(trade.entry_price);
        const isUp = trade.direction === "higher";
        const color = isUp ? LINE_COLOR_UP : LINE_COLOR_DOWN;
        const arrow = isUp ? "▲" : "▼";

        if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) {
          el.style.display = "none";
          return;
        }

        el.style.display = "";
        el.style.borderColor = color;

        const remaining = Math.max(0, trade.expiry_seconds - (Date.now() - new Date(trade.opened_at).getTime()) / 1000);

        if (remaining <= 0) {
          const lastClose = getLastClose(series);
          const won =
            lastClose !== null && Number.isFinite(lastClose)
              ? isUp
                ? lastClose > trade.entry_price
                : lastClose < trade.entry_price
              : false;
          if (won) {
            const profit = trade.amount * trade.payout_rate;
            el.textContent = `${arrow} +$${profit.toFixed(2)}`;
            el.style.borderColor = LINE_COLOR_UP;
          } else {
            el.textContent = `${arrow} -$${trade.amount.toFixed(2)}`;
            el.style.borderColor = LINE_COLOR_DOWN;
          }
        } else {
          const mins = Math.floor(remaining / 60);
          const secs = Math.floor(remaining % 60);
          const tfLabel = getTimeframeLabel(trade.expiry_seconds);
          el.textContent = `${arrow} $${trade.amount.toFixed(2)}  ${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}  ${tfLabel}  ${secs.toString().padStart(2, "0")}`;
        }

        const offsetY = isUp ? -22 : 22;
        el.style.left = `${x + 12}px`;
        el.style.top = `${y + offsetY}px`;
      });

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(reqId);
  }, [chart, series]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 85 }}
    />
  );
};
