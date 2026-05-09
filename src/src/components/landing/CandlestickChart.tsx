import { useEffect, useState } from "react";

interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
}

const generateCandles = (count: number): Candle[] => {
  const candles: Candle[] = [];
  let price = 50;

  for (let index = 0; index < count; index += 1) {
    const change = (Math.random() - 0.45) * 8;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 4;
    const low = Math.min(open, close) - Math.random() * 4;
    candles.push({ open, close, high, low });
    price = close;
  }

  return candles;
};

type CandlestickChartProps = {
  width?: number;
  height?: number;
  candleCount?: number;
  className?: string;
};

const CandlestickChart = ({
  width = 400,
  height = 220,
  candleCount = 28,
  className = "",
}: CandlestickChartProps) => {
  const [candles, setCandles] = useState<Candle[]>(() => generateCandles(candleCount));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCandles((previous) => {
        const next = [...previous.slice(1)];
        const last = previous[previous.length - 1];
        const change = (Math.random() - 0.45) * 8;
        const open = last.close;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * 4;
        const low = Math.min(open, close) - Math.random() * 4;
        next.push({ open, close, high, low });
        return next;
      });
      setTick((value) => value + 1);
    }, 2000);

    return () => window.clearInterval(interval);
  }, []);

  const allValues = candles.flatMap((candle) => [candle.high, candle.low]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;
  const padding = 16;
  const chartHeight = height - padding * 2;
  const candleWidth = (width - padding * 2) / candleCount;
  const gap = candleWidth * 0.25;

  const toY = (value: number) =>
    padding + chartHeight - ((value - minVal) / range) * chartHeight;

  const priceLinePoints = candles
    .map((candle, index) => {
      const x = padding + index * candleWidth + candleWidth / 2;
      const y = toY((candle.open + candle.close) / 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ width: "100%", height: "100%" }}
    >
      {[0.25, 0.5, 0.75].map((pct) => (
        <line
          key={pct}
          x1={padding}
          y1={padding + chartHeight * pct}
          x2={width - padding}
          y2={padding + chartHeight * pct}
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
          strokeDasharray="4 4"
          opacity={0.4}
        />
      ))}

      {candles.map((candle, index) => {
        const x = padding + index * candleWidth + gap / 2;
        const bullish = candle.close >= candle.open;
        const bodyTop = toY(Math.max(candle.open, candle.close));
        const bodyBottom = toY(Math.min(candle.open, candle.close));
        const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
        const wickX = x + (candleWidth - gap) / 2;

        return (
          <g key={`${tick}-${index}`}>
            <line
              x1={wickX}
              y1={toY(candle.high)}
              x2={wickX}
              y2={toY(candle.low)}
              stroke={bullish ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
              strokeWidth="1"
              opacity={0.7}
            />
            <rect
              x={x}
              y={bodyTop}
              width={candleWidth - gap}
              height={bodyHeight}
              rx={1}
              fill={bullish ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
              opacity={bullish ? 0.9 : 0.75}
            />
          </g>
        );
      })}

      <polyline
        key={`line-${tick}`}
        points={priceLinePoints}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        opacity={0.3}
        strokeLinejoin="round"
      />

      {candles.length > 0 ? (
        <g>
          <line
            x1={width - padding - 40}
            y1={toY(candles[candles.length - 1].close)}
            x2={width - padding}
            y2={toY(candles[candles.length - 1].close)}
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
          <rect
            x={width - padding - 2}
            y={toY(candles[candles.length - 1].close) - 8}
            width={36}
            height={16}
            rx={3}
            fill="hsl(var(--primary))"
          />
          <text
            x={width - padding + 16}
            y={toY(candles[candles.length - 1].close) + 3}
            textAnchor="middle"
            fontSize="7"
            fill="hsl(var(--primary-foreground))"
            fontFamily="Inter, sans-serif"
            fontWeight="600"
          >
            {candles[candles.length - 1].close.toFixed(1)}
          </text>
        </g>
      ) : null}
    </svg>
  );
};

export default CandlestickChart;
