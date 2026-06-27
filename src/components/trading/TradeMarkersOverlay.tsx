import { useEffect, useRef } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#13b95e";
const DN = "#f04f43";

const TEXT_ROW1_H = 11;
const TEXT_ROW2_H = 9;
const TEXT_LINE_GAP = 1;
const TEXT_HEIGHT = TEXT_ROW1_H + TEXT_LINE_GAP + TEXT_ROW2_H;
const DOT_SIZE = 3;
const CONNECTOR_GAP = 3;
const COLLISION_PAD = 10;

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

interface Marker {
  trade: ActiveTrade;
  dotX: number;
  dotY: number;
  textBaseY: number;
  isActive: boolean;
  opacity: number;
  color: string;
  arrow: string;
  fullLine1: string;
  amountStr: string;
  clockStr: string;
  line1Width: number;
  line2Width: number;
  labelWidth: number;
  expiryX: number;
  horizontalShift: number;
  bucketTime: number;
  expiryBucket: number;
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

      // ── Phase 1: build Marker data ──
      const markers: Marker[] = [];
      const fontBold = `bold ${TEXT_ROW1_H}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      const fontNorm = `${TEXT_ROW2_H}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

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

        ctx.font = fontBold;
        const l1w = ctx.measureText(fullLine1).width;
        ctx.font = fontNorm;
        const l2w = ctx.measureText(clockStr).width;

        // Expiration X
        const expiryBucket = Math.ceil(expiryTime / safeTf) * safeTf;
        let expiryX: number = w;
        try {
          const ex = ts.timeToCoordinate(expiryBucket as Time);
          if (isFin(ex)) expiryX = ex;
          else {
            const nowBucket = Math.floor(nowSec / safeTf) * safeTf;
            const nowX = ts.timeToCoordinate(nowBucket as Time);
            const elapsed = nowBucket - Math.floor(entry / safeTf) * safeTf;
            const total = expiryBucket - Math.floor(entry / safeTf) * safeTf;
            if (isFin(nowX) && total > 0 && elapsed > 0)
              expiryX = dotX + (nowX - dotX) * (total / elapsed);
          }
        } catch {}

        markers.push({
          trade,
          dotX,
          dotY,
          textBaseY: dotY - TEXT_HEIGHT / 2,
          isActive,
          opacity,
          color,
          arrow,
          fullLine1,
          amountStr,
          clockStr,
          line1Width: l1w,
          line2Width: l2w,
          labelWidth: Math.max(l1w, l2w),
          expiryX,
          horizontalShift: 0,
          bucketTime,
          expiryBucket,
        });
      }

      // ── Phase 2: collide & stagger ──
      markers.sort((a, b) => a.textBaseY - b.textBaseY);
      const groups: Marker[][] = [];
      {
        let cur: Marker[] = [];
        for (const m of markers) {
          if (cur.length === 0 || m.textBaseY < cur[cur.length - 1].textBaseY + TEXT_HEIGHT + 4)
            cur.push(m);
          else {
            groups.push(cur);
            cur = [m];
          }
        }
        if (cur.length > 0) groups.push(cur);
      }

      for (const group of groups) {
        if (group.length <= 1) continue;
        group.sort((a, b) => a.dotX - b.dotX || a.trade.amount - b.trade.amount);
        let accShift = 0;
        for (let i = 1; i < group.length; i++) {
          accShift += group[i - 1].labelWidth + COLLISION_PAD;
          group[i].horizontalShift = accShift;
        }
      }

      // ── Phase 3: draw ──

      // 3a: expiration lines
      for (const m of markers) {
        const ls = m.dotX + DOT_SIZE / 2;
        const lw = Math.max(0, m.expiryX - ls);
        if (lw <= 0) continue;
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ls, m.dotY);
        ctx.lineTo(ls + lw, m.dotY);
        ctx.stroke();
      }

      // 3b: connectors (text → dot)
      for (const m of markers) {
        const refX = m.dotX - DOT_SIZE / 2 - CONNECTOR_GAP;
        const textRight = refX - m.horizontalShift;
        const dotLeft = refX + CONNECTOR_GAP;
        const cw = dotLeft - textRight;
        if (cw <= 0) continue;
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(textRight, m.dotY);
        ctx.lineTo(textRight + cw, m.dotY);
        ctx.stroke();
      }

      // 3c: dots
      for (const m of markers) {
        ctx.beginPath();
        ctx.arc(m.dotX, m.dotY, DOT_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = m.color;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 3d: text labels
      for (const m of markers) {
        const refX = m.dotX - DOT_SIZE / 2 - CONNECTOR_GAP;
        const textRight = refX - m.horizontalShift;
        const label1Y = m.dotY - TEXT_HEIGHT / 2 + TEXT_ROW1_H;
        const label2Y = label1Y + TEXT_LINE_GAP;

        ctx.textBaseline = "bottom";
        ctx.textAlign = "right";
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 1;

        // Line 1: arrow + amount, strictly white
        ctx.font = fontBold;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(m.fullLine1, textRight, label1Y);

        // Line 2: clock
        ctx.font = fontNorm;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(m.clockStr, textRight, label2Y + TEXT_ROW2_H);

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [chart, series, assetSymbol]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[90]"
    />
  );
};
