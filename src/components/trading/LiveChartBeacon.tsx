import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, Time } from "lightweight-charts";

interface Props {
  chart: IChartApi;
  series: ISeriesApi<any>;
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

const formatCountdown = (seconds: number) => {
  const totalSeconds = Math.max(0, seconds);
  if (totalSeconds < 10) {
    return `${totalSeconds.toFixed(1)}s`;
  }

  const total = Math.max(0, Math.ceil(totalSeconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const remainder = Math.floor(total % 60)
    .toString()
    .padStart(2, "0");

  if (days > 0) {
    return `${days}d ${hours}:${minutes}`;
  }

  if (total >= 3600) {
    return `${hours}:${minutes}:${remainder}`;
  }

  return `${minutes}:${remainder}`;
};

export const LiveChartBeacon = ({ chart, series, timeframeSeconds }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const marker = document.createElement("div");
    marker.className = "absolute pointer-events-none";

    const pulse = document.createElement("div");
    pulse.className = "absolute rounded-[8px]";
    pulse.style.width = "12px";
    pulse.style.height = "12px";
    pulse.style.transform = "translate(-50%, -50%) scale(1)";
    marker.appendChild(pulse);

    const dot = document.createElement("div");
    dot.className = "absolute rounded-[5px]";
    dot.style.width = "6px";
    dot.style.height = "6px";
    dot.style.transform = "translate(-50%, -50%)";
    marker.appendChild(dot);

    const label = document.createElement("div");
    label.className = "absolute rounded-md px-2 py-1 text-[11px] font-medium text-white";
    label.style.transform = "translate(14px, -50%)";
    label.style.background = "rgba(22, 26, 35, 0.88)";
    label.style.border = "1px solid rgba(255,255,255,0.08)";
    label.style.boxShadow = "0 8px 20px rgba(0,0,0,0.24)";
    marker.appendChild(label);

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

      const x = lastTime !== null ? chart.timeScale().timeToCoordinate(lastTime as Time) : null;
      const y = lastPrice !== null ? series.priceToCoordinate(lastPrice) : null;

      if (x === null || y === null || Number.isNaN(x) || Number.isNaN(y)) {
        marker.style.opacity = "0";
        reqId = requestAnimationFrame(loop);
        return;
      }

      const nowSeconds = Date.now() / 1000;
      const timeLeft = lastTime !== null ? Math.max(0, timeframeSeconds - (nowSeconds - lastTime)) : 0;
      const pulseMix = (Math.sin(performance.now() / 210) + 1) / 2;

      marker.style.opacity = "1";
      marker.style.left = `${x}px`;
      marker.style.top = `${y}px`;

      pulse.style.opacity = "0";
      pulse.style.transform = "translate(-50%, -50%) scale(1)";

      dot.style.background = "#17d67a";
      dot.style.opacity = `${0.42 + pulseMix * 0.58}`;
      dot.style.boxShadow = `0 0 0 ${0.4 + pulseMix * 0.9}px rgba(23,214,122,0.14), 0 0 ${3 + pulseMix * 6}px rgba(23,214,122,0.6)`;

      label.textContent = formatCountdown(timeLeft);
      label.style.top = "0";
      label.style.opacity = "0.84";

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(reqId);
      marker.remove();
    };
  }, [chart, series, timeframeSeconds]);

  return <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 46 }} />;
};
