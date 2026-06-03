import React, { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, IPriceLine, LineStyle } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const LINE_COLOR_UP = "#00C076";
const LINE_COLOR_DOWN = "#F6465D";
const LINE_DOWN_COLOR_FADED = "#887a7a";
const BG_COLOR = "#1A1A2A";
const TEXT_COLOR = "#FFFFFF";
const PILL_OFFSET_Y = 20;
const PILL_X_OFFSET = 12;

const getUnixTime = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }
  if (typeof value === "string") {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue > 1_000_000_000_000 ? Math.floor(numericValue / 1000) : Math.floor(numericValue);
    }
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
  }
  return null;
};

const formatCountdown = (seconds: number) => {
  if (seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  const blinkRef = useRef(false);

  useEffect(() => {
    seriesRef.current = series;
  }, [series]);

  useEffect(() => {
    const id = setInterval(() => { blinkRef.current = !blinkRef.current; }, 500);
    return () => clearInterval(id);
  }, []);

  const assetTrades = trades.filter((t) => t.asset_symbol === assetSymbol);

  // Manage price lines
  useEffect(() => {
    const currentSeries = seriesRef.current;
    if (!currentSeries) return;

    const lines = priceLineRefs.current;
    const tradeIds = new Set(assetTrades.map((t) => t.id));

    // Remove stale lines
    Object.keys(lines).forEach((id) => {
      if (!tradeIds.has(id)) {
        try { currentSeries.removePriceLine(lines[id]); } catch { /* ignore */ }
        delete lines[id];
      }
    });

    // Create/update lines
    assetTrades.forEach((trade) => {
      const isUp = trade.direction === "higher";
      const isExpired = trade.timeLeft <= 0;
      const color = isExpired ? LINE_DOWN_COLOR_FADED : (isUp ? LINE_COLOR_UP : LINE_COLOR_DOWN);
      const options = {
        price: trade.entry_price,
        color,
        lineStyle: LineStyle.Dashed as const,
        lineWidth: 2,
        axisLabelVisible: false,
      };

      if (lines[trade.id]) {
        lines[trade.id].applyOptions(options);
      } else {
        try {
          lines[trade.id] = currentSeries.createPriceLine(options);
        } catch { /* ignore */ }
      }
    });

  }, [assetTrades]);

  // Separate unmount-only cleanup for price lines
  useEffect(() => {
    return () => {
      const s = seriesRef.current;
      const lines = priceLineRefs.current;
      Object.keys(lines).forEach((id) => {
        try { s?.removePriceLine(lines[id]); } catch { /* ignore */ }
      });
      priceLineRefs.current = {};
    };
  }, []);

  // RAF loop for pill label positioning
  const animRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const loop = () => {
      const visibleTrades = assetTrades;

      while (el.children.length < visibleTrades.length) {
        const group = document.createElement("div");
        group.className = "absolute pointer-events-none flex items-center whitespace-nowrap";
        group.style.overflow = "visible";
        group.style.transition = "opacity 0.15s ease";

        const pill = document.createElement("div");
        pill.className = "flex items-center gap-1 px-3 py-1";
        pill.style.height = `${PILL_OFFSET_Y}px`;
        pill.style.borderRadius = "20px";
        pill.style.borderWidth = "1px";
        pill.style.borderStyle = "solid";
        pill.style.background = BG_COLOR;
        pill.style.fontSize = "12px";
        pill.style.fontWeight = "700";
        pill.style.fontFamily = "Inter, Roboto, sans-serif";
        pill.style.color = TEXT_COLOR;
        pill.style.boxShadow = "0 2px 8px rgba(0,0,0,0.35)";
        pill.style.transition = "border-color 0.15s ease";
        group.appendChild(pill);

        el.appendChild(group);
      }

      while (el.children.length > visibleTrades.length) {
        el.removeChild(el.lastChild!);
      }

      visibleTrades.forEach((trade, index) => {
        const group = el.children[index] as HTMLElement;
        const pill = group.children[0] as HTMLElement;

        const entryTime = getUnixTime(trade.marker_time) ?? getUnixTime(trade.opened_at) ?? Math.floor(Date.now() / 1000);
        let entryX = chart.timeScale().timeToCoordinate(entryTime as never);
        if (entryX === null && typeof trade.marker_logical === "number") {
          entryX = chart.timeScale().logicalToCoordinate(trade.marker_logical);
        }
        const entryY = series.priceToCoordinate(trade.entry_price);

        if (entryX === null || entryY === null || !Number.isFinite(entryX) || !Number.isFinite(entryY)) {
          group.style.opacity = "0";
          return;
        }

        const isUp = trade.direction === "higher";
        const isExpired = trade.timeLeft <= 0;
        const accent = isExpired ? LINE_DOWN_COLOR_FADED : (isUp ? LINE_COLOR_UP : LINE_COLOR_DOWN);
        const arrow = isUp ? "\u25B2" : "\u25BC";

        // Position pill
        const offsetY = isUp ? -(PILL_OFFSET_Y + 6) : PILL_OFFSET_Y + 6;
        group.style.opacity = "1";
        group.style.left = `${entryX + PILL_X_OFFSET}px`;
        group.style.top = `${entryY + offsetY}px`;

        // Build label text
        const amountStr = `$${trade.amount.toFixed(2)}`;
        const timeStr = formatCountdown(trade.timeLeft);
        const labelText = `${arrow} ${amountStr} ${timeStr}`;

        pill.textContent = labelText;

        // Border color with blinking
        const blinkOn = blinkRef.current;
        const borderColor = (!isExpired && !blinkOn) ? "#FFFFFF" : accent;
        pill.style.borderColor = borderColor;
      });

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [chart, series, assetTrades]);

  if (!assetTrades.length) return null;

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 92 }} />;
};
