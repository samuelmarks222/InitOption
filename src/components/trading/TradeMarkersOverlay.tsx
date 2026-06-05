import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#00C076";
const DN = "#F6465D";

interface Props { chart: IChartApi; series: ISeriesApi<SeriesType>; assetSymbol: string; trades: ActiveTrade[]; timeframeSeconds: number; }

export const TradeMarkersOverlay = ({ series, assetSymbol, trades }: Props) => {
  const sRef = useRef(series);
  useEffect(() => { sRef.current = series; }, [series]);

  const myTrades = trades.filter((t) => t.asset_symbol === assetSymbol);

  useEffect(() => {
    const s = sRef.current; if (!s) return;

    try {
      s.setMarkers(
        myTrades.map((t) => ({
          time: (t.marker_time ?? Math.floor(new Date(t.opened_at).getTime() / 1000)) as Time,
          shape: "circle",
          position: "inBar",
          color: t.direction === "higher" ? UP : DN,
          size: 1,
        }))
      );
    } catch {}

    return () => { try { s.setMarkers([]); } catch {} };
  }, [myTrades]);

  return null;
};
