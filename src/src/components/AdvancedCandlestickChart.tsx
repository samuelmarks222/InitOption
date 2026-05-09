import React, { useEffect, useRef } from "react";
import {
  createChart,
  CrosshairMode,
  ColorType,
  ISeriesApi,
  UTCTimestamp,
  CandlestickData,
} from "lightweight-charts";

interface Candle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Props {
  data: Candle[];
}

const AdvancedCandlestickChart: React.FC<Props> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "#181A20" },
        textColor: "#D9D9D9",
      },
      grid: {
        vertLines: { color: "#363C4E" },
        horzLines: { color: "#363C4E" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "#71649C",
      },
      timeScale: {
        borderColor: "#71649C",
        timeVisible: true,
        secondsVisible: true,
      },
    });
    seriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    seriesRef.current.setData(data);
    // Responsive resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chartRef.current?.remove();
    };
  }, [data]);

  // Real-time update example (simulate new candle every 2s)
  useEffect(() => {
    if (!seriesRef.current) return;
    const interval = setInterval(() => {
      // Simulate new candle (replace with real data in production)
      const last = data[data.length - 1];
      const newCandle = {
        ...last,
        time: (last.time + 60) as UTCTimestamp,
        open: last.close,
        high: last.close + Math.random() * 2,
        low: last.close - Math.random() * 2,
        close: last.close + (Math.random() - 0.5) * 4,
      };
      seriesRef.current?.update(newCandle);
    }, 2000);
    return () => clearInterval(interval);
  }, [data]);

  return <div ref={chartContainerRef} style={{ width: "100%", height: 400 }} />;
};

export default AdvancedCandlestickChart;
