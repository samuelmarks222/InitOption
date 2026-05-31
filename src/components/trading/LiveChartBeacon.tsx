import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, Time } from "lightweight-charts";

interface Props {
  chart: IChartApi;
  series: ISeriesApi<any>;
  timeframeSeconds: number;
  livePrice?: number | null;
  liveLogical?: number | null;
}

const BEACON_COLOR = "#159bff";
const BEACON_RGB = "21,155,255";

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

export const LiveChartBeacon = ({ chart, series, timeframeSeconds, livePrice, liveLogical }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef({ livePrice, liveLogical });

  useEffect(() => {
    liveRef.current = { livePrice, liveLogical };
  }, [liveLogical, livePrice]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const marker = document.createElement("div");
    marker.className = "absolute pointer-events-none";

    const pulse = document.createElement("div");
    pulse.className = "absolute rounded-full";
    pulse.style.width = "24px";
    pulse.style.height = "24px";
    pulse.style.transform = "translate(-50%, -50%) scale(1)";
    marker.appendChild(pulse);

    const dot = document.createElement("div");
    dot.className = "absolute rounded-full";
    dot.style.width = "10px";
    dot.style.height = "10px";
    dot.style.transform = "translate(-50%, -50%)";
    dot.style.border = "2px solid rgba(198,232,255,0.92)";
    marker.appendChild(dot);

    el.appendChild(marker);

    let reqId = 0;

    const loop = () => {
      const host = containerRef.current;
      if (!host) return;

      const data = series.data() as Array<{ time?: unknown; value?: number; close?: number; high?: number; low?: number; open?: number }>;
      const lastPoint = data[data.length - 1];

      if (!lastPoint) {
        marker.style.opacity = "0";
        reqId = requestAnimationFrame(loop);
        return;
      }

      const lastTime = getUnixTime(lastPoint.time);
      const lastPrice =
        typeof lastPoint.value === "number"
          ? lastPoint.value
          : typeof lastPoint.close === "number"
            ? lastPoint.close
            : typeof lastPoint.high === "number"
              ? lastPoint.high
              : typeof lastPoint.open === "number"
                ? lastPoint.open
                : null;

      const liveSnapshot = liveRef.current;
      const resolvedPrice =
        typeof liveSnapshot.livePrice === "number" && Number.isFinite(liveSnapshot.livePrice)
          ? liveSnapshot.livePrice
          : lastPrice;
      const x =
        typeof liveSnapshot.liveLogical === "number" && Number.isFinite(liveSnapshot.liveLogical)
          ? chart.timeScale().logicalToCoordinate(liveSnapshot.liveLogical as never)
          : lastTime !== null
            ? chart.timeScale().timeToCoordinate(lastTime as Time)
            : null;
      const y = resolvedPrice !== null ? series.priceToCoordinate(resolvedPrice) : null;

      if (x === null || y === null || Number.isNaN(x) || Number.isNaN(y)) {
        marker.style.opacity = "0";
        reqId = requestAnimationFrame(loop);
        return;
      }

      const pulseMix = (Math.sin(performance.now() / 210) + 1) / 2;
      const pulseScale = 0.74 + pulseMix * 1.35;

      marker.style.opacity = "1";
      marker.style.left = `${x}px`;
      marker.style.top = `${y}px`;

      pulse.style.opacity = `${0.36 * (1 - pulseMix)}`;
      pulse.style.transform = `translate(-50%, -50%) scale(${pulseScale})`;
      pulse.style.background = `rgba(${BEACON_RGB},0.28)`;
      pulse.style.border = `1px solid rgba(${BEACON_RGB},0.5)`;
      pulse.style.boxShadow = `0 0 ${10 + pulseMix * 16}px rgba(${BEACON_RGB},0.5)`;

      dot.style.background = BEACON_COLOR;
      dot.style.opacity = `${0.74 + pulseMix * 0.26}`;
      dot.style.boxShadow = `0 0 0 ${2.5 + pulseMix * 2.5}px rgba(${BEACON_RGB},0.15), 0 0 ${8 + pulseMix * 10}px rgba(${BEACON_RGB},0.8)`;

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(reqId);
      marker.remove();
    };
  }, [chart, series, timeframeSeconds]);

  return <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 48 }} />;
};
