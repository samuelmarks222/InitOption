import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, SeriesType, Time } from "lightweight-charts";

type ResultAnnouncement = {
  id: string;
  status: "won" | "lost";
  expirySeconds: number;
  entryPrice?: number;
  exitPrice?: number;
  markerTime?: number | null;
  markerLogical?: number | null;
  expiryTime?: number | null;
};

interface Props {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  announcements: ResultAnnouncement[];
  timeframeSeconds: number;
}

const WIN = "#15c96a";
const LOSS = "#ff5b50";
const STROKE_SHADOW = "rgba(2, 6, 18, 0.65)";
const VISIBLE_MS = 1500;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const getCoordinateTime = (announcement: ResultAnnouncement, timeframeSeconds: number) => {
  const expiryTime =
    isFiniteNumber(announcement.expiryTime)
      ? announcement.expiryTime
      : isFiniteNumber(announcement.markerTime)
        ? announcement.markerTime + Math.max(1, announcement.expirySeconds || 0)
        : null;

  if (isFiniteNumber(expiryTime)) {
    return Math.floor(expiryTime / timeframeSeconds) * timeframeSeconds;
  }

  return null;
};

const resolveXCoordinate = (
  chart: IChartApi,
  announcement: ResultAnnouncement,
  timeframeSeconds: number,
) => {
  const safeTf = Math.max(1, Math.floor(timeframeSeconds));
  const timeScale = chart.timeScale();

  if (isFiniteNumber(announcement.markerLogical)) {
    try {
      const logicalExpiry =
        announcement.markerLogical + Math.max(1, announcement.expirySeconds || 0) / safeTf;
      const x = timeScale.logicalToCoordinate(logicalExpiry);
      if (isFiniteNumber(x)) return x;
    } catch {}
  }

  const coordinateTime = getCoordinateTime(announcement, safeTf);

  if (isFiniteNumber(coordinateTime)) {
    try {
      const x = timeScale.timeToCoordinate(coordinateTime as Time);
      if (isFiniteNumber(x)) return x;
    } catch {}
  }

  if (isFiniteNumber(announcement.markerTime)) {
    try {
      const markerBucket = Math.floor(announcement.markerTime / safeTf) * safeTf;
      const x = timeScale.timeToCoordinate(markerBucket as Time);
      if (isFiniteNumber(x)) return x;
    } catch {}
  }

  return null;
};

const drawResultTicks = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  status: "won" | "lost",
  ageMs: number,
) => {
  const color = status === "won" ? WIN : LOSS;
  const phase = Math.min(1, Math.max(0, ageMs / VISIBLE_MS));
  const intro = Math.min(1, phase / 0.18);
  const fade = phase > 0.62 ? Math.max(0, 1 - (phase - 0.62) / 0.38) : 1;
  const alpha = intro * fade * 0.92;
  const lift = status === "won" ? -1.5 * phase : 1.5 * phase;
  const scale = 0.78 + 0.22 * intro;
  const offsets = [-4.5, 4.5];

  ctx.save();
  ctx.translate(x, y + lift);
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  offsets.forEach((offset, index) => {
    const delay = index * 0.08;
    const localPhase = Math.min(1, Math.max(0, (phase - delay) / 0.22));
    const tickAlpha = alpha * localPhase;
    if (tickAlpha <= 0) return;

    ctx.save();
    ctx.translate(offset, 0);
    ctx.globalAlpha = tickAlpha;
    ctx.lineWidth = 3;
    ctx.strokeStyle = STROKE_SHADOW;
    ctx.beginPath();
    if (status === "won") {
      ctx.moveTo(-3.2, 0);
      ctx.lineTo(-0.9, 2.4);
      ctx.lineTo(3.6, -3.2);
    } else {
      ctx.moveTo(-3.2, -2.8);
      ctx.lineTo(-0.8, 0.6);
      ctx.lineTo(3.4, -3.5);
    }
    ctx.stroke();

    ctx.lineWidth = 1.65;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  });

  ctx.restore();
};

export const TradeResultTicksOverlay = ({
  chart,
  series,
  announcements,
  timeframeSeconds,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const seenAtRef = useRef<Record<string, number>>({});
  const announcementsRef = useRef(announcements);
  const tfRef = useRef(timeframeSeconds);

  announcementsRef.current = announcements;
  tfRef.current = timeframeSeconds;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = chart.chartElement?.();
    if (!canvas || !container || !chart || !series) return;

    let running = true;

    const draw = () => {
      if (!running) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const dpr = window.devicePixelRatio || 1;

      if (
        Math.round(canvas.width) !== Math.round(width * dpr) ||
        Math.round(canvas.height) !== Math.round(height * dpr)
      ) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const now = performance.now();
      const activeIds = new Set<string>();

      announcementsRef.current.forEach((announcement) => {
        activeIds.add(announcement.id);
        if (!seenAtRef.current[announcement.id]) {
          seenAtRef.current[announcement.id] = now;
        }

        const startedAt = seenAtRef.current[announcement.id];
        const ageMs = now - startedAt;
        if (ageMs > VISIBLE_MS) return;

        const price = isFiniteNumber(announcement.exitPrice)
          ? announcement.exitPrice
          : announcement.entryPrice;
        if (!isFiniteNumber(price)) return;

        const y = series.priceToCoordinate(price);
        const x = resolveXCoordinate(chart, announcement, tfRef.current);
        if (!isFiniteNumber(x) || !isFiniteNumber(y)) return;

        drawResultTicks(ctx, x, y, announcement.status, ageMs);
      });

      Object.keys(seenAtRef.current).forEach((id) => {
        if (!activeIds.has(id)) delete seenAtRef.current[id];
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [chart, series]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[10]" />;
};
