import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#13b95e";
const DN = "#f04f43";

const TEXT_ROW1_H = 13;
const TEXT_ROW2_H = 11;
const TEXT_LINE_GAP = 3;
const TEXT_HEIGHT = TEXT_ROW1_H + TEXT_LINE_GAP + TEXT_ROW2_H;
const DOT_SIZE = 8;
const CONNECTOR_GAP = 4;
const LINE_DASH_LEN = 6;
const LINE_GAP_LEN = 4;

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

const normalizeSymbol = (s: string) =>
  s.toUpperCase().replace(/\(OTC\)/g, "").replace(/[^A-Z0-9]/g, "");

const isSameSymbol = (a: string, b: string) => normalizeSymbol(a) === normalizeSymbol(b);

const isFin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const fmtClock = (seconds: number) => {
  const total = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const fmtAmount = (amount: number) => {
  if (!isFin(amount) || amount <= 0) return "$0.00";
  return Number.isInteger(amount) ? `$${amount.toFixed(0)}` : `$${amount.toFixed(2).replace(/\.?0+$/, "")}`;
};

const getTradeTimes = (trade: ActiveTrade, nowSec: number) => {
  const entry = isFin(trade.marker_time)
    ? Math.floor(trade.marker_time)
    : Math.floor(new Date(trade.opened_at).getTime() / 1000);
  const expiry = entry + Math.max(1, Math.floor(trade.expiry_seconds || 0));
  const timeLeft = isFin(trade.timeLeft) ? trade.timeLeft : Math.max(0, expiry - nowSec);
  const progress = expiry > entry ? Math.min(1, Math.max(0, (nowSec - entry) / (expiry - entry))) : 1;
  return { entry, expiry, timeLeft, progress };
};

export const TradeMarkersOverlay = ({
  chart,
  series,
  assetSymbol,
  trades,
  timeframeSeconds,
  liveLogical: _liveLogical,
  livePrice: _livePrice,
  showIdleReference: _showIdleReference,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tradesRef = useRef(trades);
  const assetRef = useRef(assetSymbol);
  const tfRef = useRef(timeframeSeconds);

  tradesRef.current = trades;
  assetRef.current = assetSymbol;
  tfRef.current = timeframeSeconds;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chart || !series) return;
    const container = chart.chartElement?.();
    if (!container) return;

    let running = true;

    const draw = () => {
      if (!running) return;
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const dpr = window.devicePixelRatio || 1;

      if (
        Math.round(canvas.width) !== Math.round(w * dpr) ||
        Math.round(canvas.height) !== Math.round(h * dpr)
      ) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const currentTrades = tradesRef.current;
      const currentSymbol = assetRef.current;
      const safeTf = Math.max(1, Math.floor(tfRef.current));
      const nowSec = Math.floor(Date.now() / 1000);
      const ts = chart.timeScale();

      const relevant = currentTrades.filter((t) =>
        isSameSymbol(t.asset_symbol, currentSymbol),
      );

      for (const trade of relevant) {
        const { entry, expiry: expiryTime, timeLeft, progress } = getTradeTimes(trade, nowSec);
        const isActive = progress < 1 && timeLeft > 0;
        const opacity = isActive ? 0.92 : 0.35;

        const markerTime = isFin(trade.marker_time)
          ? trade.marker_time
          : Math.floor(new Date(trade.opened_at).getTime() / 1000);
        const bucketTime = Math.floor(markerTime / safeTf) * safeTf;

        let dotX: number | null = null;
        let dotY: number | null = null;
        try {
          const cx = ts.timeToCoordinate(bucketTime as Time);
          if (isFin(cx)) dotX = cx;
        } catch {}
        try {
          const cy = series.priceToCoordinate(trade.entry_price);
          if (isFin(cy)) dotY = cy;
        } catch {}

        if (dotX === null || dotY === null) continue;

        const isHigher = trade.direction === "higher";
        const color = isHigher ? UP : DN;

        const arrow = isHigher ? "\u25B2" : "\u25BC";
        const amountStr = fmtAmount(trade.amount);
        const clockStr = fmtClock(timeLeft);
        const fullLine1 = `${arrow} ${amountStr}`;

        // --- Forward expiration line ---
        const expiryBucket = Math.ceil(expiryTime / safeTf) * safeTf;
        let expiryX: number | null = null;
        try {
          const ex = ts.timeToCoordinate(expiryBucket as Time);
          if (isFin(ex)) expiryX = ex;
        } catch {}
        if (expiryX === null) {
          try {
            const nowBucket = Math.floor(nowSec / safeTf) * safeTf;
            const nowX = ts.timeToCoordinate(nowBucket as Time);
            const elapsed = nowBucket - Math.floor(entry / safeTf) * safeTf;
            const total = expiryBucket - Math.floor(entry / safeTf) * safeTf;
            if (isFin(nowX) && total > 0 && elapsed > 0) {
              expiryX = dotX + (nowX - dotX) * (total / elapsed);
            }
          } catch {}
        }

        const lineStartX = dotX + DOT_SIZE / 2;
        const lineEndX = expiryX !== null && expiryX > lineStartX ? expiryX : w;
        const lineWidth = Math.max(0, lineEndX - lineStartX);

        if (lineWidth > 0) {
          ctx.save();
          ctx.globalAlpha = opacity * 0.4;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([LINE_DASH_LEN, LINE_GAP_LEN]);
          ctx.beginPath();
          ctx.moveTo(lineStartX, dotY);
          ctx.lineTo(lineEndX, dotY);
          ctx.stroke();
          ctx.restore();
        }

        // --- Dot ---
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(dotX, dotY, DOT_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // --- Text label (right-aligned, left of dot) ---
        const textRightEdge = dotX - DOT_SIZE / 2 - CONNECTOR_GAP;
        const label1Y = dotY - TEXT_HEIGHT / 2 + TEXT_ROW1_H;
        const label2Y = label1Y + TEXT_LINE_GAP;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.textBaseline = "bottom";
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 2;

        // Line 1: full label in arrow color, overwrite amount in white
        ctx.textAlign = "right";
        ctx.font = `bold ${TEXT_ROW1_H}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(fullLine1, textRightEdge, label1Y);

        const arrowText = `${arrow} `;
        const arrowW = ctx.measureText(arrowText).width;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(amountStr, textRightEdge - arrowW, label1Y);

        // Line 2: clock
        ctx.font = `${TEXT_ROW2_H}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(clockStr, textRightEdge, label2Y + TEXT_ROW2_H);

        ctx.restore();


      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [chart, series]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[90]"
    />
  );
};
