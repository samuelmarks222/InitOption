import React, { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";
import { TRADING_DOWN_COLOR, TRADING_UP_COLOR } from "./tradingPalette";

interface Props {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  assetSymbol: string;
  trades: ActiveTrade[];
  timeframeSeconds: number;
}

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
