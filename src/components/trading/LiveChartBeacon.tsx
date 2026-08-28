import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, Time } from "lightweight-charts";

interface Props {
  chart: IChartApi;
  series: ISeriesApi<any>;
  timeframeSeconds: number;
  livePrice?: number | null;
  liveTime?: number | null;
  liveLogical?: number | null;
}

const BEACON_COLOR = "#159bff";
const BEACON_RGB = "21,155,255";
type SeriesPoint = { time?: unknown; value?: number; close?: number; high?: number; low?: number; open?: number };

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

export const LiveChartBeacon = ({ chart, series, timeframeSeconds, livePrice, liveTime, liveLogical }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef({ livePrice, liveTime, liveLogical });

  useEffect(() => {
    liveRef.current = { livePrice, liveTime, liveLogical };
  }, [liveLogical, livePrice, liveTime]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const marker = document.createElement("div");
    marker.className = "absolute pointer-events-none";

    const pulse = document.createElement("div");
    pulse.className = "absolute rounded-full";
    pulse.style.width = "12px";
    pulse.style.height = "12px";
    pulse.style.transform = "translate(-50%, -50%) scale(1)";
    marker.appendChild(pulse);

    const dot = document.createElement("div");
    dot.className = "absolute rounded-full";
    dot.style.width = "5px";
    dot.style.height = "5px";
    dot.style.transform = "translate(-50%, -50%)";
    dot.style.border = "1px solid rgba(198,232,255,0.92)";
    marker.appendChild(dot);

    el.appendChild(marker);

    let reqId = 0;

    const getLastPoint = () => {
      const getData = (series as unknown as { data?: () => SeriesPoint[] }).data;
      if (typeof getData !== "function") return null;

      const data = getData.call(series);
      return data[data.length - 1] ?? null;
    };

    const loop = () => {
      const host = containerRef.current;
      if (!host) return;

      const liveSnapshot = liveRef.current;
      const needsFallback =
        typeof liveSnapshot.livePrice !== "number" ||
        !Number.isFinite(liveSnapshot.livePrice) ||
        typeof liveSnapshot.liveTime !== "number" ||
        !Number.isFinite(liveSnapshot.liveTime);
      const lastPoint = needsFallback ? getLastPoint() : null;
      const lastTime = lastPoint ? getUnixTime(lastPoint.time) : null;
      const lastPrice = lastPoint
        ? typeof lastPoint.value === "number"
          ? lastPoint.value
          : typeof lastPoint.close === "number"
            ? lastPoint.close
            : typeof lastPoint.high === "number"
              ? lastPoint.high
              : typeof lastPoint.open === "number"
                ? lastPoint.open
                : null
        : null;
      const resolvedPrice =
        typeof liveSnapshot.livePrice === "number" && Number.isFinite(liveSnapshot.livePrice)
          ? liveSnapshot.livePrice
          : lastPrice;
      const x =
        typeof liveSnapshot.liveTime === "number" && Number.isFinite(liveSnapshot.liveTime)
          ? chart.timeScale().timeToCoordinate(liveSnapshot.liveTime as Time)
          : typeof liveSnapshot.liveLogical === "number" && Number.isFinite(liveSnapshot.liveLogical)
            ? chart.timeScale().logicalToCoordinate(liveSnapshot.liveLogical as never)
            : lastTime !== null
            ? chart.timeScale().timeToCoordinate(lastTime as Time)
            : null;
      const y = resolvedPrice !== null ? series.priceToCoordinate(resolvedPrice) : null;

      if (
        x === null ||
        y === null ||
        Number.isNaN(x) ||
        Number.isNaN(y) ||
        x < -12 ||
        x > host.clientWidth + 12 ||
        y < -12 ||
        y > host.clientHeight + 12
      ) {
        marker.style.opacity = "0";
        reqId = requestAnimationFrame(loop);
        return;
      }

      const pulseMix = (Math.sin(performance.now() / 210) + 1) / 2;
      const pulseScale = 0.8 + pulseMix * 1.0;
      const clampedY = Math.min(Math.max(8, y), Math.max(8, host.clientHeight - 8));

      marker.style.opacity = "1";
      marker.style.left = `${x}px`;
      marker.style.top = `${clampedY}px`;

      pulse.style.opacity = `${0.48 * (1 - pulseMix)}`;
      pulse.style.transform = `translate(-50%, -50%) scale(${pulseScale})`;
      pulse.style.background = `rgba(${BEACON_RGB},0.34)`;
      pulse.style.border = `1px solid rgba(${BEACON_RGB},0.68)`;
      pulse.style.boxShadow = `0 0 ${14 + pulseMix * 20}px rgba(${BEACON_RGB},0.72)`;

      dot.style.background = BEACON_COLOR;
      dot.style.opacity = `${0.82 + pulseMix * 0.18}`;
      dot.style.boxShadow = `0 0 0 ${3 + pulseMix * 3}px rgba(${BEACON_RGB},0.2), 0 0 ${12 + pulseMix * 14}px rgba(${BEACON_RGB},0.9)`;

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(reqId);
      marker.remove();
    };
  }, [chart, series, timeframeSeconds]);

  return <div ref={containerRef} className="absolute inset-0 z-[10] overflow-hidden pointer-events-none" />;
};
