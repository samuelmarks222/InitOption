import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Clock3,
  X,
} from "lucide-react";
import type { TradeHistoryEntry, TradeSettlement, TradeDirection } from "@/hooks/useTrading";
import AssetSymbolMark from "./AssetSymbolMark";
import { TRADING_DOWN_COLOR, TRADING_UP_COLOR } from "./tradingPalette";
import { fetchTradeBalanceAuditEntries, type TradeBalanceAuditEntry } from "@/lib/tradeBalanceAudit";

export interface TradeResultPresentationData {
  id: string;
  assetSymbol: string;
  direction: TradeDirection;
  amount: number;
  profit: number;
  status: "won" | "lost";
  entryPrice: number;
  exitPrice: number;
  openedAt: string;
  closedAt: string;
  expirySeconds: number;
}

const createSeededRandom = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const getQuotePrecision = (entryPrice: number, exitPrice: number) => {
  const detectPrecision = (value: number) => {
    const asText = String(value);
    const decimalPart = asText.split(".")[1] ?? "";
    return decimalPart.length;
  };

  const rawPrecision = Math.max(detectPrecision(entryPrice), detectPrecision(exitPrice));
  const priceMagnitude = Math.max(Math.abs(entryPrice), Math.abs(exitPrice));

  if (rawPrecision > 0) {
    return Math.min(5, Math.max(2, rawPrecision));
  }

  if (priceMagnitude >= 1000) return 3;
  if (priceMagnitude >= 100) return 2;
  if (priceMagnitude >= 1) return 4;
  return 5;
};

const trimTrailingZeros = (value: string) => value.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");

const formatQuote = (value: number, precision: number) => trimTrailingZeros(value.toFixed(precision));

const formatTradeClock = (seconds: number) => {
  const normalizedSeconds = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
  const total = Math.max(0, Math.floor(normalizedSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainderSeconds = Math.floor(total % 60);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainderSeconds).padStart(2, "0")}`;
};

const formatMoneySuffix = (amount: number, includeSign = false) => {
  const absoluteAmount = Math.abs(amount);
  const amountLabel = Number.isInteger(absoluteAmount) ? absoluteAmount.toFixed(0) : absoluteAmount.toFixed(2);

  if (!includeSign) {
    return `${amountLabel} $`;
  }

  return `${amount > 0 ? "+" : amount < 0 ? "-" : ""}${amountLabel} $`;
};

const formatTradeTimestamp = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value)).replace(",", "");

const formatAuditMoney = (value: number) => `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(2)} $`;

const formatInlineTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().replace("T", " ").replace("Z", "");
};

const formatChartTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));

const buildTradeResultSeries = (trade: TradeResultPresentationData, pointCount: number) => {
  const random = createSeededRandom(`${trade.id}:${trade.entryPrice}:${trade.exitPrice}:${trade.closedAt}`);
  const isCompact = pointCount <= 32;
  const markerIndex = Math.min(pointCount - 8, Math.max(3, Math.round(pointCount * 0.12)));
  const baseAmplitude = Math.max(
    Math.abs(trade.exitPrice - trade.entryPrice) * 1.8,
    Math.max(Math.abs(trade.entryPrice), Math.abs(trade.exitPrice)) * 0.00024,
    0.00045,
  );
  const volatility = baseAmplitude * (isCompact ? 0.58 : 0.46);
  const remainingPoints = pointCount - 1 - markerIndex;
  const anchors: Array<{ index: number; value: number }> = [
    {
      index: 0,
      value: trade.entryPrice + (random() - 0.5) * baseAmplitude * 1.05,
    },
    {
      index: Math.max(1, Math.floor(markerIndex * 0.55)),
      value: trade.entryPrice + (random() - 0.5) * baseAmplitude * 1.2,
    },
    {
      index: markerIndex,
      value: trade.entryPrice,
    },
  ];
  const postAnchorCount = isCompact ? 4 : 6;

  for (let step = 1; step <= postAnchorCount; step += 1) {
    const ratio = step / postAnchorCount;
    const anchorIndex =
      step === postAnchorCount
        ? pointCount - 1
        : markerIndex + Math.max(1, Math.round(remainingPoints * ratio));
    const trendValue = trade.entryPrice + (trade.exitPrice - trade.entryPrice) * ratio;
    const regimeSwing =
      (random() > 0.52 ? 1 : -1) *
      baseAmplitude *
      (0.42 + random() * 0.95) *
      (1 - Math.abs(ratio - 0.58));
    const noiseSwing = (random() - 0.5) * baseAmplitude * (step === postAnchorCount ? 0.28 : 1.45);

    anchors.push({
      index: anchorIndex,
      value: step === postAnchorCount ? trade.exitPrice : trendValue + regimeSwing + noiseSwing,
    });
  }

  const points = Array.from({ length: pointCount }, () => trade.entryPrice);

  for (let anchorIndex = 0; anchorIndex < anchors.length - 1; anchorIndex += 1) {
    const currentAnchor = anchors[anchorIndex];
    const nextAnchor = anchors[anchorIndex + 1];
    const steps = Math.max(1, nextAnchor.index - currentAnchor.index);

    for (let step = 0; step <= steps; step += 1) {
      const index = currentAnchor.index + step;
      const progress = steps === 0 ? 1 : step / steps;
      const interpolatedValue =
        currentAnchor.value + (nextAnchor.value - currentAnchor.value) * progress;
      const envelope = Math.sin(Math.PI * progress);
      const jaggedNoise =
        (random() - 0.5) * volatility * 2.6 * envelope +
        (random() - 0.5) * volatility * 1.3 * envelope;
      const microKick =
        (random() > 0.68 ? 1 : -1) * random() * volatility * 0.36 * envelope;

      points[index] = interpolatedValue + jaggedNoise + microKick;
    }
  }

  points[markerIndex] = trade.entryPrice;
  points[points.length - 1] = trade.exitPrice;

  const minimumValue = Math.min(...points, trade.entryPrice, trade.exitPrice);
  const maximumValue = Math.max(...points, trade.entryPrice, trade.exitPrice);
  const valueRange = Math.max(baseAmplitude, maximumValue - minimumValue);
  const minimum = minimumValue - valueRange * 0.12;
  const maximum = maximumValue + valueRange * 0.14;

  return {
    points,
    markerIndex,
    minimum,
    maximum,
  };
};

const buildSvgPath = (
  values: number[],
  toX: (index: number) => number,
  toY: (value: number) => number,
) =>
  values
    .map((value, index) => `${index === 0 ? "M" : "L"} ${toX(index)} ${toY(value)}`)
    .join(" ");

const buildAreaPath = (
  values: number[],
  toX: (index: number) => number,
  toY: (value: number) => number,
  baselineY: number,
) => {
  if (values.length === 0) {
    return "";
  }

  const linePath = buildSvgPath(values, toX, toY);
  return `${linePath} L ${toX(values.length - 1)} ${baselineY} L ${toX(0)} ${baselineY} Z`;
};

const buildPresentationData = (trade: {
  id: string;
  asset_symbol: string;
  direction: TradeDirection;
  amount: number;
  entry_price: number;
  exit_price: number;
  expiry_seconds: number;
  profit: number;
  status: "won" | "lost";
  opened_at: string;
  closed_at: string;
}): TradeResultPresentationData => ({
  id: trade.id,
  assetSymbol: trade.asset_symbol,
  direction: trade.direction,
  amount: trade.amount,
  profit: trade.profit,
  status: trade.status,
  entryPrice: trade.entry_price,
  exitPrice: trade.exit_price,
  openedAt: trade.opened_at,
  closedAt: trade.closed_at,
  expirySeconds: trade.expiry_seconds,
});

export const mapTradeHistoryEntryToPresentation = (trade: TradeHistoryEntry): TradeResultPresentationData =>
  buildPresentationData({
    id: trade.id,
    asset_symbol: trade.asset_symbol,
    direction: trade.direction,
    amount: trade.amount,
    entry_price: trade.entry_price,
    exit_price: trade.exit_price ?? trade.entry_price,
    expiry_seconds: trade.expiry_seconds,
    profit: trade.profit ?? 0,
    status: trade.status === "won" ? "won" : "lost",
    opened_at: trade.opened_at,
    closed_at: trade.closed_at ?? trade.opened_at,
  });

export const mapTradeSettlementToPresentation = (trade: TradeSettlement): TradeResultPresentationData =>
  buildPresentationData({
    id: trade.id,
    asset_symbol: trade.asset_symbol,
    direction: trade.direction,
    amount: trade.amount,
    entry_price: trade.entry_price,
    exit_price: trade.exit_price,
    expiry_seconds: trade.expiry_seconds,
    profit: trade.profit,
    status: trade.status,
    opened_at: new Date(new Date(trade.settled_at).getTime() - trade.expiry_seconds * 1000).toISOString(),
    closed_at: trade.settled_at,
  });

const TradeResultChart = ({
  trade,
  compact = false,
}: {
  trade: TradeResultPresentationData;
  compact?: boolean;
}) => {
  const pointCount = compact ? 32 : 56;
  const chartWidth = compact ? 222 : 560;
  const chartHeight = compact ? 102 : 202;
  const rightAxisWidth = compact ? 0 : 52;
  const leftPadding = compact ? 8 : 14;
  const topPadding = compact ? 8 : 12;
  const bottomPadding = compact ? 8 : 24;
  const drawableWidth = chartWidth - leftPadding * 2 - rightAxisWidth;
  const drawableHeight = chartHeight - topPadding - bottomPadding;
  const series = buildTradeResultSeries(trade, pointCount);
  const quotePrecision = getQuotePrecision(trade.entryPrice, trade.exitPrice);
  const tone = trade.direction === "higher" ? TRADING_UP_COLOR : TRADING_DOWN_COLOR;
  const entryBadgeWidth = compact ? 62 : 82;
  const entryBadgeHeight = compact ? 24 : 32;

  const toX = (index: number) =>
    leftPadding + (drawableWidth * index) / Math.max(1, series.points.length - 1);

  const toY = (value: number) =>
    topPadding +
    drawableHeight -
    ((value - series.minimum) / Math.max(0.0000001, series.maximum - series.minimum)) * drawableHeight;

  const linePath = buildSvgPath(series.points, toX, toY);
  const areaPath = buildAreaPath(series.points, toX, toY, topPadding + drawableHeight);
  const entryY = toY(trade.entryPrice);
  const markerX = toX(series.markerIndex);
  const markerY = toY(series.points[series.markerIndex] ?? trade.entryPrice);
  const badgeX = Math.max(leftPadding + 6, markerX - entryBadgeWidth + (compact ? 14 : 18));
  const badgeY = Math.max(topPadding + 6, markerY - entryBadgeHeight + (compact ? 6 : 8));
  const yAxisLabels = compact
    ? []
    : Array.from({ length: 4 }, (_, index) => {
        const progress = index / 3;
        const value = series.maximum - (series.maximum - series.minimum) * progress;
        return {
          label: formatQuote(value, quotePrecision),
          y: topPadding + drawableHeight * progress,
        };
      });
  const xAxisLabels = compact
    ? []
    : Array.from({ length: 5 }, (_, index) => {
        const ratio = index / 4;
        const timestamp = new Date(
          new Date(trade.openedAt).getTime() + trade.expirySeconds * 1000 * ratio,
        ).toISOString();

        return {
          label: formatChartTime(timestamp),
          x: leftPadding + drawableWidth * ratio,
        };
      });

  return (
    <div
      className={`relative overflow-hidden rounded-[10px] border border-white/4 bg-[#253247] ${
        compact ? "h-[102px]" : "h-[238px]"
      }`}
      style={{
        background: compact
          ? "linear-gradient(180deg, rgba(43,53,73,0.98) 0%, rgba(37,47,66,0.98) 100%)"
          : "linear-gradient(180deg, rgba(44,54,74,0.98) 0%, rgba(37,47,66,0.98) 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: compact ? "42px 24px" : "66px 34px",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(5,11,21,0.08)_100%)]" />

      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`trade-area-${trade.id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(25,132,243,0.34)" />
            <stop offset="100%" stopColor="rgba(25,132,243,0.06)" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#trade-area-${trade.id})`} />
        <path
          d={`M ${leftPadding} ${entryY} L ${leftPadding + drawableWidth} ${entryY}`}
          stroke="#ff5f55"
          strokeWidth={compact ? 0.65 : 0.8}
          strokeLinecap="round"
        />
        <path
          d={linePath}
          fill="none"
          stroke="rgba(20,141,255,0.08)"
          strokeWidth={compact ? 1.1 : 1.35}
          strokeLinejoin="miter"
          strokeLinecap="round"
        />
        <path d={linePath} fill="none" stroke="#148dff" strokeWidth={compact ? 0.75 : 0.9} strokeLinejoin="miter" strokeLinecap="round" />

        <circle cx={markerX} cy={markerY} r={compact ? 5 : 6.5} fill="#ffffff" stroke="#ff5f55" strokeWidth={compact ? 2.2 : 2.8} />
        <g transform={`translate(${badgeX},${badgeY})`}>
          <rect rx={compact ? 7 : 10} width={entryBadgeWidth} height={entryBadgeHeight} fill={tone} />
          <foreignObject x={0} y={0} width={entryBadgeWidth} height={entryBadgeHeight}>
            <div className={`flex h-full items-center justify-center gap-1 font-copy font-bold text-white ${compact ? "text-[11px]" : "text-[13px]"}`}>
              {trade.direction === "higher" ? <ArrowUp className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /> : <ArrowDown className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />}
              <span>{formatMoneySuffix(trade.amount)}</span>
            </div>
          </foreignObject>
        </g>

        {!compact ? (
          <>
            {yAxisLabels.map((item) => (
              <text
                key={`${trade.id}-${item.label}-${item.y}`}
                x={chartWidth - 14}
                y={item.y + 4}
                textAnchor="end"
                fill="rgba(200,212,236,0.46)"
                fontSize="12"
                fontWeight="600"
              >
                {item.label}
              </text>
            ))}

            {xAxisLabels.map((item) => (
              <text
                key={`${trade.id}-${item.label}-${item.x}`}
                x={item.x}
                y={chartHeight - 10}
                textAnchor={item.x === leftPadding ? "start" : item.x >= leftPadding + drawableWidth ? "end" : "middle"}
                fill="rgba(200,212,236,0.34)"
                fontSize="11"
                fontWeight="600"
              >
                {item.label}
              </text>
            ))}
          </>
        ) : null}
      </svg>
    </div>
  );
};

export const TradeResultInlinePanel = ({
  trade,
  onOpenModal,
}: {
  trade: TradeHistoryEntry;
  onOpenModal?: (trade: TradeHistoryEntry) => void;
}) => {
  const data = mapTradeHistoryEntryToPresentation(trade);
  const payoutPercent = Math.round((trade.payout_rate ?? 0) * 100);

  return (
    <button
      type="button"
      onClick={() => onOpenModal?.(trade)}
      className="block w-full text-left"
    >
      <div className="border-t border-white/6 pt-2">
        <TradeResultChart trade={data} compact />

        <div className="mt-3 space-y-2.5 text-left">
          <div className="text-[11px] leading-5 text-[#93a0bb]">
            <div>ID:</div>
            <div className="break-all font-semibold text-[#dce5f7]">{data.id}</div>
          </div>

          <div className="text-[11px] leading-5 text-[#93a0bb]">
            <div>Trade Pair:</div>
            <div className="font-semibold text-[#dce5f7]">
              {data.assetSymbol} {payoutPercent > 0 ? `- ${payoutPercent}%` : ""}
            </div>
          </div>

          <div className="text-[11px] leading-5 text-[#93a0bb]">
            <div>Open Price:</div>
            <div className="font-semibold text-[#dce5f7]">{trimTrailingZeros(String(data.entryPrice))}</div>
          </div>

          <div className="text-[11px] leading-5 text-[#93a0bb]">
            <div>Close Price:</div>
            <div className="font-semibold text-[#dce5f7]">{trimTrailingZeros(String(data.exitPrice))}</div>
          </div>

          <div className="text-[11px] leading-5 text-[#93a0bb]">
            <div>Open time:</div>
            <div className="font-semibold text-[#dce5f7]">{formatInlineTimestamp(data.openedAt)}</div>
          </div>

          <div className="text-[11px] leading-5 text-[#93a0bb]">
            <div>Close Time:</div>
            <div className="font-semibold text-[#dce5f7]">{formatInlineTimestamp(data.closedAt)}</div>
          </div>

          <div className="text-[11px] leading-5 text-[#93a0bb]">
            <div>Duration:</div>
            <div className="font-semibold text-[#dce5f7]">{formatTradeClock(data.expirySeconds)}</div>
          </div>
        </div>
      </div>
    </button>
  );
};

export const TradeResultHistoryCard = ({
  trade,
  expanded,
  onToggle,
}: {
  trade: TradeHistoryEntry;
  expanded: boolean;
  onToggle: (trade: TradeHistoryEntry) => void;
}) => {
  const data = mapTradeHistoryEntryToPresentation(trade);
  const resultColor = data.profit >= 0 ? TRADING_UP_COLOR : TRADING_DOWN_COLOR;
  const directionColor = data.direction === "higher" ? TRADING_UP_COLOR : TRADING_DOWN_COLOR;

  return (
    <div className="w-full border-b border-white/6 px-2 py-2 text-left last:border-b-0">
      <div className="rounded-[12px] border border-white/6 bg-[#30384a] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <button
          type="button"
          onClick={() => onToggle(trade)}
          className="w-full text-left transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center text-[#b8c2d8]">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 max-w-[calc(100%-78px)] items-center gap-2.5">
                  <AssetSymbolMark symbol={data.assetSymbol} size={23} />
                  <span className="truncate text-[14px] font-bold text-white">{data.assetSymbol}</span>
                </div>

                <div className="min-w-[76px] shrink-0 text-right text-[11px] font-black tabular-nums text-[#dbe4f4]">
                  {formatTradeClock(data.expirySeconds)}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1.5 text-[12px] font-black" style={{ color: directionColor }}>
                  <span
                    className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full"
                    style={{ background: data.direction === "higher" ? "rgba(24, 216, 125, 0.16)" : "rgba(255, 106, 114, 0.16)" }}
                  >
                    {data.direction === "higher" ? <ArrowUp className="h-3 w-3" strokeWidth={3} /> : <ArrowDown className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span>{formatMoneySuffix(data.amount)}</span>
                </div>

                <div className="text-[12px] font-black" style={{ color: resultColor }}>
                  {formatMoneySuffix(data.profit, true)}
                </div>
              </div>
            </div>
          </div>
        </button>

        {expanded ? (
          <div className="mt-3 block w-full rounded-[10px] border border-white/5 bg-[#2e3749] px-2.5 py-2.5 text-left">
            <TradeResultChart trade={data} compact />

            <div className="mt-3 text-[11px] leading-5 text-[#8f9ab3]">
              <div>ID:</div>
              <div className="break-all font-semibold text-[#cdd7eb]">{data.id}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const TradeResultDetailModal = ({
  trade,
  onClose,
}: {
  trade: TradeResultPresentationData | null;
  onClose: () => void;
}) => {
  const [auditEntries, setAuditEntries] = useState<TradeBalanceAuditEntry[]>([]);

  useEffect(() => {
    if (!trade) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, trade]);

  useEffect(() => {
    let cancelled = false;

    if (!trade) {
      setAuditEntries([]);
      return;
    }

    void fetchTradeBalanceAuditEntries(trade.id).then((entries) => {
      if (!cancelled) {
        setAuditEntries(entries);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [trade]);

  if (!trade) {
    return null;
  }

  const quotePrecision = getQuotePrecision(trade.entryPrice, trade.exitPrice);
  const resultColor = trade.profit >= 0 ? TRADING_UP_COLOR : TRADING_DOWN_COLOR;
  const directionColor = trade.direction === "higher" ? TRADING_UP_COLOR : TRADING_DOWN_COLOR;
  const differencePoints = Math.round((trade.exitPrice - trade.entryPrice) * 10 ** quotePrecision);

  return (
    <div className="fixed inset-0 z-[420] flex items-center justify-center px-3 py-4">
      <button
        type="button"
        aria-label="Close trade result"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(11,16,28,0.68)] backdrop-blur-[9px]"
      />

      <div className="relative z-[421] max-h-[calc(100vh-32px)] w-full max-w-[620px] overflow-x-hidden overflow-y-auto rounded-[16px] border border-white/7 bg-[#30384c] shadow-[0_34px_80px_rgba(0,0,0,0.42)]">
        <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[16px] font-bold text-white">Trade ID</div>
            <div className="mt-1.5 break-all text-[12px] font-semibold text-[#eef4ff]">{trade.id}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <div className="text-[12px] font-semibold text-[#a8b2c7]">Asset:</div>
              <div className="mt-1.5 flex items-center gap-2.5">
                <AssetSymbolMark symbol={trade.assetSymbol} size={24} />
                <span className="text-[15px] font-bold text-white">{trade.assetSymbol}</span>
              </div>
            </div>

            <div>
              <div className="text-[12px] font-semibold text-[#a8b2c7]">Type:</div>
              <div className="mt-1.5 inline-flex items-center gap-2 text-[14px] font-bold" style={{ color: directionColor }}>
                <span
                  className="inline-flex h-[24px] w-[24px] items-center justify-center rounded-full"
                  style={{ background: trade.direction === "higher" ? "rgba(24, 216, 125, 0.16)" : "rgba(255, 106, 114, 0.16)" }}
                >
                  {trade.direction === "higher" ? <ArrowUp className="h-4 w-4" strokeWidth={2.8} /> : <ArrowDown className="h-4 w-4" strokeWidth={2.8} />}
                </span>
                <span>{formatMoneySuffix(trade.amount)}</span>
              </div>
            </div>

            <div>
              <div className="text-[12px] font-semibold text-[#a8b2c7]">Duration:</div>
              <div className="mt-1.5 inline-flex items-center gap-2 text-[14px] font-bold text-white">
                <Clock3 className="h-4.5 w-4.5 text-[#cfd8eb]" />
                <span>{formatTradeClock(trade.expirySeconds)}</span>
              </div>
            </div>

            <div>
              <div className="text-[12px] font-semibold text-[#a8b2c7]">Result:</div>
              <div className="mt-1.5 text-[14px] font-bold" style={{ color: resultColor }}>
                {formatMoneySuffix(trade.profit, true)}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <TradeResultChart trade={trade} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-[12px] font-semibold text-[#a8b2c7]">Opening quote:</div>
              <div className="mt-1.5 text-[14px] font-bold text-white">{formatQuote(trade.entryPrice, quotePrecision)}</div>
              <div className="mt-1 text-[12px] text-[#ced8eb]">{formatTradeTimestamp(trade.openedAt)}</div>
            </div>

            <div>
              <div className="text-[12px] font-semibold text-[#a8b2c7]">Closing quote:</div>
              <div className="mt-1.5 text-[14px] font-bold text-white">{formatQuote(trade.exitPrice, quotePrecision)}</div>
              <div className="mt-1 text-[12px] text-[#ced8eb]">{formatTradeTimestamp(trade.closedAt)}</div>
            </div>

            <div>
              <div className="text-[12px] font-semibold text-[#a8b2c7]">Difference:</div>
              <div className="mt-1.5 text-[14px] font-bold text-white">
                {differencePoints > 0 ? "+" : ""}{differencePoints} points
              </div>
            </div>
          </div>

          {auditEntries.length > 0 ? (
            <div className="mt-4 rounded-[14px] border border-white/7 bg-[#2a3243] px-3 py-3">
              <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#a8b2c7]">Balance trail</div>
              <div className="mt-2 space-y-2">
                {auditEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid gap-2 rounded-[10px] border border-white/6 bg-[#232b3b] px-3 py-2.5 text-[12px] text-[#d8e2f5] sm:grid-cols-[100px_1fr_105px_105px]"
                  >
                    <div>
                      <div className="font-black uppercase tracking-[0.08em] text-white">
                        {entry.event_type === "trade_open" ? "Trade open" : "Trade close"}
                      </div>
                      <div className="mt-1 text-[11px] text-[#97a5bf]">{formatInlineTimestamp(entry.created_at)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#97a5bf]">Balance</div>
                      <div className="font-semibold text-white">
                        {`${entry.balance_before.toFixed(2)} $ -> ${entry.balance_after.toFixed(2)} $`}
                      </div>
                      <div className="mt-1 text-[11px] text-[#97a5bf]">
                        {`Available ${entry.available_balance_before.toFixed(2)} $ -> ${entry.available_balance_after.toFixed(2)} $`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#97a5bf]">Change</div>
                      <div className="font-semibold" style={{ color: entry.change_amount >= 0 ? TRADING_UP_COLOR : TRADING_DOWN_COLOR }}>
                        {formatAuditMoney(entry.change_amount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#97a5bf]">Reserved</div>
                      <div className="font-semibold text-white">{entry.reserved_withdrawal_balance.toFixed(2)} $</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
