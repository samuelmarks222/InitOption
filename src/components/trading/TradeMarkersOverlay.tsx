import React, { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType } from "lightweight-charts";
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
    return value > 1_000_000_000_000 ? Math.floor(value / 1000) : value;
  }

  if (typeof value === "string") {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue > 1_000_000_000_000 ? Math.floor(numericValue / 1000) : numericValue;
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatCountdown = (seconds: number) => {
  const totalSeconds = Math.max(0, Math.ceil(seconds));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  if (days > 0) {
    return `${days}d ${hours}:${minutes}`;
  }

  if (totalSeconds >= 3600) {
    return `${hours}:${minutes}:${remainder}`;
  }

  return `${minutes}:${remainder}`;
};

const formatTradeClock = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--:--";
  }

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const rectanglesOverlap = (
  first: { left: number; right: number; top: number; bottom: number },
  second: { left: number; right: number; top: number; bottom: number },
) => first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades, timeframeSeconds }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tradesRef = useRef<ActiveTrade[]>([]);

  useEffect(() => {
    tradesRef.current = trades.filter((trade) => trade.asset_symbol === assetSymbol);
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

        const glowLine = document.createElement("div");
        glowLine.className = "absolute";
        glowLine.style.height = "0px";
        glowLine.style.transform = "translateY(-50%)";
        glowLine.style.borderRadius = "999px";
        glowLine.style.filter = "none";
        glowLine.style.opacity = "0";
        glowLine.style.zIndex = "1";
        marker.appendChild(glowLine);

        const dashedLine = document.createElement("div");
        dashedLine.className = "absolute";
        dashedLine.style.height = "1px";
        dashedLine.style.transform = "translateY(-50%)";
        dashedLine.style.borderRadius = "999px";
        dashedLine.style.zIndex = "2";
        marker.appendChild(dashedLine);

        const tradePill = document.createElement("div");
        tradePill.className = "absolute flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black text-white";
        tradePill.style.zIndex = "5";

        const directionBadge = document.createElement("span");
        directionBadge.className = "direction-badge inline-flex h-[16px] w-[16px] items-center justify-center rounded-full";
        tradePill.appendChild(directionBadge);

        const amountSpan = document.createElement("span");
        amountSpan.className = "amount-text";
        tradePill.appendChild(amountSpan);

        const openedAtSpan = document.createElement("span");
        openedAtSpan.className = "opened-at-text";
        tradePill.appendChild(openedAtSpan);

        marker.appendChild(tradePill);

        const countdownBadge = document.createElement("div");
        countdownBadge.className = "absolute rounded-md border px-1.5 py-[2px] text-[10px] font-black text-white";
        countdownBadge.style.transform = "translate(-50%, -50%)";
        countdownBadge.style.zIndex = "6";
        marker.appendChild(countdownBadge);

        const entryDot = document.createElement("div");
        entryDot.className = "absolute h-[10px] w-[10px] rounded-full";
        entryDot.style.transform = "translate(-50%, -50%)";
        entryDot.style.zIndex = "4";
        marker.appendChild(entryDot);

        const expiryDot = document.createElement("div");
        expiryDot.className = "absolute h-[10px] w-[10px] rounded-full";
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
        .filter((point): point is { time: number; logical: number } => point !== null);

      const resolveLogicalTime = (targetTime: number) => {
        if (seriesPoints.length === 0) return null;

        const firstPoint = seriesPoints[0];
        const lastPoint = seriesPoints[seriesPoints.length - 1];

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
            return currentPoint.logical + fraction;
          }
        }

        if (targetTime === lastPoint.time) {
          return lastPoint.logical;
        }

        const safeTimeframe = Math.max(1, Math.floor(timeframeSeconds || 60));
        const trailingFraction = Math.min(1, Math.max(0, (targetTime - lastPoint.time) / safeTimeframe));
        return lastPoint.logical + trailingFraction;
      };

      const nowSec = Date.now() / 1000;
      const currentLogical = resolveLogicalTime(nowSec);
      const safeTimeframe = Math.max(1, Math.floor(timeframeSeconds || 60));
      const occupiedPillRects: Array<{ left: number; right: number; top: number; bottom: number }> = [];

      visibleTrades.forEach((trade, index) => {
        const marker = el.children[index] as HTMLElement;
        const openedAtMs = new Date(trade.opened_at).getTime();
        const elapsedSeconds = Number.isNaN(openedAtMs)
          ? Math.max(0, trade.expiry_seconds - trade.timeLeft)
          : Math.max(0, (Date.now() - openedAtMs) / 1000);
        const remainingSeconds = Number.isNaN(openedAtMs)
          ? trade.timeLeft
          : Math.max(0, (openedAtMs + trade.expiry_seconds * 1000 - Date.now()) / 1000);
        const entryY = series.priceToCoordinate(trade.entry_price);
        const progress = clamp(elapsedSeconds / Math.max(1, trade.expiry_seconds), 0, 1);
        const remainingRatio = clamp(remainingSeconds / Math.max(1, trade.expiry_seconds), 0, 1);
        const displaySpanLogical = clamp((trade.expiry_seconds / safeTimeframe) * 1.25, 0.8, 3.2);
        const entryLogical =
          currentLogical !== null ? currentLogical - displaySpanLogical * progress : null;
        const expiryLogical =
          currentLogical !== null ? currentLogical + displaySpanLogical * remainingRatio : null;

        const entryX = entryLogical !== null ? chart.timeScale().logicalToCoordinate(entryLogical) : null;

        if (entryX === null || entryY === null || Number.isNaN(entryX)) {
          marker.style.opacity = "0";
          return;
        }

        const maxX = Math.max(28, el.clientWidth - 10);
        const expiryXRaw = expiryLogical !== null ? chart.timeScale().logicalToCoordinate(expiryLogical) : null;
        const sameBucketOffset = Math.max(22, Math.min(36, el.clientWidth * 0.03));
        const expiryX = expiryXRaw === null || Number.isNaN(expiryXRaw)
          ? Math.min(maxX, entryX + sameBucketOffset)
          : Math.max(entryX + 22, Math.min(expiryXRaw, maxX));
        const lineWidth = Math.max(34, expiryX - entryX);
        const isHigher = trade.direction === "higher";
        const accent = isHigher ? "#18d87d" : "#ff6a72";
        const pulseMix = (Math.sin(performance.now() / 300 + index * 0.7) + 1) / 2;
        const amountLabel = Number.isInteger(trade.amount) ? `${trade.amount.toFixed(0)} $` : `${trade.amount.toFixed(2)} $`;
        const timerLabel = formatCountdown(remainingSeconds);
        const openedAtLabel = formatTradeClock(trade.opened_at);
        const pillGap = 28;
        const rightPlacementThreshold = 156;

        const glowLine = marker.children[0] as HTMLElement;
        const dashedLine = marker.children[1] as HTMLElement;
        const tradePill = marker.children[2] as HTMLElement;
        const countdownBadge = marker.children[3] as HTMLElement;
        const directionBadge = tradePill.querySelector(".direction-badge") as HTMLElement;
        const amountSpan = tradePill.querySelector(".amount-text") as HTMLElement;
        const openedAtSpan = tradePill.querySelector(".opened-at-text") as HTMLElement;
        const entryDot = marker.children[4] as HTMLElement;
        const expiryDot = marker.children[5] as HTMLElement;

        marker.style.opacity = "1";
        marker.style.left = `${entryX}px`;
        marker.style.top = `${entryY}px`;

        glowLine.style.left = "0px";
        glowLine.style.width = `${lineWidth}px`;
        glowLine.style.background = "transparent";

        dashedLine.style.left = "0px";
        dashedLine.style.width = `${lineWidth}px`;
        dashedLine.style.background = hexToRgba(accent, 0.78);
        dashedLine.style.boxShadow = "none";

        const pillTop = isHigher ? "#27ef8d" : "#ff7a70";
        const pillBottom = isHigher ? "#15b863" : "#ef6259";
        const pillBorder = isHigher ? "#8bfbc0" : "#ffb0ab";
        tradePill.style.background = `linear-gradient(180deg, ${hexToRgba(pillTop, 0.98)}, ${hexToRgba(pillBottom, 0.96)})`;
        tradePill.style.borderColor = hexToRgba(pillBorder, 0.36);
        tradePill.style.boxShadow = `0 6px 12px ${hexToRgba(accent, 0.18)}`;

        directionBadge.style.background = "rgba(255,255,255,0.2)";
        directionBadge.innerHTML = isHigher
          ? '<svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 1.5L4.5 7.5" stroke="white" stroke-width="1.4" stroke-linecap="round"/><path d="M2.5 3.5L4.5 1.5L6.5 3.5" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          : '<svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 1.5L4.5 7.5" stroke="white" stroke-width="1.4" stroke-linecap="round"/><path d="M2.5 5.5L4.5 7.5L6.5 5.5" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        amountSpan.textContent = amountLabel;
        amountSpan.style.whiteSpace = "nowrap";
        openedAtSpan.textContent = openedAtLabel;
        openedAtSpan.style.color = "rgba(255,255,255,0.78)";
        openedAtSpan.style.fontWeight = "900";
        openedAtSpan.style.fontSize = "10px";
        openedAtSpan.style.letterSpacing = "0.01em";
        openedAtSpan.style.whiteSpace = "nowrap";

        countdownBadge.textContent = timerLabel;
        countdownBadge.style.background = "rgba(45, 50, 66, 0.92)";
        countdownBadge.style.borderColor = "rgba(255,255,255,0.08)";
        countdownBadge.style.boxShadow = "0 6px 12px rgba(0,0,0,0.18)";
        countdownBadge.style.color = "rgba(255,255,255,0.92)";

        const pillWidth = tradePill.offsetWidth || 96;
        const pillHeight = tradePill.offsetHeight || 28;
        const shouldPlaceRight = entryX < rightPlacementThreshold;
        const basePillLeft = shouldPlaceRight ? entryX + pillGap : entryX - pillWidth - pillGap;
        const laneStep = pillHeight + 8;
        const prefersUpwardStack = entryY > el.clientHeight * 0.45;
        const candidateOffsets =
          entryY < 72
            ? [0, laneStep, laneStep * 2, laneStep * 3, -laneStep, -laneStep * 2, -laneStep * 3]
            : entryY > el.clientHeight - 72
              ? [0, -laneStep, -laneStep * 2, -laneStep * 3, laneStep, laneStep * 2, laneStep * 3]
              : prefersUpwardStack
                ? [0, -laneStep, -laneStep * 2, -laneStep * 3, laneStep, laneStep * 2, laneStep * 3]
                : [0, laneStep, laneStep * 2, laneStep * 3, -laneStep, -laneStep * 2, -laneStep * 3];

        let pillVerticalOffset = 0;
        for (const offset of candidateOffsets) {
          const candidateRect = {
            left: basePillLeft,
            right: basePillLeft + pillWidth,
            top: entryY + offset - pillHeight / 2,
            bottom: entryY + offset + pillHeight / 2,
          };

          if (!occupiedPillRects.some((rect) => rectanglesOverlap(rect, candidateRect))) {
            pillVerticalOffset = offset;
            occupiedPillRects.push(candidateRect);
            break;
          }
        }

        tradePill.style.top = `${pillVerticalOffset}px`;
        if (shouldPlaceRight) {
          tradePill.style.left = `${pillGap}px`;
          tradePill.style.transform = "translate(0, -50%)";
        } else {
          tradePill.style.left = "0px";
          tradePill.style.transform = `translate(calc(-100% - ${pillGap}px), -50%)`;
        }

        const countdownBadgeWidth = countdownBadge.offsetWidth || 40;
        countdownBadge.style.left = `${clamp(lineWidth * 0.6, countdownBadgeWidth / 2 + 4, lineWidth - countdownBadgeWidth / 2 - 4)}px`;
        countdownBadge.style.top = "-18px";

        entryDot.style.left = "0px";
        entryDot.style.top = "0px";
        entryDot.style.background = "#ffffff";
        entryDot.style.border = `2px solid ${accent}`;
        entryDot.style.boxShadow = "none";

        expiryDot.style.left = `${lineWidth}px`;
        expiryDot.style.top = "0px";
        expiryDot.style.background = "#ffffff";
        expiryDot.style.border = `2px solid ${accent}`;
        expiryDot.style.boxShadow = `0 0 0 ${1.2 + pulseMix * 1.3}px ${hexToRgba(accent, 0.16)}, 0 0 8px ${hexToRgba(accent, 0.6)}, 0 0 16px ${hexToRgba(accent, 0.34)}`;
      });

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [assetSymbol, chart, series, timeframeSeconds]);

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 47 }} />;
};
