import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, IPriceLine, LineStyle } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#00C076";
const DN = "#F6465D";

interface Props { chart: IChartApi; series: ISeriesApi<SeriesType>; assetSymbol: string; trades: ActiveTrade[]; timeframeSeconds: number; }

export const TradeMarkersOverlay = ({ series, assetSymbol, trades }: Props) => {
  const plRef = useRef<Record<string, IPriceLine>>({});
  const sRef = useRef(series);
  useEffect(() => { sRef.current = series; }, [series]);

  const myTrades = trades.filter((t) => t.asset_symbol === assetSymbol);

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

  return null;
};
