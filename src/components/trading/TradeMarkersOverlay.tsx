import React, { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, type Time } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

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

const rectanglesOverlap = (
  first: { left: number; right: number; top: number; bottom: number },
  second: { left: number; right: number; top: number; bottom: number },
) => first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;

type SeriesPoint = {
  time: number;
  logical: number;
};

const HIGHER_TIMEFRAME_BUCKET_SNAP_SECONDS = 5 * 60;
const INTRABAR_LOGICAL_SPAN = 0.72;

const clampFraction = (value: number) => Math.min(1, Math.max(0, value));

const getIntrabarLogicalOffset = (fraction: number) =>
  (clampFraction(fraction) - 0.5) * INTRABAR_LOGICAL_SPAN;

const formatTradeAmountLabel = (amount: number) => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return Number.isInteger(safeAmount) ? `$ ${safeAmount.toFixed(0)}` : `$ ${safeAmount.toFixed(2)}`;
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
  const snapToBucketCenter = safeTimeframe >= HIGHER_TIMEFRAME_BUCKET_SNAP_SECONDS;
  const firstPoint = seriesPoints[0];
  const lastPoint = seriesPoints[seriesPoints.length - 1];

  if (!snapToBucketCenter) {
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
      if (snapToBucketCenter) {
        return currentPoint.logical;
      }

      const span = Math.max(1, nextPoint.time - currentPoint.time);
      const fraction = (targetTime - currentPoint.time) / span;
      return currentPoint.logical + getIntrabarLogicalOffset(fraction);
    }
  }

  if (targetTime === lastPoint.time) {
    return lastPoint.logical;
  }

  if (targetTime > lastPoint.time && targetTime < lastPoint.time + safeTimeframe) {
    if (snapToBucketCenter) {
      return lastPoint.logical;
    }

    const fraction = (targetTime - lastPoint.time) / safeTimeframe;
    return lastPoint.logical + getIntrabarLogicalOffset(fraction);
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

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades, timeframeSeconds }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tradesRef = useRef<ActiveTrade[]>([]);

  useEffect(() => {
    tradesRef.current = [...trades.filter((trade) => trade.asset_symbol === assetSymbol)].sort((left, right) => {
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
        activeLine.style.height = "1px";
        activeLine.style.transform = "translateY(-50%)";
        activeLine.style.borderRadius = "999px";
        activeLine.style.zIndex = "2";
        activeLine.style.opacity = "1";
        marker.appendChild(activeLine);

        const projectedLine = document.createElement("div");
        projectedLine.className = "absolute";
        projectedLine.style.height = "1px";
        projectedLine.style.transform = "translateY(-50%)";
        projectedLine.style.borderRadius = "999px";
        projectedLine.style.zIndex = "1";
        projectedLine.style.opacity = "1";
        marker.appendChild(projectedLine);

        const tradePill = document.createElement("div");
        tradePill.className = "absolute rounded-full border text-[11px] font-black text-white";
        tradePill.style.zIndex = "5";
        tradePill.style.position = "absolute";
        tradePill.style.display = "flex";
        tradePill.style.alignItems = "center";
        tradePill.style.gap = "2px";
        tradePill.style.whiteSpace = "nowrap";
        tradePill.style.overflow = "hidden";

        const pillPattern = document.createElement("span");
        pillPattern.className = "pill-pattern";
        pillPattern.style.position = "absolute";
        pillPattern.style.left = "0";
        pillPattern.style.bottom = "0";
        pillPattern.style.width = "20px";
        pillPattern.style.height = "18px";
        pillPattern.style.opacity = "0.35";
        pillPattern.style.backgroundImage =
          "radial-gradient(rgba(130,20,20,0.38) 1px, transparent 1px)";
        pillPattern.style.backgroundSize = "5px 5px";
        pillPattern.style.pointerEvents = "none";
        tradePill.appendChild(pillPattern);

        const iconBubble = document.createElement("span");
        iconBubble.className = "direction-icon";
        iconBubble.style.display = "inline-flex";
        iconBubble.style.alignItems = "center";
        iconBubble.style.justifyContent = "center";
        iconBubble.style.position = "relative";
        iconBubble.style.zIndex = "1";
        iconBubble.style.width = "4px";
        iconBubble.style.height = "4px";
        iconBubble.style.borderRadius = "999px";
        iconBubble.style.background = "rgba(255,255,255,0.14)";
        iconBubble.style.fontSize = "2px";
        iconBubble.style.lineHeight = "1";
        tradePill.appendChild(iconBubble);

        const amountSpan = document.createElement("span");
        amountSpan.className = "amount-text";
        amountSpan.style.display = "inline-flex";
        amountSpan.style.alignItems = "center";
        amountSpan.style.position = "relative";
        amountSpan.style.zIndex = "1";
        tradePill.appendChild(amountSpan);

        marker.appendChild(tradePill);

        const entryDot = document.createElement("div");
        entryDot.className = "absolute h-[9px] w-[9px] rounded-full";
        entryDot.style.transform = "translate(-50%, -50%)";
        entryDot.style.zIndex = "4";
        marker.appendChild(entryDot);

        const expiryDot = document.createElement("div");
        expiryDot.className = "absolute h-[9px] w-[9px] rounded-full";
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
        const entryY = series.priceToCoordinate(trade.entry_price);
        const { entryTime, expiryTime, activeLineEndTime } = getTradeDisplayTimes(trade, nowSec);
        const entryX = getTradeMarkerCoordinate(chart, seriesPoints, entryTime, timeframeSeconds);

        if (
          entryX === null ||
          entryY === null ||
          Number.isNaN(entryX) ||
          entryX < -32 ||
          entryX > el.clientWidth + 32
        ) {
          marker.style.opacity = "0";
          return;
        }

        const maxX = Math.max(28, el.clientWidth - 10);
        const activeEndXRaw = getTradeMarkerCoordinate(chart, seriesPoints, activeLineEndTime, timeframeSeconds);
        const fullExpiryXRaw = getTradeMarkerCoordinate(chart, seriesPoints, expiryTime, timeframeSeconds);
        const minimumActiveOffset = 1;
        const projectedLeadOffset = Math.max(18, Math.min(34, el.clientWidth * 0.028));
        const activeEndX = activeEndXRaw === null || Number.isNaN(activeEndXRaw)
          ? Math.min(maxX, entryX + minimumActiveOffset)
          : Math.max(entryX + minimumActiveOffset, Math.min(activeEndXRaw, maxX));
        const fullExpiryX = fullExpiryXRaw === null || Number.isNaN(fullExpiryXRaw)
          ? Math.min(maxX, activeEndX + projectedLeadOffset)
          : Math.max(activeEndX + projectedLeadOffset, Math.min(fullExpiryXRaw, maxX));
        const activeWidth = Math.max(minimumActiveOffset, activeEndX - entryX);
        const projectedWidth = Math.max(0, fullExpiryX - activeEndX);
        const isHigher = trade.direction === "higher";
        const accent = isHigher ? "#18d87d" : "#ff6a72";
        const amountLabel = formatTradeAmountLabel(trade.amount);

        const activeLine = marker.children[0] as HTMLElement;
        const projectedLine = marker.children[1] as HTMLElement;
        const tradePill = marker.children[2] as HTMLElement;
        const iconBubble = tradePill.querySelector(".direction-icon") as HTMLElement;
        const amountSpan = tradePill.querySelector(".amount-text") as HTMLElement;
        const entryDot = marker.children[3] as HTMLElement;
        const activeDot = marker.children[4] as HTMLElement;

        marker.style.opacity = "1";
        marker.style.left = `${entryX}px`;
        marker.style.top = `${entryY}px`;

        activeLine.style.left = "0px";
        activeLine.style.width = `${activeWidth}px`;
        activeLine.style.background = accent;
        activeLine.style.boxShadow = "none";

        projectedLine.style.left = `${Math.max(activeWidth - 1, 0)}px`;
        projectedLine.style.width = `${projectedWidth}px`;
        projectedLine.style.background = hexToRgba(accent, 0.68);
        projectedLine.style.boxShadow = "none";
        projectedLine.style.opacity = projectedWidth > 0 ? "1" : "0";

        const pillFill = isHigher ? "linear-gradient(180deg,#25cb79 0%,#1aa663 100%)" : "linear-gradient(180deg,#f47a71 0%,#db5b53 100%)";
        tradePill.style.background = pillFill;
        tradePill.style.borderColor = "rgba(255,255,255,0.09)";
        tradePill.style.boxShadow = `0 10px 20px ${hexToRgba(accent, 0.24)}`;
        tradePill.style.paddingLeft = "7px";
        tradePill.style.paddingRight = "9px";
        tradePill.style.paddingTop = "4px";
        tradePill.style.paddingBottom = "4px";
        tradePill.style.borderRadius = "13px";
        iconBubble.textContent = isHigher ? "↑" : "↓";
        amountSpan.textContent = amountLabel;
        amountSpan.style.letterSpacing = "0";
        amountSpan.style.fontSize = "11px";
        amountSpan.style.fontWeight = "900";

        const pillWidth = tradePill.offsetWidth || 56;
        const desiredPillOffset = -(pillWidth - 1);
        const minimumVisibleWidth = 18;
        const minClippedOffset = -entryX - pillWidth + minimumVisibleWidth;
        const pillLeftOffset = Math.max(desiredPillOffset, minClippedOffset);
        tradePill.style.top = "0px";
        tradePill.style.left = `${pillLeftOffset}px`;
        tradePill.style.transform = "translate(0, -50%)";

        entryDot.style.left = "0px";
        entryDot.style.top = "0px";
        entryDot.style.background = "#ffffff";
        entryDot.style.border = `2px solid ${accent}`;
        entryDot.style.boxShadow = `0 0 8px ${hexToRgba(accent, 0.24)}`;

        activeDot.style.left = `${activeWidth}px`;
        activeDot.style.top = "0px";
        activeDot.style.background = "#ffffff";
        activeDot.style.border = `2px solid ${accent}`;
        activeDot.style.boxShadow = `0 0 8px ${hexToRgba(accent, 0.24)}`;
      });

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [assetSymbol, chart, series, timeframeSeconds]);

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 47 }} />;
};
