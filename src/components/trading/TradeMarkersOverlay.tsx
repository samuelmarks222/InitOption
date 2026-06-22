import { useEffect, useMemo, useRef, useState } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time } from "lightweight-charts";
import { AlarmClock, Flag } from "lucide-react";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#47c58a";
const DN = "#f26a61";
const PURCHASE_LINE = "#f1604d";
const PURCHASE_DASHED_LINE = "rgba(245,248,255,0.88)";
const BEACON_RESERVE_HEIGHT = 28;
const EXPIRY_LINE_RESERVE_WIDTH = 32;

interface Props {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  assetSymbol: string;
  trades: ActiveTrade[];
  timeframeSeconds: number;
  liveLogical?: number | null;
  livePrice?: number;
  showIdleReference?: boolean;
}

const MARKER_WIDTH = 82;
const MARKER_HEIGHT = 20;
const MARKER_DOT_GAP = 20;
const CONNECTOR_DOT_OFFSET = 7;
const MARKER_EDGE_GAP = 8;
const ENTRY_DOT_SIZE = 9;
const CONNECTOR_DOT_SIZE = 8;
const ENTRY_PRICE_TAG_WIDTH = 114;
const PILL_GAP = 6;
const PILL_STACK_OFFSET = 26;

type DisplayMode = "full" | "compact" | "minimal";

type MarkerPosition = {
  id: string;
  left: number;
  top: number;
  purchaseLabelLeft: number;
  connectorDotLeft: number;
  dotLeft: number;
  dotTop: number;
  amountLabel: string;
  clockLabel: string;
  color: string;
  direction: ActiveTrade["direction"];
  entryPrice: number;
  entryPriceLead: string;
  entryPriceAccent: string;
  openedAtMs: number;
  progress: number;
  isReference?: boolean;
  payoutLabel: string;
  payoutUp: boolean;
  isInactive: boolean;
  displayMode: DisplayMode;
  pnlPercent: number;
};

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

const clampMarkerX = (value: number, width: number) =>
  Math.min(Math.max(value, MARKER_WIDTH + MARKER_DOT_GAP + 8), Math.max(MARKER_WIDTH + MARKER_DOT_GAP + 8, width - MARKER_EDGE_GAP));

const clampMarkerY = (value: number, height: number) =>
  Math.min(Math.max(value, MARKER_EDGE_GAP), Math.max(MARKER_EDGE_GAP, height - MARKER_EDGE_GAP));

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

const computePnlPercent = (entryPrice: number, currentPrice: number, direction: ActiveTrade["direction"]): number => {
  if (!Number.isFinite(entryPrice) || !Number.isFinite(currentPrice) || entryPrice === 0) return 0;
  const rawDiff = ((currentPrice - entryPrice) / entryPrice) * 100;
  return direction === "higher" ? rawDiff : -rawDiff;
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
  if (decimalIndex === -1) return { lead: "", accent: label };
  return {
    lead: label.slice(0, decimalIndex + 1),
    accent: label.slice(decimalIndex + 1),
  };
};

const getTradeProgress = (start: number, end: number, now: number) => {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
};

const getTradeDisplayTimes = (
  trade: Pick<ActiveTrade, "marker_time" | "opened_at" | "expiry_seconds">,
  nowSec: number,
) => {
  const entryTime =
    typeof trade.marker_time === "number" && Number.isFinite(trade.marker_time)
      ? Math.floor(trade.marker_time)
      : Math.floor(new Date(trade.opened_at).getTime() / 1000);
  const expiryTime = entryTime + Math.max(1, Math.floor(trade.expiry_seconds || 0));
  return { entryTime, expiryTime, activeLineEndTime: Math.min(nowSec, expiryTime) };
};

const getTradeMarkerLogicalTime = (
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
  if (markerTime >= last.time) return last.logical + Math.max(0, markerTime - last.time) / safeTimeframe * 0.5;
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

const resolveTradeMarkerEntryLogicalAnchor = ({
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

const getTradeMarkerCoordinate = (
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

const detectDisplayMode = (chart: IChartApi): DisplayMode => {
  try {
    const range = chart.timeScale().getVisibleLogicalRange();
    if (!range) return "full";
    const span = Math.abs(range.to - range.from);
    if (span < 30) return "full";
    if (span < 100) return "compact";
    return "minimal";
  } catch {
    return "full";
  }
};

const computePayoutGrade = (payout: number) => {
  const pct = (payout * 100).toFixed(0);
  return `+${pct}%`;
};

const detectBeaconZone = (chart: IChartApi, series: ISeriesApi<SeriesType>, liveLogical: number | null, livePrice: number | null): number | null => {
  if (typeof livePrice === "number" && Number.isFinite(livePrice)) {
    const y = series.priceToCoordinate(livePrice);
    if (isFiniteCoordinate(y)) return y;
  }
  return null;
};

const computeStackedPositions = (
  positions: MarkerPosition[],
  width: number,
  height: number,
  beaconY: number | null,
): MarkerPosition[] => {
  if (positions.length === 0) return [];

  const sorted = [...positions].sort((a, b) => a.dotTop - b.dotTop);
  const beaconReserve = beaconY !== null ? [beaconY - BEACON_RESERVE_HEIGHT, beaconY + BEACON_RESERVE_HEIGHT] : null;

  const assigned: MarkerPosition[] = [];
  const usedSlots: Array<{ top: number; bottom: number }> = [];

  const isSlotFree = (slotTop: number, slotBottom: number): boolean => {
    for (const used of usedSlots) {
      if (slotTop < used.bottom && slotBottom > used.top) return false;
    }
    return true;
  };

  for (const pos of sorted) {
    let adjustedTop = pos.top;
    const slotHeight = MARKER_HEIGHT + PILL_GAP;
    const halfSlot = slotHeight / 2;
    let attempts = 0;

    while (attempts < 30) {
      const slotTop = adjustedTop - halfSlot;
      const slotBottom = adjustedTop + halfSlot;

      const inBeaconZone = beaconReserve !== null && slotTop < beaconReserve[1] && slotBottom > beaconReserve[0];

      if (!inBeaconZone && isSlotFree(slotTop, slotBottom)) {
        break;
      }

      adjustedTop += (attempts % 2 === 0 ? 1 : -1) * (PILL_STACK_OFFSET * (1 + Math.floor(attempts / 2)));
      adjustedTop = clampMarkerY(adjustedTop, height - slotHeight);
      attempts++;
    }

    const finalTop = clampMarkerY(adjustedTop, height - MARKER_HEIGHT);
    usedSlots.push({ top: finalTop - halfSlot, bottom: finalTop + halfSlot });

    assigned.push({
      ...pos,
      top: finalTop,
      dotTop: finalTop,
    });
  }

  return assigned;
};

export const TradeMarkersOverlay = ({
  chart,
  series,
  assetSymbol,
  trades,
  timeframeSeconds,
  liveLogical,
  livePrice,
  showIdleReference = false,
}: Props) => {
  const sRef = useRef(series);
  const chartRef = useRef(chart);
  const rafRef = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => { sRef.current = series; }, [series]);
  useEffect(() => { chartRef.current = chart; }, [chart]);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      setTick((v) => v + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const myTrades = useMemo(
    () => trades.filter((trade) => isSameTradeMarkerSymbol(trade.asset_symbol, assetSymbol)),
    [assetSymbol, trades],
  );

  const displayMode = useMemo(() => detectDisplayMode(chart), [chart, tick]);

  const markerPositions = useMemo(() => {
    const container = chartRef.current?.container?.();
    if (!container) return [];

    const rect = container.getBoundingClientRect();
    const width = rect.width || container.clientWidth || 1;
    const height = rect.height || container.clientHeight || 1;

    const raw = myTrades.map((trade): MarkerPosition | null => {
      const safeTimeframe = Math.max(1, Math.floor(timeframeSeconds || 1));
      const markerTimeNumber = trade.marker_time ?? Math.floor(new Date(trade.opened_at).getTime() / 1000);
      const openedAtMs = new Date(trade.opened_at).getTime();
      const markerTime = markerTimeNumber as Time;
      const markerBucketTime = Math.floor(markerTimeNumber / safeTimeframe) * safeTimeframe;
      const logicalAnchor = typeof trade.marker_logical === "number" && Number.isFinite(trade.marker_logical)
        ? trade.marker_logical : null;
      const timeScale = chartRef.current.timeScale();
      const logicalX = logicalAnchor !== null && typeof timeScale.logicalToCoordinate === "function"
        ? timeScale.logicalToCoordinate(logicalAnchor as never) : null;
      const exactTimeX = timeScale.timeToCoordinate(markerTime);
      const bucketTimeX = timeScale.timeToCoordinate(markerBucketTime as Time);
      const y = series.priceToCoordinate(trade.entry_price);

      const nowSec = Math.floor(Date.now() / 1000);
      const { entryTime, expiryTime } = getTradeDisplayTimes(trade, nowSec);
      const timeLeft = typeof trade.timeLeft === "number" && Number.isFinite(trade.timeLeft)
        ? trade.timeLeft : Math.max(0, expiryTime - nowSec);
      const progress = getTradeProgress(entryTime, expiryTime, nowSec);
      const elapsedSeconds = Math.max(0, Math.min(trade.expiry_seconds || safeTimeframe, (trade.expiry_seconds || safeTimeframe) - timeLeft));
      const fallbackLogical = typeof liveLogical === "number" && Number.isFinite(liveLogical)
        ? liveLogical - elapsedSeconds / safeTimeframe : null;
      const liveFallbackX = fallbackLogical !== null && typeof timeScale.logicalToCoordinate === "function"
        ? timeScale.logicalToCoordinate(fallbackLogical as never) : null;
      const x = [logicalX, exactTimeX, bucketTimeX, liveFallbackX].find((candidate) =>
        isUsableMarkerX(candidate, width));

      const isHigher = trade.direction === "higher";
      const color = isHigher ? UP : DN;
      const fallbackX = width * (0.16 + Math.max(0, Math.min(1, 1 - progress)) * 0.54);
      const clampedX = clampMarkerX(isFiniteCoordinate(x) ? x : fallbackX, width);
      const fallbackY = height * 0.76;
      const clampedY = clampMarkerY(isFiniteCoordinate(y) ? y : fallbackY, height);
      const pillLeft = clampedX - MARKER_WIDTH - MARKER_DOT_GAP;
      const purchaseLabelLeft = Math.min(Math.max(8, clampedX - 112), Math.max(8, width - 152));
      const priceParts = splitPriceLabel(trade.entry_price);

      const payoutLabel = computePayoutGrade(trade.payout_rate);
      const isInactive = progress >= 1 || timeLeft <= 0;

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
        payoutLabel,
        payoutUp: isHigher,
        isInactive,
        displayMode,
        pnlPercent: computePnlPercent(trade.entry_price, livePrice ?? trade.entry_price, trade.direction),
      };
    }).filter((position): position is MarkerPosition => Boolean(position));

    const beaconY = detectBeaconZone(chart, series, liveLogical ?? null, livePrice ?? null);
    return computeStackedPositions(raw, width, height, beaconY);
  }, [chart, series, liveLogical, livePrice, myTrades, tick, timeframeSeconds, displayMode]);

  const idleReferencePosition = useMemo<MarkerPosition | null>(() => {
    if (!showIdleReference || myTrades.length > 0) return null;
    const container = chartRef.current?.container?.();
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const width = rect.width || container.clientWidth || 1;
    const height = rect.height || container.clientHeight || 1;
    const safePrice = typeof livePrice === "number" && Number.isFinite(livePrice) ? livePrice : 0;
    const y = safePrice > 0 ? series.priceToCoordinate(safePrice) : null;
    const logicalX = typeof liveLogical === "number" && Number.isFinite(liveLogical) && typeof chartRef.current.timeScale().logicalToCoordinate === "function"
      ? chartRef.current.timeScale().logicalToCoordinate((liveLogical - 8) as never) : null;
    const clampedX = clampMarkerX(isUsableMarkerX(logicalX, width) ? logicalX : width * 0.18, width);
    const clampedY = clampMarkerY(isFiniteCoordinate(y) ? y : height * 0.76, height);
    const pillLeft = clampedX - MARKER_WIDTH - MARKER_DOT_GAP;
    const purchaseLabelLeft = Math.min(Math.max(8, clampedX - 112), Math.max(8, width - 152));
    const priceParts = splitPriceLabel(safePrice || 0);
    const clockSeconds = Math.max(1, Math.min(15, Math.floor(Math.max(1, timeframeSeconds) / 4)));
    return {
      id: "idle-reference",
      left: pillLeft,
      top: clampedY,
      purchaseLabelLeft,
      connectorDotLeft: pillLeft + MARKER_WIDTH + CONNECTOR_DOT_OFFSET,
      dotLeft: clampedX,
      dotTop: clampedY,
      amountLabel: "",
      clockLabel: formatMarkerClock(clockSeconds),
      color: DN,
      direction: "lower" as const,
      entryPrice: safePrice,
      entryPriceLead: priceParts.lead,
      entryPriceAccent: priceParts.accent,
      openedAtMs: Date.now(),
      progress: 1,
      isReference: true,
      payoutLabel: "",
      payoutUp: false,
      displayMode: "full",
      pnlPercent: 0,
    };
  }, [liveLogical, livePrice, myTrades.length, series, showIdleReference, tick, timeframeSeconds]);

  const featuredPosition = markerPositions[markerPositions.length - 1] ?? idleReferencePosition;

  const redLineLeft = featuredPosition?.dotLeft ?? 0;
  const dashedLineLeft = redLineLeft - 14;

  return (
    <div className="pointer-events-none absolute inset-0 z-[90]" data-trade-markers-overlay="true">
      {featuredPosition ? (
        <div key={`${featuredPosition.id}-purchase-shell`} aria-hidden="true">
          <div
            data-trade-purchase-time-label="true"
            className="absolute top-[18px] z-[7] flex items-start gap-1.5 text-white"
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
            style={{ left: redLineLeft - 1, background: PURCHASE_LINE }}
          />
          <div
            data-trade-purchase-ruler-ticks="true"
            className="absolute top-0 bottom-0 z-[1] w-px"
            style={{
              left: dashedLineLeft,
              backgroundImage: `repeating-linear-gradient(to bottom, ${PURCHASE_DASHED_LINE} 0 2px, transparent 2px 5px)`,
            }}
          />
          <div
            data-trade-entry-price-guide="true"
            className="absolute left-0 z-[1] h-px bg-[#edf2fb]/82 shadow-[0_0_8px_rgba(237,242,251,0.18)]"
            style={{ right: ENTRY_PRICE_TAG_WIDTH - 16, top: featuredPosition.dotTop }}
          />
          <div
            data-trade-entry-price-tag="true"
            className="absolute right-0 z-[6] flex h-[30px] min-w-[112px] items-center justify-end bg-[#e7ebf0] pl-5 pr-2.5 text-right text-[14px] font-black leading-none shadow-[0_8px_18px_rgba(0,0,0,0.2)]"
            style={{ top: featuredPosition.dotTop - 15, clipPath: "polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 0 50%)" }}
          >
            <span className="text-[#596476]">{featuredPosition.entryPriceLead}</span>
            <span style={{ color: featuredPosition.direction === "higher" ? "#13b95e" : "#f04f43" }}>
              {featuredPosition.entryPriceAccent}
            </span>
          </div>
          <div
            data-trade-purchase-anchor-icons="true"
            className="absolute inset-x-0 bottom-[7px] z-[8]"
          >
            <span
              className="absolute flex h-[23px] w-[23px] items-center justify-center rounded-full border-[2px] border-white bg-white text-[#111827] shadow-[0_7px_16px_rgba(0,0,0,0.24)]"
              style={{ left: dashedLineLeft - 11.5, bottom: 0 }}
            >
              <AlarmClock className="h-[13px] w-[13px]" strokeWidth={2.8} />
            </span>
            <span
              className="absolute flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#f1604d] text-white shadow-[0_7px_16px_rgba(241,96,77,0.32)]"
              style={{ left: redLineLeft - 9, bottom: 2.5 }}
            >
              <Flag className="h-[11px] w-[11px]" fill="currentColor" strokeWidth={2.6} />
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
