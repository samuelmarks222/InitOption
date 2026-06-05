import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time, IPriceLine, LineStyle, createSeriesMarkers } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#00C076";
const DN = "#F6465D";

interface Props { chart: IChartApi; series: ISeriesApi<SeriesType>; assetSymbol: string; trades: ActiveTrade[]; timeframeSeconds: number; }

export const TradeMarkersOverlay = ({ series, assetSymbol, trades }: Props) => {
  const sRef = useRef(series);
  const plRef = useRef<Record<string, IPriceLine>>({});
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

  // Price lines at entry price (full-width)
  useEffect(() => {
    const s = sRef.current; if (!s) return;
    const lines = plRef.current;
    const ids = new Set(myTrades.map((t) => t.id));

    Object.keys(lines).forEach((id) => {
      if (!ids.has(id)) { try { s.removePriceLine(lines[id]); } catch {} delete lines[id]; }
    });

    myTrades.forEach((t) => {
      const c = t.direction === "higher" ? UP : DN;
      const o = { price: t.entry_price, color: c, lineStyle: LineStyle.Solid as const, lineWidth: 1, axisLabelVisible: false };
      if (lines[t.id]) try { lines[t.id].applyOptions(o); } catch {}
      else try { lines[t.id] = s.createPriceLine(o); } catch {}
    });

    return () => {
      const s2 = sRef.current;
      Object.values(plRef.current).forEach((l) => { try { s2?.removePriceLine(l); } catch {} });
      plRef.current = {};
    };
  }, [myTrades]);

  // Circle marker on entry candle
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
