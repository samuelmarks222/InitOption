import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time, createSeriesMarkers } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#00C076";
const DN = "#F6465D";

interface Props { chart: IChartApi; series: ISeriesApi<SeriesType>; assetSymbol: string; trades: ActiveTrade[]; timeframeSeconds: number; }

export const TradeMarkersOverlay = ({ series, assetSymbol, trades }: Props) => {
  const sRef = useRef(series);
  const pluginRef = useRef<ReturnType<typeof createSeriesMarkers> | null>(null);
  useEffect(() => { sRef.current = series; }, [series]);

  // Init markers plugin once
  useEffect(() => {
    const s = sRef.current;
    if (!s) return;
    pluginRef.current = createSeriesMarkers(s);
    return () => { pluginRef.current?.setMarkers([]); pluginRef.current = null; };
  }, [series]);

  const myTrades = trades.filter((t) => t.asset_symbol === assetSymbol);

  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin) return;

    plugin.setMarkers(
      myTrades.map((t) => ({
        time: (t.marker_time ?? Math.floor(new Date(t.opened_at).getTime() / 1000)) as Time,
        shape: "circle",
        position: "inBar",
        color: t.direction === "higher" ? UP : DN,
        size: 1,
      }))
    );

    return () => { plugin.setMarkers([]); };
  }, [myTrades]);

  return null;
};
