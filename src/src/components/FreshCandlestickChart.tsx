import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  UTCTimestamp,
  ISeriesApi,
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
  height?: number;
}

const FreshCandlestickChart: React.FC<Props> = ({ data, height = 400 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#181A20" },
        textColor: "#D9D9D9",
        fontSize: 14,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: "#23242b", style: 0, visible: true },
        horzLines: { color: "#23242b", style: 0, visible: true },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#fff", width: 2, style: 0, visible: true, labelVisible: true },
        horzLine: { color: "#fff", width: 2, style: 0, visible: true, labelVisible: true },
      },
      rightPriceScale: {
        borderColor: "#23242b",
        scaleMargins: { top: 0.15, bottom: 0.15 },
        drawTicks: true,
        ticksVisible: true,
      },
      timeScale: {
        borderColor: "#23242b",
        timeVisible: true,
        secondsVisible: true,
        tickMarkFormatter: (time, tickMarkType, locale) => {
          const date = new Date((time as number) * 1000);
          return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        },
        // Make candles fill the chart horizontally
        barSpacing: 18, // Increase for wider candles
        minBarSpacing: 14,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: true,
      handleScale: true,
      localization: {
        priceFormatter: price => price.toFixed(5),
      },
      watermark: {
        visible: false,
      },
    });
    seriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: "#17d67a",
      downColor: "#ff4d6d",
      borderUpColor: "#17d67a",
      borderDownColor: "#ff4d6d",
      wickUpColor: "#17d67a",
      wickDownColor: "#ff4d6d",
      priceLineVisible: true,
      lastValueVisible: true,
      // Make candles thick and wicks thin
      // (width and wickWidth are not official options, but some chart libs support them)
      // If not supported, the barSpacing above will still make candles wide
    });
    // Zoom in to show fewer candles and make them prominent
    chartRef.current.timeScale().setVisibleLogicalRange({ from: Math.max(0, data.length - 30), to: data.length });
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
  }, [data, height]);

  return <div ref={chartContainerRef} style={{ width: "100%", height }} />;
};

export default FreshCandlestickChart;
