import { useEffect, useMemo, useRef, useState } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time, IPriceLine, LineStyle } from "lightweight-charts";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#47c58a";
const DN = "#f26a61";

interface Props {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  assetSymbol: string;
  trades: ActiveTrade[];
  timeframeSeconds: number;
}

const MARKER_HEIGHT = 18;
const MARKER_MIN_VISIBLE_X = 84;
const MARKER_EDGE_GAP = 8;
const ENTRY_DOT_SIZE = 9;

const formatMarkerClock = (seconds: number) => {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const formatMarkerAmount = (amount: number) => {
  const normalized = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return Number.isInteger(normalized)
    ? `${normalized.toFixed(0)} $`
    : `${normalized.toFixed(2).replace(/\.?0+$/, "")} $`;
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
  const [tick, setTick] = useState(0);

  useEffect(() => { sRef.current = series; }, [series]);
  useEffect(() => { chartRef.current = chart; }, [chart]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const myTrades = useMemo(
    () => trades.filter((trade) => trade.asset_symbol === assetSymbol),
    [assetSymbol, trades],
  );

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
      const o = {
        price: t.entry_price,
        color: c,
        lineStyle: LineStyle.Solid as const,
        lineWidth: 1 as const,
        axisLabelVisible: false,
      };
      if (lines[t.id]) try { lines[t.id].applyOptions(o); } catch {}
      else try { lines[t.id] = s.createPriceLine(o); } catch {}
    });

    return () => {
      Object.values(plRef.current).forEach((l) => { try { s.removePriceLine(l); } catch {} });
      plRef.current = {};
    };
  }, [myTrades, series]);

  // No marker shapes on the entry candle

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

      const nowSec = Math.floor(Date.now() / 1000);
      const { entryTime, expiryTime } = getTradeDisplayTimes(trade, nowSec);
      const timeLeft = typeof trade.timeLeft === "number" && Number.isFinite(trade.timeLeft)
        ? trade.timeLeft
        : Math.max(0, expiryTime - nowSec);
      const progress = getTradeProgress(entryTime, expiryTime, nowSec);
      const isHigher = trade.direction === "higher";
      const color = isHigher ? UP : DN;
      const clampedX = Math.min(Math.max(x, MARKER_MIN_VISIBLE_X), width - MARKER_EDGE_GAP);
      const clampedY = Math.min(Math.max(y, MARKER_EDGE_GAP), height - MARKER_EDGE_GAP);

      return {
        id: trade.id,
        left: clampedX - 5,
        top: clampedY,
        dotLeft: Math.min(Math.max(x, MARKER_EDGE_GAP), width - MARKER_EDGE_GAP),
        dotTop: clampedY,
        amountLabel: formatMarkerAmount(trade.amount),
        clockLabel: formatMarkerClock(timeLeft),
        color,
        direction: trade.direction,
        progress,
      };
    }).filter(Boolean);
  }, [chart, myTrades, series, tick]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[75]">
      {markerPositions.map((position) => (
        position ? (
          <div key={position.id}>
            <div
              className="absolute z-[2] inline-flex items-center gap-[3px] rounded-full pl-[4px] pr-[6px] text-white shadow-[0_2px_5px_rgba(0,0,0,0.18)]"
              style={{
                left: position.left,
                top: position.top,
                height: MARKER_HEIGHT,
                minWidth: 78,
                background: position.color,
                transform: "translate(-100%, -50%)",
                opacity: 0.96 + 0.04 * Math.max(0, Math.min(1, position.progress ?? 0)),
              }}
            >
              <span className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full bg-white/24">
                {position.direction === "higher" ? (
                  <ArrowUp className="h-[9px] w-[9px] stroke-[3]" />
                ) : (
                  <ArrowDown className="h-[9px] w-[9px] stroke-[3]" />
                )}
              </span>
              <span className="whitespace-nowrap text-[12px] font-black leading-none tracking-[-0.01em]">
                {position.amountLabel}
              </span>
              <span className="whitespace-nowrap pt-[1px] text-[9px] font-bold leading-none text-white/82">
                {position.clockLabel}
              </span>
            </div>
            <div
              className="absolute z-[3] rounded-full border-2 border-white"
              style={{
                left: position.dotLeft - ENTRY_DOT_SIZE / 2,
                top: position.dotTop - ENTRY_DOT_SIZE / 2,
                width: ENTRY_DOT_SIZE,
                height: ENTRY_DOT_SIZE,
                background: position.color,
                boxShadow: `0 0 0 1px ${position.color}`,
              }}
            />
          </div>
        ) : null
      ))}
    </div>
  );
};
