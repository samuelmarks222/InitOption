import React, { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, IPriceLine, LineStyle } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const LINE_COLOR_UP = "#00C076";
const LINE_COLOR_DOWN = "#F6465D";

interface Props {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  assetSymbol: string;
  trades: ActiveTrade[];
  timeframeSeconds: number;
}

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades }: Props) => {
  const priceLineRefs = useRef<Record<string, IPriceLine>>({});
  const seriesRef = useRef(series);

  useEffect(() => {
    seriesRef.current = series;
  }, [series]);

  const assetTrades = trades.filter((t) => t.asset_symbol === assetSymbol);

  useEffect(() => {
    const currentSeries = seriesRef.current;
    if (!currentSeries) return;

    const lines = priceLineRefs.current;
    const tradeIds = new Set(assetTrades.map((t) => t.id));

    Object.keys(lines).forEach((id) => {
      if (!tradeIds.has(id)) {
        try { currentSeries.removePriceLine(lines[id]); } catch { /* ignore */ }
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
        } catch { /* ignore */ }
      }
    });
  }, [assetTrades]);

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

  return null;
};
