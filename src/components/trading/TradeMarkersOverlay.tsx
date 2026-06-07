import { useEffect, useMemo, useRef, useState } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time, IPriceLine, LineStyle, createSeriesMarkers } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#00C076";
const DN = "#F6465D";

interface Props {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  assetSymbol: string;
  trades: ActiveTrade[];
  timeframeSeconds: number;
}

const MARKER_STYLES = {
  pillBg: "linear-gradient(135deg, rgba(12, 16, 28, 0.98) 0%, rgba(18, 24, 38, 0.98) 100%)",
  pillGlow: "rgba(67, 97, 238, 0.22)",
  textColor: "#FFFFFF",
  borderRadius: 16,
  fontFamily: "Inter, Arial, sans-serif",
  offsetY: 18,
};

const formatCountdown = (seconds: number) => {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return minutes > 0 ? `${minutes}:${String(remainingSeconds).padStart(2, "0")}` : `${total}s`;
};

const formatRemainingSeconds = (seconds: number) => {
  const total = Math.max(0, Math.ceil(seconds));
  return String(total % 60).padStart(2, "0");
};

const getTimeframeLabel = (seconds: number) => {
  if (seconds >= 86400) return "1D";
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}H`;
  if (seconds >= 60) return `${Math.round(seconds / 60)}M`;
  return `${seconds}s`;
};

const formatTradeOpenPrice = (price: number) => {
  const normalized = Number.isFinite(price) ? price : 0;
  return normalized.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
};

export const getTradeProgress = (start: number, end: number, now: number) => {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
};

export const getTradeDisplayTimes = (
  trade: Pick<ActiveTrade, "marker_time" | "opened_at" | "expiry_seconds">,
  nowSec: number,
) => {
  const entryTime =
    typeof trade.marker_time === "number" && Number.isFinite(trade.marker_time)
      ? Math.floor(trade.marker_time)
      : Math.floor(new Date(trade.opened_at).getTime() / 1000);
  const expiryTime = entryTime + Math.max(1, Math.floor(trade.expiry_seconds || 0));

  return {
    entryTime,
    expiryTime,
    activeLineEndTime: Math.min(nowSec, expiryTime),
  };
};

export const getTradeMarkerLogicalTime = (
  history: Array<{ time: number; logical: number }>,
  markerTime: number,
  timeframeSeconds: number,
) => {
  const safeTimeframe = Math.max(1, Math.floor(timeframeSeconds || 1));
  const sortedHistory = [...history].sort((left, right) => left.time - right.time);

  if (sortedHistory.length === 0) return null;

  const first = sortedHistory[0];
  const last = sortedHistory[sortedHistory.length - 1];

  if (markerTime <= first.time) return first.logical;

  if (markerTime >= last.time) {
    return last.logical + Math.max(0, markerTime - last.time) / safeTimeframe * 0.5;
  }

  for (let index = 0; index < sortedHistory.length - 1; index += 1) {
    const current = sortedHistory[index];
    const next = sortedHistory[index + 1];

    if (markerTime >= current.time && markerTime < next.time) {
      const span = Math.max(1, next.time - current.time);
      const fraction = (markerTime - current.time) / span;
      return current.logical + fraction * (next.logical - current.logical) * 0.5;
    }
  }

  return last.logical;
};

export const resolveTradeMarkerEntryLogicalAnchor = ({
  fixedEntryLogical,
  timeBasedLogicalAnchor,
}: {
  fixedEntryLogical: number;
  isFreshActiveTrade: boolean;
  latestLogicalAnchor: number;
  storedLogicalAnchor: number;
  timeframeSeconds: number;
  timeBasedLogicalAnchor: number;
}) => {
  if (typeof fixedEntryLogical === "number" && Number.isFinite(fixedEntryLogical)) {
    const gap = Math.abs(fixedEntryLogical - timeBasedLogicalAnchor);
    if (gap < 1.5) return fixedEntryLogical;
  }

  return timeBasedLogicalAnchor;
};

export const getTradeMarkerCoordinate = (
  chart: Pick<IChartApi, "timeScale">,
  history: Array<{ time: number; logical: number }>,
  markerTime: number,
  timeframeSeconds: number,
) => {
  const logical = getTradeMarkerLogicalTime(history, markerTime, timeframeSeconds);
  if (typeof logical !== "number" || !Number.isFinite(logical)) return null;

  return typeof chart.timeScale().logicalToCoordinate === "function"
    ? chart.timeScale().logicalToCoordinate(logical)
    : null;
};

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades }: Props) => {
  const sRef = useRef(series);
  const chartRef = useRef(chart);
  const plRef = useRef<Record<string, IPriceLine>>({});
  const pluginRef = useRef<ReturnType<typeof createSeriesMarkers> | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { sRef.current = series; }, [series]);
  useEffect(() => { chartRef.current = chart; }, [chart]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Init markers plugin once
  useEffect(() => {
    const s = sRef.current;
    if (!s) return;
    pluginRef.current = createSeriesMarkers(s);
    return () => { pluginRef.current?.setMarkers([]); pluginRef.current = null; };
  }, [series]);

  const myTrades = trades.filter((t) => t.asset_symbol === assetSymbol);

  // Price line at entry price — locked, never moves
  useEffect(() => {
    const s = sRef.current;
    if (!s) return;
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
      Object.values(plRef.current).forEach((l) => { try { s.removePriceLine(l); } catch {} });
      plRef.current = {};
    };
  }, [myTrades]);

  // Circle dot on the entry candle
  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin) return;

    plugin.setMarkers(
      myTrades.map((t) => ({
        time: (t.marker_time ?? Math.floor(new Date(t.opened_at).getTime() / 1000)) as Time,
        shape: t.direction === "higher" ? "arrowUp" : "arrowDown",
        position: "inBar",
        color: t.direction === "higher" ? UP : DN,
        size: 1.2,
        text: `${t.direction === "higher" ? "▲" : "▼"} $${t.amount.toFixed(2)}`,
      }))
    );

    return () => { plugin.setMarkers([]); };
  }, [myTrades]);

  const markerPositions = useMemo(() => {
    const container = chartRef.current?.container?.();
    if (!container) return [];

    const rect = container.getBoundingClientRect();
    const width = rect.width || container.clientWidth || 1;
    const height = rect.height || container.clientHeight || 1;

    return myTrades.map((trade) => {
      const markerTime = (trade.marker_time ?? Math.floor(new Date(trade.opened_at).getTime() / 1000)) as Time;
      const logicalAnchor = typeof trade.marker_logical === "number" && Number.isFinite(trade.marker_logical)
        ? trade.marker_logical
        : null;
      const x =
        logicalAnchor !== null && typeof chartRef.current.timeScale().logicalToCoordinate === "function"
          ? chartRef.current.timeScale().logicalToCoordinate(logicalAnchor)
          : chartRef.current.timeScale().timeToCoordinate(markerTime);
      const y = series.priceToCoordinate(trade.entry_price);

      if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }

      const left = Math.min(Math.max(x - 12, 8), width - 8);
      const top = Math.min(Math.max(y - MARKER_STYLES.offsetY, 8), height - 8);
      const { activeLineEndTime } = getTradeDisplayTimes(trade, Math.floor(Date.now() / 1000));
      const timeLeft = Math.max(0, activeLineEndTime - Math.floor(Date.now() / 1000));
      const progress = getTradeProgress(Math.floor(new Date(trade.opened_at).getTime() / 1000), activeLineEndTime, Math.floor(Date.now() / 1000));
      const isHigher = trade.direction === "higher";
      const tradeOpenMessage = `TRADE OPENED WITH PRICE: ${formatTradeOpenPrice(trade.entry_price)} ${trade.asset_symbol} (OTC)`;
      const label = `${tradeOpenMessage}\n${isHigher ? "▲" : "▼"} $${trade.amount.toFixed(2)}  ${formatCountdown(timeLeft)}  ${getTimeframeLabel(trade.expiry_seconds)}  ${formatRemainingSeconds(timeLeft)}`;

      return {
        id: trade.id,
        left,
        top,
        label,
        borderColor: isHigher ? UP : DN,
        progress,
      };
    }).filter(Boolean);
  }, [chart, myTrades, series, tick]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[75]">
      {markerPositions.map((position) => (
        position ? (
          <div
            key={position.id}
            className="absolute rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] shadow-[0_18px_32px_rgba(0,0,0,0.38)]"
            style={{
              left: position.left,
              top: position.top,
              background: MARKER_STYLES.pillBg,
              color: MARKER_STYLES.textColor,
              borderColor: position.borderColor,
              borderWidth: 1.5,
              borderRadius: MARKER_STYLES.borderRadius,
              fontFamily: MARKER_STYLES.fontFamily,
              whiteSpace: "pre-line",
              lineHeight: 1.15,
              maxWidth: 320,
              textAlign: "left",
              boxShadow: `0 18px 34px ${MARKER_STYLES.pillGlow}, inset 0 0 0 1px rgba(255,255,255,0.04)`,
              transform: "translate(-50%, -50%)",
              opacity: 0.94 + 0.05 * Math.max(0, Math.min(1, position.progress ?? 0)),
            }}
          >
            {position.label}
          </div>
        ) : null
      ))}
    </div>
  );
};
