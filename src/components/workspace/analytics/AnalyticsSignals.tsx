import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BellRing,
  CheckCircle2,
  Clock3,
  MinusCircle,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  buildTradingSignalSnapshot,
  getSignalPricePrecision,
  type SignalAssetInput,
  type SignalDirection,
  type SignalTimeframe,
  type VerifiedSignal,
} from "@/lib/tradingSignals";

export type AnalyticsSignalAsset = SignalAssetInput;

interface AnalyticsSignalsProps {
  asset?: AnalyticsSignalAsset;
}

const TIMEFRAME_OPTIONS: Array<{ label: string; value: SignalTimeframe }> = [
  { label: "1 min", value: "1m" },
  { label: "5 min", value: "5m" },
  { label: "15 min", value: "15m" },
];

const getActionCopy = (action: SignalDirection) => {
  if (action === "higher") {
    return {
      label: "Up Signal",
      shortLabel: "UP",
      color: "text-[#00C076]",
      bg: "bg-[#00C076]/10",
      border: "border-[#00C076]/25",
      icon: TrendingUp,
    };
  }

  if (action === "lower") {
    return {
      label: "Down Signal",
      shortLabel: "DOWN",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-400/25",
      icon: TrendingDown,
    };
  }

  return {
    label: "Wait for Setup",
    shortLabel: "WAIT",
    color: "text-[#b6c3de]",
    bg: "bg-white/[0.04]",
    border: "border-white/10",
    icon: MinusCircle,
  };
};

const formatPercent = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const formatSignedNumber = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
};

const formatSignalTime = (seconds: number) =>
  new Date(seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const AnalyticsSignals = ({ asset }: AnalyticsSignalsProps) => {
  const [timeframe, setTimeframe] = useState<SignalTimeframe>("1m");
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000);

  useEffect(() => {
    const timer = window.setInterval(() => setNowSec(Date.now() / 1000), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const snapshot = useMemo(
    () => buildTradingSignalSnapshot(asset, timeframe, nowSec),
    [asset, timeframe, nowSec],
  );
  const actionCopy = getActionCopy(snapshot.action);
  const ActionIcon = actionCopy.icon;
  const pricePrecision = getSignalPricePrecision(snapshot.currentPrice);
  const confidenceWidth = snapshot.action === "neutral" ? 50 : snapshot.confidence;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#7e8ba8]">Live technical model</p>
          <h3 className="mt-1 text-[22px] font-black text-white">{snapshot.symbol} Signals</h3>
          <p className="mt-1 text-[13px] text-[#9fb0cf]">
            Signals are calculated from EMA, RSI, MACD, Bollinger position, and recent candle behavior.
          </p>
        </div>

        <div className="flex w-full gap-2 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-1 md:w-auto">
          {TIMEFRAME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeframe(option.value)}
              className={`shrink-0 rounded-lg px-4 py-2 text-[12px] font-black transition-colors ${
                timeframe === option.value
                  ? "bg-[#0b65c2] text-white"
                  : "text-[#8fa0bf] hover:bg-white/5 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div
          className={`rounded-2xl border p-5 shadow-sm ${actionCopy.bg} ${actionCopy.border}`}
          style={{ backgroundColor: "color-mix(in srgb, var(--trading-panel-bg) 88%, transparent)" }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${actionCopy.bg}`}>
                <ActionIcon className={`h-7 w-7 ${actionCopy.color}`} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-[22px] font-black text-white">{actionCopy.label}</h4>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${actionCopy.color} ${actionCopy.border}`}>
                    {snapshot.strengthLabel}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-[#9fb0cf]">
                  Prediction window: {snapshot.expiryLabel}. Generated at{" "}
                  {formatSignalTime(snapshot.generatedAt)}.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7e8ba8]">Price now</div>
              <div className="mt-1 text-[22px] font-black text-white">
                {snapshot.currentPrice.toFixed(pricePrecision)}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SignalMetric label="Signal strength" value={`${snapshot.confidence}%`} accentClass={actionCopy.color} />
            <SignalMetric label="Support" value={snapshot.support.toFixed(pricePrecision)} />
            <SignalMetric label="Resistance" value={snapshot.resistance.toFixed(pricePrecision)} />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em] text-[#7e8ba8]">
              <span>Direction score</span>
              <span className={actionCopy.color}>{snapshot.score > 0 ? "+" : ""}{snapshot.score}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/25">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${
                  snapshot.action === "lower" ? "bg-red-400" : snapshot.action === "higher" ? "bg-[#00C076]" : "bg-[#8fa0bf]"
                }`}
                style={{ width: `${confidenceWidth}%` }}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {snapshot.reasons.map((reason) => (
              <div key={reason} className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/15 p-3">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-[#0b65c2]" />
                <span className="text-[13px] leading-5 text-[#c7d2ea]">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <SummaryCard
            icon={<Target className="h-6 w-6 text-[#00C076]" />}
            label="Verified Accuracy"
            value={snapshot.verifiedAccuracy === null ? "--" : `${snapshot.verifiedAccuracy}%`}
            description={`${snapshot.verifiedWins} wins / ${snapshot.verifiedLosses} losses from recent closed-candle checks`}
          />
          <SummaryCard
            icon={<BellRing className="h-6 w-6 text-[#0b65c2]" />}
            label="Signal Mode"
            value={actionCopy.shortLabel}
            description="Auto-refreshes every 5 seconds while this panel is open."
          />
          <SummaryCard
            icon={<Clock3 className="h-6 w-6 text-[#f7b731]" />}
            label="Indicator Bias"
            value={formatSignedNumber(snapshot.trendBias)}
            description={`RSI ${snapshot.rsi === null ? "--" : snapshot.rsi.toFixed(1)} / MACD ${formatSignedNumber(snapshot.macdBias)}`}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 p-5 shadow-sm" style={{ background: "var(--trading-panel-bg)" }}>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 className="text-[18px] font-black text-white">Verified Signal History</h4>
            <p className="text-[13px] text-[#9fb0cf]">
              Each row is checked against the next three candles, so the result is based on market movement.
            </p>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7e8ba8]">
            {snapshot.timeframe} history
          </span>
        </div>

        {snapshot.verifiedHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.18em] text-[#7e8ba8]">
                  <th className="py-3 pr-4">Time</th>
                  <th className="py-3 pr-4">Signal</th>
                  <th className="py-3 pr-4">Strength</th>
                  <th className="py-3 pr-4">Entry</th>
                  <th className="py-3 pr-4">Exit</th>
                  <th className="py-3 pr-4">Move</th>
                  <th className="py-3 pr-4">Result</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.verifiedHistory.map((signal) => (
                  <SignalHistoryRow key={signal.id} signal={signal} pricePrecision={pricePrecision} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/15 p-8 text-center">
            <BellRing className="mx-auto mb-3 h-9 w-9 text-[#0b65c2]/70" />
            <h5 className="text-[16px] font-black text-white">Gathering signal history</h5>
            <p className="mx-auto mt-2 max-w-xl text-[13px] leading-6 text-[#9fb0cf]">
              The signal engine needs enough closed candles before it can verify recent predictions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const SignalMetric = ({
  label,
  value,
  accentClass = "text-white",
}: {
  label: string;
  value: string;
  accentClass?: string;
}) => (
  <div className="rounded-xl border border-white/5 bg-black/15 p-4">
    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7e8ba8]">{label}</div>
    <div className={`mt-2 text-[20px] font-black ${accentClass}`}>{value}</div>
  </div>
);

const SummaryCard = ({
  icon,
  label,
  value,
  description,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  description: string;
}) => (
  <div className="rounded-2xl border border-white/10 p-5 shadow-sm" style={{ background: "var(--trading-panel-bg)" }}>
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">{icon}</div>
    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7e8ba8]">{label}</div>
    <div className="mt-2 text-[26px] font-black text-white">{value}</div>
    <p className="mt-2 text-[13px] leading-5 text-[#9fb0cf]">{description}</p>
  </div>
);

const SignalHistoryRow = ({ signal, pricePrecision }: { signal: VerifiedSignal; pricePrecision: number }) => {
  const directionCopy = getActionCopy(signal.direction);
  const DirectionIcon = directionCopy.icon;
  const ResultIcon = signal.result === "won" ? CheckCircle2 : XCircle;

  return (
    <tr className="border-b border-white/5 text-[13px] text-[#c7d2ea] last:border-b-0">
      <td className="py-3 pr-4 font-bold text-white">{formatSignalTime(signal.time)}</td>
      <td className="py-3 pr-4">
        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-black ${directionCopy.bg} ${directionCopy.color}`}>
          <DirectionIcon className="h-3.5 w-3.5" />
          {directionCopy.shortLabel}
        </span>
      </td>
      <td className="py-3 pr-4 font-bold">{signal.confidence}%</td>
      <td className="py-3 pr-4 font-mono">{signal.entryPrice.toFixed(pricePrecision)}</td>
      <td className="py-3 pr-4 font-mono">{signal.exitPrice.toFixed(pricePrecision)}</td>
      <td className={`py-3 pr-4 font-bold ${signal.movePercent >= 0 ? "text-[#00C076]" : "text-red-400"}`}>
        {formatPercent(signal.movePercent)}
      </td>
      <td className="py-3 pr-4">
        <span className={`inline-flex items-center gap-2 font-black ${signal.result === "won" ? "text-[#00C076]" : "text-red-400"}`}>
          <ResultIcon className="h-4 w-4" />
          {signal.result === "won" ? "Verified" : "Missed"}
        </span>
      </td>
    </tr>
  );
};
