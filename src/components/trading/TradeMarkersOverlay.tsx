import React, { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

interface Props {
  chart: IChartApi;
  series: ISeriesApi<any>;
  assetSymbol: string;
  trades: ActiveTrade[];
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

const formatCountdown = (seconds: number) => {
  const totalSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainder}`;
};

const rectanglesOverlap = (
  first: { left: number; right: number; top: number; bottom: number },
  second: { left: number; right: number; top: number; bottom: number },
) => first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;

export const TradeMarkersOverlay = ({ chart, series, assetSymbol, trades }: Props) => {
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
        glowLine.style.height = "10px";
        glowLine.style.transform = "translateY(-50%)";
        glowLine.style.borderRadius = "999px";
        glowLine.style.filter = "blur(6px)";
        glowLine.style.opacity = "0.22";
        glowLine.style.zIndex = "1";
        marker.appendChild(glowLine);

        const dashedLine = document.createElement("div");
        dashedLine.className = "absolute";
        dashedLine.style.height = "0";
        dashedLine.style.transform = "translateY(-50%)";
        dashedLine.style.borderTop = "2px solid #ff6a72";
        dashedLine.style.zIndex = "2";
        marker.appendChild(dashedLine);

        const tradePill = document.createElement("div");
        tradePill.className = "absolute flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black text-white shadow-[0_12px_24px_rgba(0,0,0,0.42)]";
        tradePill.style.zIndex = "5";

        const directionBadge = document.createElement("span");
        directionBadge.className = "direction-badge inline-flex h-[16px] w-[16px] items-center justify-center rounded-full";
        tradePill.appendChild(directionBadge);

        const amountSpan = document.createElement("span");
        amountSpan.className = "amount-text";
        tradePill.appendChild(amountSpan);

        const countdownSpan = document.createElement("span");
        countdownSpan.className = "countdown-text";
        tradePill.appendChild(countdownSpan);

        marker.appendChild(tradePill);

        const entryDot = document.createElement("div");
        entryDot.className = "absolute h-[12px] w-[12px] rounded-full bg-white";
        entryDot.style.transform = "translate(-50%, -50%)";
        entryDot.style.zIndex = "4";
        marker.appendChild(entryDot);

        const expiryDot = document.createElement("div");
        expiryDot.className = "absolute h-[12px] w-[12px] rounded-full bg-white";
        expiryDot.style.transform = "translate(-50%, -50%)";
        expiryDot.style.zIndex = "4";
        marker.appendChild(expiryDot);

        el.appendChild(marker);
      }

      while (el.children.length > visibleTrades.length) {
        el.removeChild(el.lastChild!);
      }

      const seriesData = series.data() as any[];
      if (!seriesData || seriesData.length === 0) {
        reqId = requestAnimationFrame(loop);
        return;
      }

      const occupiedPillRects: Array<{ left: number; right: number; top: number; bottom: number }> = [];

      visibleTrades.forEach((trade, index) => {
        const marker = el.children[index] as HTMLElement;
        const entryTime = getUnixTime(trade.marker_time ?? trade.opened_at);
        const entryX = entryTime !== null ? chart.timeScale().timeToCoordinate(entryTime as Time) : null;
        const entryY = series.priceToCoordinate(trade.entry_price);

        if (entryX === null || entryY === null || Number.isNaN(entryX)) {
          marker.style.opacity = "0";
          return;
        }

        const maxX = Math.max(28, el.clientWidth - 10);
        const expiryTime = entryTime + trade.expiry_seconds;
        const expiryXRaw = chart.timeScale().timeToCoordinate(expiryTime as Time);
        const expiryX = expiryXRaw === null || Number.isNaN(expiryXRaw) ? maxX : Math.max(entryX + 34, Math.min(expiryXRaw, maxX));
        const lineWidth = Math.max(34, expiryX - entryX);
        const isHigher = trade.direction === "higher";
        const accent = isHigher ? "#18d87d" : "#ff6a72";
        const pulseMix = (Math.sin(performance.now() / 300 + index * 0.7) + 1) / 2;
        const amountLabel = Number.isInteger(trade.amount) ? `${trade.amount.toFixed(0)} $` : `${trade.amount.toFixed(2)} $`;
        const openedAtMs = new Date(trade.opened_at).getTime();
        const remainingSeconds = Number.isNaN(openedAtMs)
          ? trade.timeLeft
          : Math.max(0, (openedAtMs + trade.expiry_seconds * 1000 - Date.now()) / 1000);
        const timerLabel = formatCountdown(remainingSeconds);
        const pillGap = 28;
        const rightPlacementThreshold = 156;

        const glowLine = marker.children[0] as HTMLElement;
        const dashedLine = marker.children[1] as HTMLElement;
        const tradePill = marker.children[2] as HTMLElement;
        const directionBadge = tradePill.querySelector(".direction-badge") as HTMLElement;
        const amountSpan = tradePill.querySelector(".amount-text") as HTMLElement;
        const countdownSpan = tradePill.querySelector(".countdown-text") as HTMLElement;
        const entryDot = marker.children[3] as HTMLElement;
        const expiryDot = marker.children[4] as HTMLElement;

        marker.style.opacity = "1";
        marker.style.left = `${entryX}px`;
        marker.style.top = `${entryY}px`;

        glowLine.style.left = "0px";
        glowLine.style.width = `${lineWidth}px`;
        glowLine.style.background = hexToRgba(accent, 0.08);

        dashedLine.style.left = "0px";
        dashedLine.style.width = `${lineWidth}px`;
        dashedLine.style.borderTopColor = accent;

        tradePill.style.background = accent;
        tradePill.style.borderColor = hexToRgba(accent, 0.9);
        tradePill.style.boxShadow = `0 10px 20px ${hexToRgba(accent, 0.18)}`;

        directionBadge.style.background = "rgba(255,255,255,0.18)";
        directionBadge.innerHTML = isHigher
          ? '<svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 1.5L4.5 7.5" stroke="white" stroke-width="1.4" stroke-linecap="round"/><path d="M2.5 3.5L4.5 1.5L6.5 3.5" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          : '<svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 1.5L4.5 7.5" stroke="white" stroke-width="1.4" stroke-linecap="round"/><path d="M2.5 5.5L4.5 7.5L6.5 5.5" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        amountSpan.textContent = amountLabel;
        amountSpan.style.whiteSpace = "nowrap";
        countdownSpan.textContent = timerLabel;
        countdownSpan.style.color = "rgba(255,255,255,0.78)";
        countdownSpan.style.fontWeight = "800";
        countdownSpan.style.fontSize = "10px";
        countdownSpan.style.letterSpacing = "0.01em";
        countdownSpan.style.whiteSpace = "nowrap";

        const pillWidth = tradePill.offsetWidth || 96;
        const pillHeight = tradePill.offsetHeight || 28;
        const shouldPlaceRight = entryX < rightPlacementThreshold;
        const basePillLeft = shouldPlaceRight ? entryX + pillGap : entryX - pillWidth - pillGap;
        const laneStep = pillHeight + 8;
        const candidateOffsets =
          entryY < 72
            ? [0, laneStep, laneStep * 2, -laneStep, -laneStep * 2, laneStep * 3, -laneStep * 3]
            : entryY > el.clientHeight - 72
              ? [0, -laneStep, -laneStep * 2, laneStep, laneStep * 2, -laneStep * 3, laneStep * 3]
              : [0, -laneStep, laneStep, -laneStep * 2, laneStep * 2, -laneStep * 3, laneStep * 3];

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

        entryDot.style.left = "0px";
        entryDot.style.top = "0px";
        entryDot.style.border = `2px solid ${accent}`;
        entryDot.style.boxShadow = `0 0 0 ${1 + pulseMix * 1.5}px ${hexToRgba(accent, 0.1)}`;

        expiryDot.style.left = `${lineWidth}px`;
        expiryDot.style.top = "0px";
        expiryDot.style.border = `2px solid ${accent}`;
        expiryDot.style.boxShadow = `0 0 0 ${1 + pulseMix * 1.5}px ${hexToRgba(accent, 0.1)}`;
      });

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [assetSymbol, chart, series]);

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 45 }} />;
};
