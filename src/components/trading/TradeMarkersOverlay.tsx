import { useEffect, useMemo, useRef, useState } from "react";
import { IChartApi, ISeriesApi, type SeriesType, Time } from "lightweight-charts";
import type { ActiveTrade } from "@/hooks/useTrading";

const UP = "#13b95e";
const DN = "#f04f43";

const TEXT_LINE_GAP = 3;
const TEXT_ROW1_H = 13;
const TEXT_ROW2_H = 11;
const TEXT_HEIGHT = TEXT_ROW1_H + TEXT_LINE_GAP + TEXT_ROW2_H;
const DOT_SIZE = 8;
const CONNECTOR_GAP = 4;
const EDGE_PAD = 8;
const PILL_GAP = 4;

interface MarkerPosition {
  id: string;
  textY: number;
  dotX: number;
  dotY: number;
  direction: ActiveTrade["direction"];
  amountLabel: string;
  clockLabel: string;
  color: string;
  isInactive: boolean;
  isRightSide: boolean;
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

const computeHorizontalStack = (positions: MarkerPosition[]): MarkerPosition[] => {
  if (positions.length <= 1) return positions;
  const sorted = [...positions].sort((a, b) => a.textY - b.textY);

  const groups: MarkerPosition[][] = [];
  let current: MarkerPosition[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevTop = current[current.length - 1].textY;
    const currTop = sorted[i].textY;
    if (currTop < prevTop + TEXT_HEIGHT + PILL_GAP) {
      current.push(sorted[i]);
    } else {
      groups.push(current);
      current = [sorted[i]];
    }
  }
  if (current.length > 0) groups.push(current);

  for (const group of groups) {
    if (group.length === 1) continue;
    group.sort((a, b) => a.dotX - b.dotX);
    group.forEach((pos, idx) => {
      pos.isRightSide = idx % 2 === 1;
    });
  }
  return sorted;
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
  const [tick, setTick] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const id = setInterval(() => {
      if (mountedRef.current) setTick((v) => v + 1);
    }, 1000);
    return () => { mountedRef.current = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (!chart) return;
    const handler = () => {
      if (mountedRef.current) setTick((v) => v + 1);
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
  }, [chart]);

  const myTrades = useMemo(
    () => trades.filter((t) => isSameSymbol(t.asset_symbol, assetSymbol)),
    [assetSymbol, trades],
  );

  const markerPositions = useMemo(() => {
    let height = 400;
    try {
      const container = chart?.container?.();
      if (container) {
        const rect = container.getBoundingClientRect();
        if (rect.height > 0) height = rect.height;
        else if (container.clientHeight > 0) height = container.clientHeight;
      }
    } catch {}
    if (height < 50) height = 400;

    const ts = chart.timeScale();
    const raw = myTrades.flatMap((trade): MarkerPosition => {
      const nowSec = Math.floor(Date.now() / 1000);
      const { timeLeft, progress } = getTradeTimes(trade, nowSec);
      const markerTime = (isFin(trade.marker_time) ? trade.marker_time : Math.floor(new Date(trade.opened_at).getTime() / 1000)) as Time;

      const safeTimeframe = Math.max(1, Math.floor(timeframeSeconds));
      const markerTimeNum = Number(markerTime);
      const bucketTime = (isFin(markerTimeNum) ? Math.floor(markerTimeNum / safeTimeframe) * safeTimeframe : markerTimeNum) as Time;

      let dotX: number;
      let dotY: number;
      try {
        const cx = ts.timeToCoordinate(bucketTime);
        dotX = isFin(cx) ? cx : 0;
      } catch {
        dotX = 0;
      }
      try {
        const cy = series.priceToCoordinate(trade.entry_price);
        dotY = isFin(cy) ? cy : height * 0.5;
      } catch {
        dotY = height * 0.5;
      }

      const isHigher = trade.direction === "higher";
      const color = isHigher ? UP : DN;
      const isInactive = progress >= 1 || timeLeft <= 0;

      return {
        id: trade.id,
        textY: dotY - TEXT_HEIGHT / 2,
        dotX,
        dotY,
        direction: trade.direction,
        amountLabel: fmtAmount(trade.amount),
        clockLabel: fmtClock(timeLeft),
        color,
        isInactive,
        isRightSide: false,
      };
    });

    return computeHorizontalStack(raw);
  }, [chart, series, myTrades, tick, timeframeSeconds]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[90]" data-trade-markers-overlay="true">
      {markerPositions.map((pos) => {
        const textY = pos.dotY - TEXT_HEIGHT / 2;
        const textCenterY = pos.dotY;

        const dotLeft = pos.dotX - DOT_SIZE / 2;
        const dotTop = pos.dotY - DOT_SIZE / 2;
        const dotRight = pos.dotX + DOT_SIZE / 2;

        const refX = pos.dotX - DOT_SIZE / 2 - CONNECTOR_GAP;

        const arrow = pos.direction === "higher" ? "\u25B2" : "\u25BC";
        const arrowColor = pos.direction === "higher" ? "#13b95e" : "#f04f43";

        return (
          <div key={pos.id} style={{ opacity: pos.isInactive ? 0.35 : 0.92 }}>
            <div
              data-trade-marker-text="true"
              className="absolute whitespace-nowrap"
              style={{
                left: pos.isRightSide ? `${pos.dotX + DOT_SIZE / 2 + CONNECTOR_GAP}px` : `${refX}px`,
                top: 0,
                transform: `translate(${pos.isRightSide ? "0" : "-100%"}, ${textY}px)`,
              }}
            >
              <div
                className="flex items-center gap-[4px] text-[13px] font-bold leading-none tracking-tight"
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
                transform: `translate(${pos.isRightSide ? dotRight : refX}px, ${textCenterY}px)`,
                left: 0,
                top: 0,
                width: CONNECTOR_GAP,
                height: 1,
                background: pos.color,
                boxShadow: "0 0 2px rgba(0,0,0,0.5)",
              }}
            />

            <div
              data-trade-marker-dot="true"
              className="absolute rounded-full border-2"
              style={{
                transform: `translate(${dotLeft}px, ${dotTop}px)`,
                left: 0,
                top: 0,
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
