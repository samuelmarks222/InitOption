import React, { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, type Time } from "lightweight-charts";
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

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const safeAlpha = Math.max(0, Math.min(alpha, 1));

  if (normalized.length !== 6) {
    return `rgba(255, 255, 255, ${safeAlpha})`;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
};

type SeriesPoint = {
  time: number;
  logical: number;
};

const HIGHER_TIMEFRAME_FULL_TIME_SECONDS = 5 * 60;
const INTRABAR_LOGICAL_SPAN = 0.72;
const MARKER_VIEW_PADDING = 160;
const MARKER_MIN_LINE_WIDTH = 2;
const MARKER_MIN_TOTAL_WIDTH = 58;
const MARKER_MAX_TOTAL_WIDTH = 168;

const clampFraction = (value: number) => Math.min(1, Math.max(0, value));

const getIntrabarLogicalOffset = (fraction: number) =>
  (clampFraction(fraction) - 0.5) * INTRABAR_LOGICAL_SPAN;

const isUsableCoordinate = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && !Number.isNaN(value);

const formatTradeAmountLabel = (amount: number) => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return Number.isInteger(safeAmount) ? `$${safeAmount.toFixed(0)}` : `$${safeAmount.toFixed(2)}`;
};

const formatTradeCountdown = (secondsRemaining: number) => {
  const totalSeconds = Math.max(0, Math.ceil(secondsRemaining));
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(totalSeconds / 3600);

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getReadableTradeLineWidth = (expirySeconds: number) => {
  const safeExpirySeconds = Math.max(1, Number.isFinite(expirySeconds) ? expirySeconds : 60);
  return Math.max(
    MARKER_MIN_TOTAL_WIDTH,
    Math.min(MARKER_MAX_TOTAL_WIDTH, safeExpirySeconds * 0.95),
  );
};

const fixedMarkerAnchors = new Map<string, number>();

const getTradeAnchorKey = (
  trade: Pick<
    ActiveTrade,
    "id" | "asset_symbol" | "direction" | "amount" | "expiry_seconds" | "marker_time" | "opened_at"
  >,
) => {
  const markerTime = getUnixTime(trade.marker_time);
  const openedTime = getUnixTime(trade.opened_at);
  const entryTime = markerTime ?? openedTime ?? 0;
  const openedKey =
    typeof trade.opened_at === "string" && trade.opened_at.length > 0
      ? trade.opened_at
      : String(openedTime ?? trade.id);
  const amount = Number.isFinite(Number(trade.amount)) ? Number(trade.amount).toFixed(2) : "0.00";
  const expiry = Math.max(1, Math.floor(Number(trade.expiry_seconds) || 0));

  return `${trade.asset_symbol}|${entryTime}|${openedKey}|${trade.direction}|${amount}|${expiry}`;
};

const getShortTimeframeLogicalTime = (
  seriesPoints: SeriesPoint[],
  targetTime: number,
  timeframeSeconds: number,
) => {
  if (seriesPoints.length === 0 || !Number.isFinite(targetTime)) {
    return null;
  }

  const safeTimeframe = Math.max(1, Math.floor(timeframeSeconds || 60));
  const bucketStart = Math.floor(targetTime / safeTimeframe) * safeTimeframe;
  const bucketFraction = (targetTime - bucketStart) / safeTimeframe;
  const bucketPoint = seriesPoints.find((point) => point.time === bucketStart);

  if (bucketPoint) {
    if (targetTime === bucketPoint.time || bucketFraction === 0) {
      return bucketPoint.logical;
    }

    return bucketPoint.logical + getIntrabarLogicalOffset(bucketFraction);
  }

  const lastPoint = seriesPoints[seriesPoints.length - 1];
  const relativeBars = (bucketStart - lastPoint.time) / safeTimeframe;
  return lastPoint.logical + relativeBars + (bucketFraction === 0 ? 0 : getIntrabarLogicalOffset(bucketFraction));
};

export const getTradeDisplayTimes = (
  trade: Pick<ActiveTrade, "marker_time" | "opened_at" | "expiry_seconds">,
  nowSec: number,
) => {
  const entryTime =
    getUnixTime(trade.marker_time) ??
    getUnixTime(trade.opened_at) ??
    Math.floor(nowSec);
  const expiryTime = entryTime + Math.max(1, Math.floor(Number(trade.expiry_seconds) || 0));
  const activeLineEndTime = Math.min(expiryTime, nowSec);

  return {
    entryTime,
    expiryTime,
    activeLineEndTime,
  };
};

export const getTradeProgress = (entryTime: number, expiryTime: number, currentTime: number) => {
  if (!Number.isFinite(entryTime) || !Number.isFinite(expiryTime) || expiryTime <= entryTime) {
    return 1;
  }

  return Math.min(1, Math.max(0, (currentTime - entryTime) / (expiryTime - entryTime)));
};

export const getTradeMarkerLogicalTime = (
  seriesPoints: SeriesPoint[],
  targetTime: number,
  timeframeSeconds: number,
) => {
  if (seriesPoints.length === 0 || !Number.isFinite(targetTime)) {
    return null;
  }

  const safeTimeframe = Math.max(1, Math.floor(timeframeSeconds || 60));
  const useFullTimeInterpolation = safeTimeframe >= HIGHER_TIMEFRAME_FULL_TIME_SECONDS;
  const firstPoint = seriesPoints[0];
  const lastPoint = seriesPoints[seriesPoints.length - 1];

  if (!useFullTimeInterpolation) {
    return getShortTimeframeLogicalTime(seriesPoints, targetTime, safeTimeframe);
  }

  if (targetTime <= firstPoint.time) {
    return firstPoint.logical;
  }

  for (let index = 0; index < seriesPoints.length - 1; index += 1) {
    const currentPoint = seriesPoints[index];
    const nextPoint = seriesPoints[index + 1];

    if (targetTime === currentPoint.time) {
      return currentPoint.logical;
    }

    if (targetTime > currentPoint.time && targetTime < nextPoint.time) {
      const span = Math.max(1, nextPoint.time - currentPoint.time);
      const fraction = (targetTime - currentPoint.time) / span;
      return currentPoint.logical + clampFraction(fraction);
    }
  }

  if (targetTime === lastPoint.time) {
    return lastPoint.logical;
  }

  if (targetTime > lastPoint.time && targetTime < lastPoint.time + safeTimeframe) {
    const fraction = (targetTime - lastPoint.time) / safeTimeframe;
    return lastPoint.logical + clampFraction(fraction);
  }

  const trailingBars = Math.max(0, (targetTime - lastPoint.time) / safeTimeframe);
  return lastPoint.logical + trailingBars;
};

export const getTradeMarkerCoordinate = (
  chart: IChartApi,
  seriesPoints: SeriesPoint[],
  targetTime: number,
  timeframeSeconds: number,
) => {
  if (seriesPoints.length === 0 || !Number.isFinite(targetTime)) {
    return null;
  }

  const logical = getTradeMarkerLogicalTime(seriesPoints, targetTime, timeframeSeconds);
  if (logical === null || !Number.isFinite(logical)) {
    return null;
  }

  const coordinate = chart.timeScale().logicalToCoordinate(logical as never);
  if (typeof coordinate === "number" && Number.isFinite(coordinate)) {
    return coordinate;
  }

  const exactTimeCoordinate = chart.timeScale().timeToCoordinate(targetTime as Time);
  return typeof exactTimeCoordinate === "number" && Number.isFinite(exactTimeCoordinate)
    ? exactTimeCoordinate
    : null;
};

const getLatestSeriesCoordinate = (
  chart: IChartApi,
  seriesPoints: SeriesPoint[],
) => {
  if (seriesPoints.length === 0) {
    return null;
  }

  const latestPoint = seriesPoints[seriesPoints.length - 1];
  const coordinate = chart.timeScale().logicalToCoordinate(latestPoint.logical as never);
  return isUsableCoordinate(coordinate) ? coordinate : null;
};

const getStoredLogicalCoordinate = (
  chart: IChartApi,
  seriesPoints: SeriesPoint[],
  markerLogical: number | null | undefined,
  entryTime: number,
  timeframeSeconds: number,
) => {
  if (!isUsableCoordinate(markerLogical) || seriesPoints.length === 0) {
    return null;
  }

  const lowerIndex = Math.max(0, Math.min(seriesPoints.length - 1, Math.floor(markerLogical)));
  const currentPoint = seriesPoints[lowerIndex];
  const nextPoint = seriesPoints[Math.min(seriesPoints.length - 1, lowerIndex + 1)];
  const pointSpan = Math.max(1, nextPoint.time - currentPoint.time || timeframeSeconds || 1);
  const logicalFraction = Math.max(0, Math.min(1, markerLogical - currentPoint.logical));
  const impliedTime = currentPoint.time + logicalFraction * pointSpan;
  const maxDrift = Math.max(3, Math.floor((timeframeSeconds || 60) * 1.25));

  if (Math.abs(impliedTime - entryTime) > maxDrift) {
    return null;
  }

  const coordinate = chart.timeScale().logicalToCoordinate(markerLogical as never);
  return isUsableCoordinate(coordinate) ? coordinate : null;
};

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades, timeframeSeconds }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tradesRef = useRef<ActiveTrade[]>([]);
  const fixedMarkerAnchorRef = useRef(fixedMarkerAnchors);

  useEffect(() => {
    const nextTrades = [...trades.filter((trade) => trade.asset_symbol === assetSymbol)].sort((left, right) => {
      const leftTime =
        getUnixTime(left.marker_time) ??
        getUnixTime(left.opened_at) ??
        0;
      const rightTime =
        getUnixTime(right.marker_time) ??
        getUnixTime(right.opened_at) ??
        0;

      return leftTime - rightTime;
    });

    tradesRef.current = nextTrades;

    const visibleAnchorKeys = new Set(nextTrades.map(getTradeAnchorKey));
    fixedMarkerAnchorRef.current.forEach((_, anchorKey) => {
      if (!visibleAnchorKeys.has(anchorKey)) {
        fixedMarkerAnchorRef.current.delete(anchorKey);
      }
    });
  }, [assetSymbol, trades]);

  useEffect(() => {
    if (!containerRef.current) return;

    let reqId = 0;

    const loop = () => {
      const el = containerRef.current;
      if (!el) return;

      const visibleTrades = tradesRef.current;

      while (el.children.length < visibleTrades.length) {
        const marker = document.createElement("div");
        marker.className = "absolute z-50 pointer-events-none transition-opacity duration-100";

        const activeLine = document.createElement("div");
        activeLine.className = "absolute";
        activeLine.style.height = "2px";
        activeLine.style.transform = "translateY(-50%)";
        activeLine.style.borderRadius = "999px";
        activeLine.style.zIndex = "2";
        activeLine.style.opacity = "1";
        marker.appendChild(activeLine);

        const projectedLine = document.createElement("div");
        projectedLine.className = "absolute";
        projectedLine.style.height = "2px";
        projectedLine.style.transform = "translateY(-50%)";
        projectedLine.style.borderRadius = "999px";
        projectedLine.style.zIndex = "1";
        projectedLine.style.opacity = "1";
        marker.appendChild(projectedLine);

        const verticalGuide = document.createElement("div");
        verticalGuide.className = "absolute";
        verticalGuide.style.width = "0";
        verticalGuide.style.borderLeft = "1px solid rgba(167, 183, 216, 0.26)";
        verticalGuide.style.transform = "translateX(-50%)";
        verticalGuide.style.zIndex = "0";
        verticalGuide.style.display = "none";
        marker.appendChild(verticalGuide);

        const tradePill = document.createElement("div");
        tradePill.className = "absolute text-[11px] font-black text-white";
        tradePill.style.zIndex = "5";
        tradePill.style.position = "absolute";
        tradePill.style.display = "flex";
        tradePill.style.flexDirection = "column";
        tradePill.style.alignItems = "flex-start";
        tradePill.style.gap = "2px";
        tradePill.style.whiteSpace = "nowrap";

        const labelRow = document.createElement("div");
        labelRow.className = "label-row";
        labelRow.style.display = "flex";
        labelRow.style.alignItems = "center";
        labelRow.style.gap = "3px";
        labelRow.style.lineHeight = "1";
        tradePill.appendChild(labelRow);

        const directionIcon = document.createElement("span");
        directionIcon.className = "direction-icon";
        directionIcon.style.display = "inline-flex";
        directionIcon.style.width = "0";
        directionIcon.style.height = "0";
        directionIcon.style.borderLeft = "4px solid transparent";
        directionIcon.style.borderRight = "4px solid transparent";
        directionIcon.style.filter = "drop-shadow(0 1px 2px rgba(0,0,0,0.6))";
        labelRow.appendChild(directionIcon);

        const amountSpan = document.createElement("span");
        amountSpan.className = "amount-text";
        amountSpan.style.display = "inline-flex";
        amountSpan.style.alignItems = "center";
        amountSpan.style.position = "relative";
        amountSpan.style.zIndex = "1";
        labelRow.appendChild(amountSpan);

        const timeSpan = document.createElement("span");
        timeSpan.className = "time-text";
        timeSpan.style.display = "block";
        timeSpan.style.fontSize = "10px";
        timeSpan.style.fontWeight = "800";
        timeSpan.style.lineHeight = "1";
        timeSpan.style.color = "rgba(214,222,241,0.9)";
        tradePill.appendChild(timeSpan);

        marker.appendChild(tradePill);

        const entryDot = document.createElement("div");
        entryDot.className = "absolute rounded-full";
        entryDot.style.transform = "translate(-50%, -50%)";
        entryDot.style.zIndex = "4";
        marker.appendChild(entryDot);

        const expiryDot = document.createElement("div");
        expiryDot.className = "absolute rounded-full";
        expiryDot.style.transform = "translate(-50%, -50%)";
        expiryDot.style.zIndex = "4";
        marker.appendChild(expiryDot);

        el.appendChild(marker);
      }

      while (el.children.length > visibleTrades.length) {
        el.removeChild(el.lastChild!);
      }

      const seriesData = series.data();
      if (!seriesData || seriesData.length === 0) {
        reqId = requestAnimationFrame(loop);
        return;
      }

      const seriesPoints = seriesData
        .map((point, logical) => {
          const time = getUnixTime(point?.time);
          return typeof time === "number" && Number.isFinite(time) ? { time, logical } : null;
        })
        .filter((point): point is SeriesPoint => point !== null);
      const nowSec = Date.now() / 1000;
      const visibleTradesSorted = [...visibleTrades].sort((left, right) => {
        const leftTime =
          getUnixTime(left.marker_time) ??
          getUnixTime(left.opened_at) ??
          0;
        const rightTime =
          getUnixTime(right.marker_time) ??
          getUnixTime(right.opened_at) ??
          0;

        return leftTime - rightTime;
      });
      visibleTradesSorted.forEach((trade, index) => {
        const marker = el.children[index] as HTMLElement;
        const rawEntryY = series.priceToCoordinate(trade.entry_price);
        const { entryTime, expiryTime } = getTradeDisplayTimes(trade, nowSec);
        const expirySeconds = Math.max(1, Number(trade.expiry_seconds) || 60);
        const secondsSinceEntry = nowSec - entryTime;
        const isFreshActiveTrade =
          nowSec <= expiryTime + 1 &&
          secondsSinceEntry >= -2 &&
          secondsSinceEntry <= expirySeconds + 10;
        const storedLogicalEntryX = getStoredLogicalCoordinate(
          chart,
          seriesPoints,
          trade.marker_logical,
          entryTime,
          timeframeSeconds,
        );
        const timeBasedEntryX = getTradeMarkerCoordinate(chart, seriesPoints, entryTime, timeframeSeconds);
        const preferredEntryX = isFreshActiveTrade
          ? timeBasedEntryX ?? storedLogicalEntryX
          : storedLogicalEntryX ?? timeBasedEntryX;
        const latestEntryX = getLatestSeriesCoordinate(chart, seriesPoints);
        const staleEntryDistance = Math.max(96, getReadableTradeLineWidth(expirySeconds) * 1.4);
        const futureProjectionDistance = Math.max(48, getReadableTradeLineWidth(expirySeconds) * 0.45);
        const shouldRepairStaleStoredPosition =
          isFreshActiveTrade &&
          isUsableCoordinate(preferredEntryX) &&
          isUsableCoordinate(latestEntryX) &&
          latestEntryX > el.clientWidth * 0.42 &&
          (preferredEntryX < latestEntryX - staleEntryDistance ||
            preferredEntryX > latestEntryX + futureProjectionDistance);
        let entryX = shouldRepairStaleStoredPosition ? latestEntryX : preferredEntryX;

        if (isFreshActiveTrade) {
          const anchorKey = getTradeAnchorKey(trade);
          const fixedEntryX = fixedMarkerAnchorRef.current.get(anchorKey);

          if (isUsableCoordinate(fixedEntryX)) {
            entryX = fixedEntryX;
          } else if (isUsableCoordinate(entryX)) {
            fixedMarkerAnchorRef.current.set(anchorKey, entryX);
          }
        }

        const entryY = rawEntryY;

        if (
          !isUsableCoordinate(entryX) ||
          !isUsableCoordinate(entryY) ||
          entryX < -MARKER_VIEW_PADDING ||
          entryX > el.clientWidth + MARKER_VIEW_PADDING ||
          entryY < -MARKER_VIEW_PADDING ||
          entryY > el.clientHeight + MARKER_VIEW_PADDING
        ) {
          marker.style.opacity = "0";
          return;
        }

        const visibleEntryX = entryX;
        const visibleEntryY = entryY;
        const maxX = Math.max(visibleEntryX, el.clientWidth - 3);
        const fullExpiryXRaw = getTradeMarkerCoordinate(chart, seriesPoints, expiryTime, timeframeSeconds);
        const projectedLeadOffset = Math.max(22, Math.min(42, el.clientWidth * 0.032));
        const progress = getTradeProgress(entryTime, expiryTime, nowSec);
        const coordinateTotalWidth =
          isUsableCoordinate(fullExpiryXRaw) && fullExpiryXRaw > visibleEntryX
            ? fullExpiryXRaw - visibleEntryX
            : projectedLeadOffset;
        const readableTotalWidth = getReadableTradeLineWidth(expirySeconds);
        const availableRightWidth = Math.max(MARKER_MIN_TOTAL_WIDTH, maxX - visibleEntryX);
        const totalLineWidth = Math.max(
          MARKER_MIN_LINE_WIDTH,
          Math.min(Math.max(coordinateTotalWidth, readableTotalWidth), availableRightWidth),
        );
        const activeWidth = Math.max(
          MARKER_MIN_LINE_WIDTH,
          Math.min(totalLineWidth, totalLineWidth * progress),
        );
        const projectedWidth = Math.max(0, totalLineWidth - activeWidth);
        const isHigher = trade.direction === "higher";
        const accent = isHigher ? TRADING_UP_COLOR : TRADING_DOWN_COLOR;
        const amountLabel = formatTradeAmountLabel(trade.amount);

        const activeLine = marker.children[0] as HTMLElement;
        const projectedLine = marker.children[1] as HTMLElement;
        const verticalGuide = marker.children[2] as HTMLElement;
        const tradePill = marker.children[3] as HTMLElement;
        const directionIcon = tradePill.querySelector(".direction-icon") as HTMLElement;
        const amountSpan = tradePill.querySelector(".amount-text") as HTMLElement;
        const timeSpan = tradePill.querySelector(".time-text") as HTMLElement;
        const entryDot = marker.children[4] as HTMLElement;
        const activeDot = marker.children[5] as HTMLElement;

        marker.style.opacity = "1";
        marker.style.left = `${visibleEntryX}px`;
        marker.style.top = `${visibleEntryY}px`;

        verticalGuide.style.display = "none";
        verticalGuide.style.opacity = "0";

        activeLine.style.left = "0px";
        activeLine.style.width = `${activeWidth}px`;
        activeLine.style.background = accent;
        activeLine.style.height = "2px";
        activeLine.style.boxShadow = `0 0 10px ${hexToRgba(accent, 0.38)}`;

        projectedLine.style.left = `${Math.max(activeWidth, 0)}px`;
        projectedLine.style.width = `${projectedWidth}px`;
        projectedLine.style.background = accent;
        projectedLine.style.boxShadow = `0 0 10px ${hexToRgba(accent, 0.34)}`;
        projectedLine.style.height = "2px";
        projectedLine.style.opacity = projectedWidth > 0 ? "1" : "0";

        tradePill.style.background = "transparent";
        tradePill.style.borderColor = "transparent";
        tradePill.style.boxShadow = "none";
        tradePill.style.paddingLeft = "0";
        tradePill.style.paddingRight = "0";
        tradePill.style.paddingTop = "0";
        tradePill.style.paddingBottom = "0";
        tradePill.style.borderRadius = "0";
        tradePill.style.textShadow = "0 1px 3px rgba(0,0,0,0.82)";
        directionIcon.style.borderTop = isHigher ? "0" : "7px solid #ffffff";
        directionIcon.style.borderBottom = isHigher ? "7px solid #ffffff" : "0";
        amountSpan.textContent = amountLabel;
        amountSpan.style.letterSpacing = "0";
        amountSpan.style.fontSize = "12px";
        amountSpan.style.fontWeight = "900";
        amountSpan.style.color = "#ffffff";
        timeSpan.textContent = formatTradeCountdown(expiryTime - nowSec);

        const pillWidth = tradePill.offsetWidth || 56;
        const canFitLeft = visibleEntryX > pillWidth + 14;
        const pillLeftOffset = canFitLeft ? -(pillWidth + 9) : 10;
        tradePill.style.top = "-5px";
        tradePill.style.left = `${pillLeftOffset}px`;
        tradePill.style.transform = "translateY(-100%)";

        entryDot.style.left = "0px";
        entryDot.style.top = "0px";
        entryDot.style.width = "8px";
        entryDot.style.height = "8px";
        entryDot.style.background = accent;
        entryDot.style.border = "2px solid #ffffff";
        entryDot.style.boxShadow = `0 0 0 2px ${hexToRgba(accent, 0.32)}, 0 0 12px ${hexToRgba(accent, 0.58)}`;

        activeDot.style.left = `${activeWidth}px`;
        activeDot.style.top = "0px";
        activeDot.style.width = "0px";
        activeDot.style.height = "0px";
        activeDot.style.opacity = "0";
        activeDot.style.background = "transparent";
        activeDot.style.border = "0";
        activeDot.style.boxShadow = "none";
      });

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [assetSymbol, chart, series, timeframeSeconds]);

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 92 }} />;
};
