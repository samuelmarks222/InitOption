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
  profit?: number;
  amount?: number;
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
const PILL_VISIBLE_MS = 3400;
const PILL_FADE_START_MS = 2600;

const formatPillAmount = (value: unknown) =>
  Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

const drawResultPill = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  status: "won" | "lost",
  label: string,
  ageMs: number,
) => {
  if (ageMs > PILL_VISIBLE_MS) return;
  const intro = Math.min(1, ageMs / 220);
  const fade =
    ageMs > PILL_FADE_START_MS
      ? Math.max(0, 1 - (ageMs - PILL_FADE_START_MS) / (PILL_VISIBLE_MS - PILL_FADE_START_MS))
      : 1;
  const alpha = intro * fade;
  if (alpha <= 0) return;

  const color = status === "won" ? WIN : LOSS;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "bold 12px Arial, Helvetica, sans-serif";
  const textW = ctx.measureText(label).width;
  const circleR = 9;
  const gap = 6;
  const padX = 10;
  const pillW = padX + textW + gap + circleR * 2 + padX;
  const pillH = 24;
  // Pill sits at the entry point — centered on x, just above y
  let pillX = x - pillW / 2;
  if (pillX < 4) pillX = 4;
  if (pillX + pillW > width - 4) pillX = width - 4 - pillW;
  const pillY = Math.max(4, y - pillH - 12);

  // Pill body
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
  else ctx.rect(pillX, pillY, pillW, pillH);
  ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.stroke();

  // Label
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, pillX + padX, pillY + pillH / 2 + 0.5);

  // Status circle with check / cross
  const cx = pillX + pillW - padX - circleR;
  const cy = pillY + pillH / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  // Two white checkmarks (double tick) for both win and loss — only circle color differs
  // First check (smaller, left)
  ctx.moveTo(cx - 5.2, cy + 0.2);
  ctx.lineTo(cx - 3.2, cy + 2.2);
  ctx.lineTo(cx - 0.2, cy - 2.4);
  ctx.stroke();
  // Second check (right)
  ctx.beginPath();
  ctx.moveTo(cx - 0.8, cy + 0.2);
  ctx.lineTo(cx + 1.2, cy + 2.2);
  ctx.lineTo(cx + 5.2, cy - 2.4);
  ctx.stroke();

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

      announcementsRef.current.forEach((announcement, announcementIndex) => {
        activeIds.add(announcement.id);
        if (!seenAtRef.current[announcement.id]) {
          seenAtRef.current[announcement.id] = now;
        }

        const startedAt = seenAtRef.current[announcement.id];
        const ageMs = now - startedAt;
        if (ageMs > VISIBLE_MS && ageMs > PILL_VISIBLE_MS) return;

        const price = isFiniteNumber(announcement.exitPrice)
          ? announcement.exitPrice
          : announcement.entryPrice;
        if (!isFiniteNumber(price)) return;

        const y = series.priceToCoordinate(price);
        if (!isFiniteNumber(y)) return;
        const x = resolveXCoordinate(chart, announcement, tfRef.current);

        if (ageMs <= VISIBLE_MS && isFiniteNumber(x)) {
          drawResultTicks(ctx, x, y, announcement.status, ageMs);
        }

        if (ageMs > PILL_VISIBLE_MS) return;

        // Pill sits at the right edge of the visible chart (where the trade just
        // closed) at the ENTRY price level — like the Quotex reference.
        let pillX = NaN;
        try {
          const range = chart.timeScale().getVisibleLogicalRange();
          const rx = range ? chart.timeScale().logicalToCoordinate(range.to) : null;
          if (isFiniteNumber(rx) && rx >= 0 && rx <= width) pillX = rx - 8;
        } catch {}
        if (!isFiniteNumber(pillX)) pillX = Math.max(0, width - 90);

        const entryY = isFiniteNumber(announcement.entryPrice)
          ? series.priceToCoordinate(announcement.entryPrice)
          : y;
        if (!isFiniteNumber(entryY)) return;

        // Losses return $0 to the balance (stake is gone); show that, like the ref.
        const pillLabel =
          announcement.status === "won"
            ? `+$${formatPillAmount(announcement.profit)}`
            : `$0`;
        drawResultPill(ctx, pillX, entryY, width, announcement.status, pillLabel, ageMs);
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
