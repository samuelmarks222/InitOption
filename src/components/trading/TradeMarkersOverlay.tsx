import React, { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";
import { TRADING_DOWN_COLOR, TRADING_UP_COLOR } from "./tradingPalette";

// Utility functions for trade marker calculations
/** Convert various time representations to Unix timestamp (seconds) */
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
    if (!Number.isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    }
  }

  return null;
};

/** Compute display times for a trade marker */
export const getTradeDisplayTimes = (
  trade: { marker_time?: unknown; opened_at?: unknown; expiry_seconds?: number },
  nowUnix: number,
) => {
  const entryTime =
    getUnixTime(trade.marker_time) ??
    getUnixTime(trade.opened_at) ??
    Math.floor(Date.now() / 1000);
  const expiryTime = trade.expiry_seconds != null ? entryTime + trade.expiry_seconds : entryTime;
  const activeLineEndTime = Math.min(nowUnix, expiryTime);
  return { entryTime, expiryTime, activeLineEndTime };
};

/** Compute progress fraction of an active line */
export const getTradeProgress = (start: number, end: number, now: number) => {
  if (end <= start) return 0;
  const fraction = (now - start) / (end - start);
  if (fraction <= 0) return 0;
  if (fraction >= 1) return 1;
  return fraction;
};

/** Interpolate logical position for a trade marker */
export const getTradeMarkerLogicalTime = (
  candles: { time: number; logical: number }[],
  tradeTime: number,
  timeframeSeconds: number,
): number | null => {
  if (!candles.length) return null;
  // Ensure sorted
  const sorted = candles.slice().sort((a, b) => a.time - b.time);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  // Before first candle
  if (tradeTime < first.time) return first.logical;
  // After last candle - extrapolate using last two points if possible
  if (tradeTime > last.time) {
    if (sorted.length >= 2) {
      const prev = sorted[sorted.length - 2];
      const slope = (last.logical - prev.logical) / (last.time - prev.time);
      return last.logical + (tradeTime - last.time) * slope;
    }
    return last.logical;
  }
  // Find surrounding candles
  for (let i = 1; i < sorted.length; i++) {
    const left = sorted[i - 1];
    const right = sorted[i];
    if (tradeTime >= left.time && tradeTime < right.time) {
      const interval = right.time - left.time;
      const proportion = (tradeTime - left.time) / interval;
      // If interval matches timeframe, limit to half progress to avoid jumping ahead of live candle
      const adjusted = interval === timeframeSeconds ? proportion * 0.5 : proportion;
      return left.logical + adjusted * (right.logical - left.logical);
    } else if (tradeTime === right.time) {
      // If it's exactly the boundary, we return the logical of the right candle (which is the start of the next interval)
      return right.logical;
    }
  }
  // If we get here, tradeTime equals first.time (handled by the first condition?) Actually we already handled tradeTime < first.time and tradeTime > last.time.
  // The only remaining case is tradeTime equals first.time, which we want to return first.logical.
  return first.logical;
};

/** Get coordinate for a trade marker on the chart */
export const getTradeMarkerCoordinate = (
  chart: { timeScale: () => { timeToCoordinate: (time: number) => number; logicalToCoordinate: (logical: number) => number } },
  candles: { time: number; logical: number }[],
  tradeTime: number,
  timeframeSeconds: number,
): number | null => {
  const logical = getTradeMarkerLogicalTime(candles, tradeTime, timeframeSeconds);
  if (logical === null) return null;
  return chart.timeScale().logicalToCoordinate(logical as never);
};

/** Resolve which logical anchor to use for a trade entry */
export const resolveTradeMarkerEntryLogicalAnchor = (params: {
  fixedEntryLogical: number;
  isFreshActiveTrade: boolean;
  latestLogicalAnchor: number;
  storedLogicalAnchor: number;
  timeframeSeconds: number;
  timeBasedLogicalAnchor: number;
}) => {
  const { fixedEntryLogical, isFreshActiveTrade, latestLogicalAnchor, timeBasedLogicalAnchor } = params;
  if (isFreshActiveTrade) {
    // If the fixed logical matches the current timeframe bucket, reuse it
    if (Math.floor(fixedEntryLogical) === Math.floor(timeBasedLogicalAnchor)) {
      return fixedEntryLogical;
    }
    // Otherwise prefer the latest logical anchor derived from timestamps
    return latestLogicalAnchor;
  }
  // Fallback to stored logical anchor
  return params.storedLogicalAnchor;
};

interface Props {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  assetSymbol: string;
  trades: ActiveTrade[];
  timeframeSeconds: number;
}

// Duplicate getUnixTime removed – using the implementation defined earlier
const MARKER_VIEW_PADDING = 160;
const DOT_SIZE = 10;
const DOT_HALF = DOT_SIZE / 2;

const isUsableCoordinate = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && !Number.isNaN(value);

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tradesRef = useRef<ActiveTrade[]>([]);

  useEffect(() => {
    tradesRef.current = trades.filter((trade) => trade.asset_symbol === assetSymbol);
  }, [assetSymbol, trades]);

  useEffect(() => {
    if (!containerRef.current) return;

    let reqId = 0;

    const loop = () => {
      const el = containerRef.current;
      if (!el) return;

      const visibleTrades = tradesRef.current;

      while (el.children.length < visibleTrades.length) {
        const group = document.createElement("div");
        group.className = "absolute pointer-events-none";
        group.style.overflow = "visible";

        const dot = document.createElement("div");
        dot.className = "absolute rounded-full border-2";
        dot.style.width = `${DOT_SIZE}px`;
        dot.style.height = `${DOT_SIZE}px`;
        dot.style.left = `${-DOT_HALF}px`;
        dot.style.top = `${-DOT_HALF}px`;
        dot.style.boxSizing = "border-box";
        dot.style.animation = "trade-blink 1.2s ease-in-out infinite";
        dot.style.background = "transparent";
        group.appendChild(dot);

        const line = document.createElement("div");
        line.className = "absolute";
        line.style.height = "0";
        line.style.borderTopStyle = "dotted";
        line.style.borderTopWidth = "1.5px";
        line.style.left = `${DOT_HALF}px`;
        line.style.top = "0";
        group.appendChild(line);

        el.appendChild(group);
      }

      while (el.children.length > visibleTrades.length) {
        el.removeChild(el.lastChild!);
      }

      const seriesData = series.data();
      if (!seriesData || seriesData.length === 0) {
        reqId = requestAnimationFrame(loop);
        return;
      }

      visibleTrades.forEach((trade, index) => {
        const group = el.children[index] as HTMLElement;
        const dot = group.children[0] as HTMLElement;
        const line = group.children[1] as HTMLElement;

        const entryTime = getUnixTime(trade.marker_time) ?? getUnixTime(trade.opened_at) ?? Math.floor(Date.now() / 1000);
        let entryX = chart.timeScale().timeToCoordinate(entryTime as never);
        if (!isUsableCoordinate(entryX) && isUsableCoordinate(trade.marker_logical)) {
          entryX = chart.timeScale().logicalToCoordinate(trade.marker_logical as never);
        }
        const entryY = series.priceToCoordinate(trade.entry_price);

        if (!isUsableCoordinate(entryX) || !isUsableCoordinate(entryY)) {
          group.style.opacity = "0";
          return;
        }

        if (
          entryX < -MARKER_VIEW_PADDING ||
          entryX > el.clientWidth + MARKER_VIEW_PADDING ||
          entryY < -MARKER_VIEW_PADDING ||
          entryY > el.clientHeight + MARKER_VIEW_PADDING
        ) {
          group.style.opacity = "0";
          return;
        }

        const isHigher = trade.direction === "higher";
        const accent = isHigher ? TRADING_UP_COLOR : TRADING_DOWN_COLOR;

        group.style.opacity = "1";
        group.style.left = `${entryX}px`;
        group.style.top = `${entryY}px`;

        dot.style.borderColor = accent;

        line.style.width = `${Math.max(0, el.clientWidth - entryX - DOT_HALF)}px`;
        line.style.borderTopColor = accent;
      });

      reqId = requestAnimationFrame(loop);
    };

    if (!document.getElementById("trade-blink-style")) {
      const style = document.createElement("style");
      style.id = "trade-blink-style";
      style.textContent = `@keyframes trade-blink{0%,100%{opacity:1}50%{opacity:0.08}}`;
      document.head.appendChild(style);
    }

    reqId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(reqId);
      const s = document.getElementById("trade-blink-style");
      if (s) s.remove();
    };
  }, [assetSymbol, chart, series]);

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 92 }} />;
};
