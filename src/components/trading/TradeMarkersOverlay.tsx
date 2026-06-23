import { useEffect, useMemo, useRef, useState } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#13b95e";
const DN = "#f04f43";

const TEXT_WIDTH = 80;
const TEXT_LINE_GAP = 3;
const TEXT_ROW1_H = 13;
const TEXT_ROW2_H = 11;
const TEXT_HEIGHT = TEXT_ROW1_H + TEXT_LINE_GAP + TEXT_ROW2_H;
const DOT_SIZE = 8;
const CONNECTOR_GAP = 4;
const EDGE_PAD = 8;
const BEACON_RESERVE_HEIGHT = 28;
const PILL_GAP = 4;
const PILL_STACK_OFFSET = 26;

interface MarkerPosition {
  id: string;
  textX: number;
  textY: number;
  dotX: number;
  dotY: number;
  direction: ActiveTrade["direction"];
  amountLabel: string;
  clockLabel: string;
  color: string;
  isInactive: boolean;
}

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

const detectBeaconZone = (chart: IChartApi, series: ISeriesApi<SeriesType>, livePrice: number | null): number | null => {
  if (!isFin(livePrice)) return null;
  const y = series.priceToCoordinate(livePrice);
  return isFin(y) ? y : null;
};

const computeStacked = (positions: MarkerPosition[], height: number, beaconY: number | null): MarkerPosition[] => {
  if (positions.length === 0) return [];
  const sorted = [...positions].sort((a, b) => a.textY - b.textY);
  const beaconR = beaconY !== null ? [beaconY - BEACON_RESERVE_HEIGHT, beaconY + BEACON_RESERVE_HEIGHT] : null;
  const assigned: MarkerPosition[] = [];
  const slots: Array<{ top: number; bottom: number }> = [];
  const slotH = TEXT_HEIGHT + PILL_GAP;
  const half = slotH / 2;

  const isFree = (top: number, bottom: number) =>
    !slots.some((s) => top < s.bottom && bottom > s.top);

  for (const pos of sorted) {
    let y = pos.textY;
    let attempts = 0;
    while (attempts < 30) {
      const st = y - half;
      const sb = y + half;
      const inBeacon = beaconR !== null && st < beaconR[1] && sb > beaconR[0];
      if (!inBeacon && isFree(st, sb)) break;
      y += (attempts % 2 === 0 ? 1 : -1) * (PILL_STACK_OFFSET * (1 + Math.floor(attempts / 2)));
      y = Math.max(EDGE_PAD, Math.min(height - TEXT_HEIGHT - EDGE_PAD, y));
      attempts++;
    }
    y = Math.max(EDGE_PAD, Math.min(height - TEXT_HEIGHT - EDGE_PAD, y));
    slots.push({ top: y - half, bottom: y + half });
    assigned.push({ ...pos, textY: y });
  }
  return assigned;
};

export const TradeMarkersOverlay = ({
  chart,
  series,
  assetSymbol,
  trades,
  timeframeSeconds,
  liveLogical: _liveLogical,
  livePrice,
  showIdleReference: _showIdleReference,
}: Props) => {
  const rafRef = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      setTick((v) => v + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const myTrades = useMemo(
    () => trades.filter((t) => isSameSymbol(t.asset_symbol, assetSymbol)),
    [assetSymbol, trades],
  );

  const markerPositions = useMemo(() => {
    let width = 800;
    let height = 400;
    try {
      const container = chart?.container?.();
      if (container) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0) width = rect.width;
        else if (container.clientWidth > 0) width = container.clientWidth;
        const range = chart.timeScale().getVisibleLogicalRange();
        if (range && isFin(range.to) && isFin(range.from)) {
          try {
            const left = chart.timeScale().logicalToCoordinate(range.from);
            const right = chart.timeScale().logicalToCoordinate(range.to);
            if (isFin(left) && isFin(right)) width = right - left;
          } catch {}
        }
        if (rect.height > 0) height = rect.height;
        else if (container.clientHeight > 0) height = container.clientHeight;
      }
    } catch {}
    if (width < 100) width = 800;
    if (height < 50) height = 400;

    const raw = myTrades.map((trade): MarkerPosition => {
      const nowSec = Math.floor(Date.now() / 1000);
      const { entry, timeLeft, progress } = getTradeTimes(trade, nowSec);
      const ts = chart.timeScale();
      const markerTime = (isFin(trade.marker_time) ? trade.marker_time : Math.floor(new Date(trade.opened_at).getTime() / 1000)) as Time;

      let dotX: number;
      let dotY: number;
      try {
        const cx = ts.timeToCoordinate(markerTime);
        dotX = isFin(cx) ? cx : width * (0.16 + Math.max(0, Math.min(1, 1 - progress)) * 0.54);
      } catch {
        dotX = width * 0.7;
      }
      try {
        const cy = series.priceToCoordinate(trade.entry_price);
        dotY = isFin(cy) ? cy : height * 0.5;
      } catch {
        dotY = height * 0.5;
      }

      const dotLeft = dotX - DOT_SIZE / 2;
      const textRight = dotLeft - CONNECTOR_GAP;
      const textLeft = textRight - TEXT_WIDTH;

      const isHigher = trade.direction === "higher";
      const color = isHigher ? UP : DN;
      const isInactive = progress >= 1 || timeLeft <= 0;

      return {
        id: trade.id,
        textX: Math.max(EDGE_PAD, textLeft),
        textY: dotY - TEXT_HEIGHT / 2,
        dotX,
        dotY,
        direction: trade.direction,
        amountLabel: fmtAmount(trade.amount),
        clockLabel: fmtClock(timeLeft),
        color,
        isInactive,
      };
    });

    const beaconY = detectBeaconZone(chart, series, livePrice ?? null);
    return computeStacked(raw, height, beaconY);
  }, [chart, series, myTrades, tick, timeframeSeconds, livePrice]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[90]" data-trade-markers-overlay="true">
      {markerPositions.map((pos) => {
        const textRight = pos.textX + TEXT_WIDTH;
        const textCenterY = pos.textY + TEXT_HEIGHT / 2;
        const dotCx = pos.dotX;
        const dotCy = pos.dotY;
        const dotLeft = dotCx - DOT_SIZE / 2;
        const dotTop = dotCy - DOT_SIZE / 2;

        const dx = dotCx - textRight;
        const dy = dotCy - textCenterY;
        const connLen = Math.sqrt(dx * dx + dy * dy);
        const connAngle = Math.atan2(dy, dx) * (180 / Math.PI);

        const arrow = pos.direction === "higher" ? "▲" : "▼";
        const arrowColor = pos.direction === "higher" ? "#13b95e" : "#f04f43";

        return (
          <div key={pos.id} style={{ opacity: pos.isInactive ? 0.35 : 0.92 }}>
            <div
              data-trade-marker-text="true"
              className="absolute"
              style={{ left: pos.textX, top: pos.textY, width: TEXT_WIDTH }}
            >
              <div
                className="flex items-center gap-[4px] text-[13px] font-bold leading-none tracking-tight whitespace-nowrap"
                style={{ color: "#ffffff", textShadow: "1px 1px 2px rgba(0,0,0,0.85)" }}
              >
                <span style={{ color: arrowColor, fontSize: 11 }}>{arrow}</span>
                <span>{pos.amountLabel}</span>
              </div>
              <div
                className="mt-[3px] text-[11px] font-medium leading-none tracking-wide"
                style={{ color: "rgba(255,255,255,0.55)", textShadow: "1px 1px 2px rgba(0,0,0,0.85)" }}
              >
                {pos.clockLabel}
              </div>
            </div>

            <div
              data-trade-marker-connector="true"
              className="absolute"
              style={{
                left: textRight,
                top: textCenterY,
                width: connLen || 1,
                height: 1,
                background: pos.color,
                transformOrigin: "0 0",
                transform: `rotate(${connAngle}deg)`,
                boxShadow: "0 0 2px rgba(0,0,0,0.5)",
              }}
            />

            <div
              data-trade-marker-dot="true"
              className="absolute rounded-full border-2"
              style={{
                left: dotLeft,
                top: dotTop,
                width: DOT_SIZE,
                height: DOT_SIZE,
                background: pos.color,
                borderColor: "#ffffff",
                boxShadow: `0 0 6px ${pos.color}88`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
