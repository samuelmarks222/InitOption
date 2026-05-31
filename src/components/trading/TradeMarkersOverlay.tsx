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
        const line = document.createElement("div");
        line.className = "absolute";
        line.style.height = "1px";
        line.style.transform = "translateY(-50%)";
        el.appendChild(line);
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
        const line = el.children[index] as HTMLElement;
        const entryTime = getUnixTime(trade.marker_time) ?? getUnixTime(trade.opened_at) ?? Math.floor(Date.now() / 1000);
        let entryX = chart.timeScale().timeToCoordinate(entryTime as never);
        if (!isUsableCoordinate(entryX) && isUsableCoordinate(trade.marker_logical)) {
          entryX = chart.timeScale().logicalToCoordinate(trade.marker_logical as never);
        }
        const entryY = series.priceToCoordinate(trade.entry_price);

        if (!isUsableCoordinate(entryX) || !isUsableCoordinate(entryY)) {
          line.style.opacity = "0";
          return;
        }

        if (
          entryX < -MARKER_VIEW_PADDING ||
          entryX > el.clientWidth + MARKER_VIEW_PADDING ||
          entryY < -MARKER_VIEW_PADDING ||
          entryY > el.clientHeight + MARKER_VIEW_PADDING
        ) {
          line.style.opacity = "0";
          return;
        }

        const isHigher = trade.direction === "higher";
        const accent = isHigher ? TRADING_UP_COLOR : TRADING_DOWN_COLOR;

        line.style.opacity = "1";
        line.style.left = `${entryX}px`;
        line.style.top = `${entryY}px`;
        line.style.width = `${el.clientWidth - entryX}px`;
        line.style.height = "0";
        line.style.borderTop = `1px dotted ${accent}`;
      });

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [assetSymbol, chart, series]);

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 92 }} />;
};
