import { useEffect, useRef, type MutableRefObject } from "react";
import {
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  IChartApi,
  IPriceLine,
  ISeriesApi,
  LineSeries,
  LineStyle,
  type Time,
} from "lightweight-charts";
import { X } from "lucide-react";
import type { OHLCCandle } from "../engine/priceEngine";
import { calculateMacd, calculateRsi } from "./calculations";
import type { ActiveIndicator } from "./types";

interface OscillatorPaneProps {
  indicator: ActiveIndicator;
  candlesRef: MutableRefObject<OHLCCandle[]>;
  renderKey: number;
  syncMainChart: IChartApi | null;
  onRemove?: () => void;
}

type PaneSeries = {
  rsi?: ISeriesApi<"Line">;
  macd?: ISeriesApi<"Line">;
  signal?: ISeriesApi<"Line">;
  histogram?: ISeriesApi<"Histogram">;
};

const toChartLineData = (points: Array<{ time: number; value: number }>) =>
  points.map((point) => ({ time: point.time as Time, value: point.value }));

const toSafeNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const OscillatorPane = ({ indicator, candlesRef, renderKey, syncMainChart, onRemove }: OscillatorPaneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<PaneSeries>({});
  const overboughtLineRef = useRef<IPriceLine | null>(null);
  const oversoldLineRef = useRef<IPriceLine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 140,
      layout: {
        background: { type: ColorType.Solid, color: "#0c131d" },
        textColor: "#8f9bad",
      },
      grid: {
        vertLines: { color: "rgba(143, 155, 173, 0.1)" },
        horzLines: { color: "rgba(143, 155, 173, 0.1)" },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.16)", style: LineStyle.Dashed },
        horzLine: { color: "rgba(255,255,255,0.16)", style: LineStyle.Dashed },
      },
    });

    chartRef.current = chart;

    if (indicator.key === "rsi") {
      seriesRef.current.rsi = chart.addSeries(LineSeries, {
        color: "#a78bfa",
        lineWidth: 2,
      });
    }

    if (indicator.key === "macd") {
      seriesRef.current.histogram = chart.addSeries(HistogramSeries, {
        priceFormat: {
          type: "price",
          precision: 5,
          minMove: 0.00001,
        },
      });
      seriesRef.current.macd = chart.addSeries(LineSeries, {
        color: "#60a5fa",
        lineWidth: 2,
      });
      seriesRef.current.signal = chart.addSeries(LineSeries, {
        color: "#facc15",
        lineWidth: 2,
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
      overboughtLineRef.current = null;
      oversoldLineRef.current = null;
    };
  }, [indicator.key]);

  useEffect(() => {
    if (!syncMainChart || !chartRef.current) return;

    const paneChart = chartRef.current;

    const syncRange = (range: { from: number; to: number } | null) => {
      if (!range) return;
      paneChart.timeScale().setVisibleLogicalRange(range);
    };

    syncRange(syncMainChart.timeScale().getVisibleLogicalRange());
    syncMainChart.timeScale().subscribeVisibleLogicalRangeChange(syncRange);

    return () => {
      syncMainChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncRange);
    };
  }, [syncMainChart]);

  useEffect(() => {
    if (!chartRef.current) return;

    const candles = candlesRef.current;
    if (candles.length === 0) return;

    if (indicator.key === "rsi" && seriesRef.current.rsi) {
      const period = toSafeNumber(indicator.params.period, 14);
      const overbought = toSafeNumber(indicator.params.overbought, 70);
      const oversold = toSafeNumber(indicator.params.oversold, 30);
      const color = typeof indicator.params.color === "string" ? indicator.params.color : "#a78bfa";
      const lineWidth = Math.max(1, Math.min(4, toSafeNumber(indicator.params.lineWidth, 2)));
      const data = toChartLineData(calculateRsi(candles, period));

      seriesRef.current.rsi.applyOptions({ color, lineWidth });
      seriesRef.current.rsi.setData(data);

      if (!overboughtLineRef.current) {
        overboughtLineRef.current = seriesRef.current.rsi.createPriceLine({
          price: overbought,
          color: "rgba(239, 68, 68, 0.65)",
          lineStyle: LineStyle.Dashed,
          lineWidth: 1,
          axisLabelVisible: false,
          title: "",
        });
      } else {
        overboughtLineRef.current.applyOptions({ price: overbought });
      }

      if (!oversoldLineRef.current) {
        oversoldLineRef.current = seriesRef.current.rsi.createPriceLine({
          price: oversold,
          color: "rgba(34, 197, 94, 0.65)",
          lineStyle: LineStyle.Dashed,
          lineWidth: 1,
          axisLabelVisible: false,
          title: "",
        });
      } else {
        oversoldLineRef.current.applyOptions({ price: oversold });
      }

      chartRef.current.priceScale("right").applyOptions({
        scaleMargins: { top: 0.12, bottom: 0.12 },
        autoScale: false,
      });
    }

    if (indicator.key === "macd" && seriesRef.current.macd && seriesRef.current.signal && seriesRef.current.histogram) {
      const fastPeriod = toSafeNumber(indicator.params.fastPeriod, 12);
      const slowPeriod = toSafeNumber(indicator.params.slowPeriod, 26);
      const signalPeriod = toSafeNumber(indicator.params.signalPeriod, 9);
      const macdColor = typeof indicator.params.macdColor === "string" ? indicator.params.macdColor : "#60a5fa";
      const signalColor = typeof indicator.params.signalColor === "string" ? indicator.params.signalColor : "#facc15";
      const histogramUpColor =
        typeof indicator.params.histogramUpColor === "string" ? indicator.params.histogramUpColor : "#22c55e";
      const histogramDownColor =
        typeof indicator.params.histogramDownColor === "string" ? indicator.params.histogramDownColor : "#ef4444";

      const data = calculateMacd(candles, fastPeriod, slowPeriod, signalPeriod);

      seriesRef.current.macd.applyOptions({ color: macdColor });
      seriesRef.current.signal.applyOptions({ color: signalColor });
      seriesRef.current.macd.setData(toChartLineData(data.macd));
      seriesRef.current.signal.setData(toChartLineData(data.signal));
      seriesRef.current.histogram.setData(
        data.histogram.map((point) => ({
          time: point.time as Time,
          value: point.value,
          color: point.value >= 0 ? histogramUpColor : histogramDownColor,
        })),
      );
    }

    chartRef.current.timeScale().fitContent();
  }, [candlesRef, indicator, renderKey]);

  if (indicator.key !== "rsi" && indicator.key !== "macd") {
    return null;
  }

  return (
    <div className="flex h-[176px] flex-col border-t border-white/5 bg-[#0b1118]">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">{indicator.name}</p>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <div ref={containerRef} className="flex-1" />
    </div>
  );
};
