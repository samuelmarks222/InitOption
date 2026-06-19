import { useEffect, useMemo, useRef, useState } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time, IPriceLine, LineStyle } from "lightweight-charts";
import { AlarmClock, ArrowDown, ArrowUp, Flag } from "lucide-react";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#47c58a";
const DN = "#f26a61";
const PURCHASE_LINE = "#f1604d";

interface Props {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  assetSymbol: string;
  trades: ActiveTrade[];
  timeframeSeconds: number;
  liveLogical?: number | null;
}

const MARKER_WIDTH = 82;
const MARKER_HEIGHT = 18;
const MARKER_DOT_GAP = 24;
const CONNECTOR_DOT_OFFSET = 7;
const MARKER_MIN_VISIBLE_X = MARKER_WIDTH + MARKER_DOT_GAP + 8;
const MARKER_EDGE_GAP = 8;
const ENTRY_DOT_SIZE = 9;
const CONNECTOR_DOT_SIZE = 8;
const ENTRY_PRICE_TAG_WIDTH = 114;

export const normalizeTradeMarkerSymbol = (symbol: string) =>
  symbol
    .toUpperCase()
    .replace(/\(OTC\)/g, "")
    .replace(/[^A-Z0-9]/g, "");

const isSameTradeMarkerSymbol = (left: string, right: string) =>
  normalizeTradeMarkerSymbol(left) === normalizeTradeMarkerSymbol(right);

const isFiniteCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isUsableMarkerX = (value: unknown, width: number): value is number =>
  isFiniteCoordinate(value) && value >= -MARKER_WIDTH && value <= width + MARKER_EDGE_GAP;

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

const getEntryPricePrecision = (price: number) => {
  const abs = Math.abs(price);
  if (abs >= 100) return 4;
  if (abs >= 10) return 4;
  if (abs >= 1) return 5;
  return 6;
};

const splitPriceLabel = (price: number) => {
  const label = price.toFixed(getEntryPricePrecision(price));
  const decimalIndex = label.indexOf(".");

  if (decimalIndex === -1) {
    return { lead: "", accent: label };
  }

  return {
    lead: label.slice(0, decimalIndex + 1),
    accent: label.slice(decimalIndex + 1),
  };
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

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades, timeframeSeconds, liveLogical }: Props) => {
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
    () => trades.filter((trade) => isSameTradeMarkerSymbol(trade.asset_symbol, assetSymbol)),
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
      const safeTimeframe = Math.max(1, Math.floor(timeframeSeconds || 1));
      const markerTimeNumber = trade.marker_time ?? Math.floor(new Date(trade.opened_at).getTime() / 1000);
      const openedAtMs = new Date(trade.opened_at).getTime();
      const markerTime = markerTimeNumber as Time;
      const markerBucketTime = Math.floor(markerTimeNumber / safeTimeframe) * safeTimeframe;
      const logicalAnchor = typeof trade.marker_logical === "number" && Number.isFinite(trade.marker_logical)
        ? trade.marker_logical
        : null;
      const timeScale = chartRef.current.timeScale();
      const logicalX =
        logicalAnchor !== null && typeof chartRef.current.timeScale().logicalToCoordinate === "function"
          ? timeScale.logicalToCoordinate(logicalAnchor as never)
          : null;
      const exactTimeX = timeScale.timeToCoordinate(markerTime);
      const bucketTimeX = timeScale.timeToCoordinate(markerBucketTime as Time);
      const y = series.priceToCoordinate(trade.entry_price);

      if (!isFiniteCoordinate(y)) {
        return null;
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const { entryTime, expiryTime } = getTradeDisplayTimes(trade, nowSec);
      const timeLeft = typeof trade.timeLeft === "number" && Number.isFinite(trade.timeLeft)
        ? trade.timeLeft
        : Math.max(0, expiryTime - nowSec);
      const progress = getTradeProgress(entryTime, expiryTime, nowSec);
      const elapsedSeconds = Math.max(0, Math.min(trade.expiry_seconds || safeTimeframe, (trade.expiry_seconds || safeTimeframe) - timeLeft));
      const fallbackLogical =
        typeof liveLogical === "number" && Number.isFinite(liveLogical)
          ? liveLogical - elapsedSeconds / safeTimeframe
          : null;
      const liveFallbackX =
        fallbackLogical !== null && typeof timeScale.logicalToCoordinate === "function"
          ? timeScale.logicalToCoordinate(fallbackLogical as never)
          : null;
      const x = [logicalX, exactTimeX, bucketTimeX, liveFallbackX].find((candidate) =>
        isUsableMarkerX(candidate, width),
      );

      if (!isFiniteCoordinate(x)) {
        return null;
      }

      const isHigher = trade.direction === "higher";
      const color = isHigher ? UP : DN;
      const clampedX = Math.min(Math.max(x, MARKER_MIN_VISIBLE_X), width - MARKER_EDGE_GAP);
      const clampedY = Math.min(Math.max(y, MARKER_EDGE_GAP), height - MARKER_EDGE_GAP);
      const pillLeft = clampedX - MARKER_WIDTH - MARKER_DOT_GAP;
      const purchaseLabelLeft = Math.min(Math.max(8, clampedX - 112), Math.max(8, width - 152));
      const priceParts = splitPriceLabel(trade.entry_price);

      return {
        id: trade.id,
        left: pillLeft,
        top: clampedY,
        purchaseLabelLeft,
        connectorDotLeft: pillLeft + MARKER_WIDTH + CONNECTOR_DOT_OFFSET,
        dotLeft: clampedX,
        dotTop: clampedY,
        amountLabel: formatMarkerAmount(trade.amount),
        clockLabel: formatMarkerClock(timeLeft),
        color,
        direction: trade.direction,
        entryPrice: trade.entry_price,
        entryPriceLead: priceParts.lead,
        entryPriceAccent: priceParts.accent,
        openedAtMs: Number.isFinite(openedAtMs) ? openedAtMs : markerTimeNumber * 1000,
        progress,
      };
    }).filter(Boolean).sort((left, right) => {
      if (!left || !right) return 0;
      return left.openedAtMs - right.openedAtMs;
    });
  }, [chart, liveLogical, myTrades, series, tick, timeframeSeconds]);
  const featuredPosition = markerPositions[markerPositions.length - 1] ?? null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[90]" data-trade-markers-overlay="true">
      {featuredPosition ? (
        <div key={`${featuredPosition.id}-purchase-shell`} aria-hidden="true">
          <div
            data-trade-purchase-time-label="true"
            className="absolute top-2 z-[7] flex items-start gap-1.5 text-white"
            style={{ left: featuredPosition.purchaseLabelLeft }}
          >
            <span className="mt-[3px] max-w-[55px] text-right text-[10px] font-medium uppercase leading-[1.05] tracking-[0.03em] text-white/88">
              Purchase<br />Time
            </span>
            <span className="font-mono text-[23px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-white">
              {featuredPosition.clockLabel}
            </span>
          </div>
          <div
            data-trade-purchase-ruler="true"
            className="absolute top-0 bottom-0 z-[1] w-[2px] shadow-[0_0_12px_rgba(241,96,77,0.42)]"
            style={{ left: featuredPosition.dotLeft - 1, background: PURCHASE_LINE }}
          />
          <div
            data-trade-purchase-ruler-ticks="true"
            className="absolute z-[1]"
            style={{
              left: featuredPosition.dotLeft - 24,
              top: 58,
              bottom: 16,
              width: 18,
              backgroundImage: "repeating-linear-gradient(to bottom, rgba(232,238,247,0.78) 0 1px, transparent 1px 6px)",
              opacity: 0.72,
            }}
          />
          <div
            data-trade-entry-price-guide="true"
            className="absolute left-0 z-[1] h-px bg-[#edf2fb]/82 shadow-[0_0_8px_rgba(237,242,251,0.18)]"
            style={{
              right: ENTRY_PRICE_TAG_WIDTH - 16,
              top: featuredPosition.dotTop,
            }}
          />
          <div
            data-trade-entry-price-tag="true"
            className="absolute right-0 z-[6] flex h-[30px] min-w-[112px] items-center justify-end bg-[#e7ebf0] pl-5 pr-2.5 text-right text-[14px] font-black leading-none shadow-[0_8px_18px_rgba(0,0,0,0.2)]"
            style={{
              top: featuredPosition.dotTop - 15,
              clipPath: "polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 0 50%)",
            }}
          >
            <span className="text-[#596476]">{featuredPosition.entryPriceLead}</span>
            <span style={{ color: featuredPosition.direction === "higher" ? "#13b95e" : "#f04f43" }}>
              {featuredPosition.entryPriceAccent}
            </span>
          </div>
          <div
            data-trade-purchase-anchor-icons="true"
            className="absolute bottom-[7px] z-[8] flex items-center gap-[3px]"
            style={{ left: Math.min(Math.max(6, featuredPosition.dotLeft - 30), Math.max(6, (chartRef.current?.container?.().clientWidth ?? 60) - 62)) }}
          >
            <span className="flex h-[23px] w-[23px] items-center justify-center rounded-full border-[2px] border-white bg-white text-[#111827] shadow-[0_7px_16px_rgba(0,0,0,0.24)]">
              <AlarmClock className="h-[13px] w-[13px]" strokeWidth={2.8} />
            </span>
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#f1604d] text-white shadow-[0_7px_16px_rgba(241,96,77,0.32)]">
              <Flag className="h-[11px] w-[11px]" fill="currentColor" strokeWidth={2.6} />
            </span>
          </div>
        </div>
      ) : null}
      {markerPositions.map((position) => (
        position ? (
          <div key={position.id}>
            <div
              data-trade-entry-marker="true"
              className="absolute z-[2] inline-flex items-center gap-[3px] rounded-full pl-[4px] pr-[5px] text-white shadow-[0_2px_5px_rgba(0,0,0,0.18)]"
              style={{
                left: position.left,
                top: position.top,
                width: MARKER_WIDTH,
                height: MARKER_HEIGHT,
                background: position.color,
                transform: "translateY(-50%)",
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
              <span className="whitespace-nowrap text-[12px] font-black leading-none tracking-normal">
                {position.amountLabel}
              </span>
              <span className="whitespace-nowrap pt-[1px] text-[9px] font-bold leading-none text-white/82">
                {position.clockLabel}
              </span>
            </div>
            <div
              data-trade-entry-connector-dot="true"
              className="absolute z-[3] rounded-full border-2 border-white"
              style={{
                left: position.connectorDotLeft - CONNECTOR_DOT_SIZE / 2,
                top: position.dotTop - CONNECTOR_DOT_SIZE / 2,
                width: CONNECTOR_DOT_SIZE,
                height: CONNECTOR_DOT_SIZE,
                background: position.color,
                boxShadow: `0 0 0 1px ${position.color}`,
              }}
            />
            <div
              data-trade-entry-end-dot="true"
              className="absolute z-[4] rounded-full border-2"
              style={{
                left: position.dotLeft - ENTRY_DOT_SIZE / 2,
                top: position.dotTop - ENTRY_DOT_SIZE / 2,
                width: ENTRY_DOT_SIZE,
                height: ENTRY_DOT_SIZE,
                borderColor: position.color,
                background: "#ffffff",
                boxShadow: `0 0 0 1px ${position.color}`,
              }}
            />
          </div>
        ) : null
      ))}
    </div>
  );
};
