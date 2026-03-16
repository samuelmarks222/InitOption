import { useEffect, useState, useRef, useCallback } from "react";
import ChartToolbar from "./ChartToolbar";

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  time: number;
}

interface TradingChartProps {
  asset: {
    symbol: string;
    price: number;
  };
  onPriceUpdate?: (price: number) => void;
}

const generateCandles = (count: number, basePrice: number): Candle[] => {
  const candles: Candle[] = [];
  let currentPrice = basePrice;
  const now = Date.now();

  for (let i = count; i >= 0; i--) {
    const volatility = 0.002;
    const change = (Math.random() - 0.5) * 2 * volatility;
    const open = currentPrice;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);

    candles.push({
      open,
      high,
      low,
      close,
      time: now - i * 60000,
    });

    currentPrice = close;
  }

  return candles;
};

const TradingChart = ({ asset }: TradingChartProps) => {
  const [candles, setCandles] = useState<Candle[]>(() => generateCandles(40, asset.price));
  const [currentPrice, setCurrentPrice] = useState(asset.price);
  const [timeframe, setTimeframe] = useState(43200); // 12h default
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const lastPriceRef = useRef(asset.price);

  const toggleIndicator = useCallback((id: string) => {
    setActiveIndicators((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  // Smooth price animation with blinking effect
  useEffect(() => {
    let lastTime = 0;
    const updateInterval = 100; // Update every 100ms for smooth animation

    const animate = (time: number) => {
      if (time - lastTime >= updateInterval) {
        lastTime = time;

        setCandles((prev) => {
          const lastCandle = prev[prev.length - 1];
          const volatility = 0.00015; // Smaller volatility for smoother movement
          const change = (Math.random() - 0.5) * 2 * volatility;
          const newClose = lastCandle.close * (1 + change);

          setCurrentPrice(newClose);
          lastPriceRef.current = newClose;

          // Trigger blinking effect
          setIsBlinking(true);
          setTimeout(() => setIsBlinking(false), 150);

          // Update last candle smoothly
          const updatedCandles = [...prev];
          updatedCandles[updatedCandles.length - 1] = {
            ...lastCandle,
            close: newClose,
            high: Math.max(lastCandle.high, newClose),
            low: Math.min(lastCandle.low, newClose),
          };

          return updatedCandles;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Add new candle periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles((prev) => {
        const lastCandle = prev[prev.length - 1];
        const newCandle: Candle = {
          open: lastCandle.close,
          high: lastCandle.close,
          low: lastCandle.close,
          close: lastCandle.close,
          time: Date.now(),
        };

        // Keep last 50 candles
        const newCandles = [...prev.slice(-49), newCandle];
        return newCandles;
      });
    }, 30000); // New candle every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const minPrice = Math.min(...candles.map((c) => c.low));
  const maxPrice = Math.max(...candles.map((c) => c.high));
  const priceRange = maxPrice - minPrice;

  const getY = (price: number) => {
    return ((maxPrice - price) / priceRange) * 100;
  };

  const candleWidth = 100 / candles.length;

  // Calculate SMA if active
  const smaValues = activeIndicators.includes("sma")
    ? candles.map((_, index) => {
        if (index < 9) return null;
        const sum = candles.slice(index - 9, index + 1).reduce((acc, c) => acc + c.close, 0);
        return sum / 10;
      })
    : [];

  // Calculate EMA if active
  const emaValues = activeIndicators.includes("ema")
    ? (() => {
        const multiplier = 2 / (10 + 1);
        const ema: (number | null)[] = [];
        candles.forEach((candle, index) => {
          if (index === 0) {
            ema.push(candle.close);
          } else {
            const prevEma = ema[index - 1] || candle.close;
            ema.push((candle.close - prevEma) * multiplier + prevEma);
          }
        });
        return ema;
      })()
    : [];

  // Calculate Bollinger Bands if active
  const bbValues = activeIndicators.includes("bb")
    ? candles.map((_, index) => {
        if (index < 19) return null;
        const slice = candles.slice(index - 19, index + 1);
        const mean = slice.reduce((acc, c) => acc + c.close, 0) / 20;
        const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / 20;
        const std = Math.sqrt(variance);
        return {
          upper: mean + 2 * std,
          middle: mean,
          lower: mean - 2 * std,
        };
      })
    : [];

  const lastCandle = candles[candles.length - 1];
  const isGreen = lastCandle?.close >= lastCandle?.open;

  return (
    <div className="flex-1 bg-chart-bg relative" ref={containerRef}>
      {/* Chart Toolbar */}
      <ChartToolbar
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        activeIndicators={activeIndicators}
        onToggleIndicator={toggleIndicator}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
      />

      {/* Chart OHLC info */}
      <div className="absolute left-24 top-4 z-10 flex gap-4 text-xs text-muted-foreground">
        <span>
          Open <span className="text-foreground">{lastCandle?.open.toFixed(6)}</span>
        </span>
        <span>
          High <span className="text-foreground">{lastCandle?.high.toFixed(6)}</span>
        </span>
        <span>
          Low <span className="text-foreground">{lastCandle?.low.toFixed(6)}</span>
        </span>
        <span>
          Close{" "}
          <span className={isGreen ? "text-trading-green" : "text-trading-red"}>
            {lastCandle?.close.toFixed(6)}
          </span>
        </span>
      </div>

      {/* SVG Chart */}
      <svg className="w-full h-full" preserveAspectRatio="none">
        <defs>
          {/* Blinking animation for current candle */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={`${y}%`}
            x2="100%"
            y2={`${y}%`}
            className="chart-grid"
            strokeWidth="1"
            strokeDasharray="4"
            opacity="0.3"
          />
        ))}

        {/* Bollinger Bands */}
        {bbValues.length > 0 && (
          <>
            {/* Upper band */}
            <polyline
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1"
              opacity="0.5"
              points={bbValues
                .map((bb, index) => {
                  if (!bb) return "";
                  const x = index * candleWidth + candleWidth / 2;
                  return `${x}%,${getY(bb.upper)}%`;
                })
                .filter(Boolean)
                .join(" ")}
            />
            {/* Lower band */}
            <polyline
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1"
              opacity="0.5"
              points={bbValues
                .map((bb, index) => {
                  if (!bb) return "";
                  const x = index * candleWidth + candleWidth / 2;
                  return `${x}%,${getY(bb.lower)}%`;
                })
                .filter(Boolean)
                .join(" ")}
            />
          </>
        )}

        {/* SMA Line */}
        {smaValues.length > 0 && (
          <polyline
            fill="none"
            stroke="hsl(30 100% 50%)"
            strokeWidth="1.5"
            points={smaValues
              .map((sma, index) => {
                if (!sma) return "";
                const x = index * candleWidth + candleWidth / 2;
                return `${x}%,${getY(sma)}%`;
              })
              .filter(Boolean)
              .join(" ")}
          />
        )}

        {/* EMA Line */}
        {emaValues.length > 0 && (
          <polyline
            fill="none"
            stroke="hsl(280 100% 60%)"
            strokeWidth="1.5"
            points={emaValues
              .map((ema, index) => {
                if (!ema) return "";
                const x = index * candleWidth + candleWidth / 2;
                return `${x}%,${getY(ema)}%`;
              })
              .filter(Boolean)
              .join(" ")}
          />
        )}

        {/* Candles */}
        {candles.map((candle, index) => {
          const isCandleGreen = candle.close >= candle.open;
          const isLast = index === candles.length - 1;
          const x = index * candleWidth + candleWidth / 2;
          const bodyTop = getY(Math.max(candle.open, candle.close));
          const bodyBottom = getY(Math.min(candle.open, candle.close));
          const bodyHeight = Math.max(bodyBottom - bodyTop, 0.5);

          return (
            <g key={index} className={isLast ? "transition-all duration-100 ease-out" : ""}>
              {/* Wick */}
              <line
                x1={`${x}%`}
                y1={`${getY(candle.high)}%`}
                x2={`${x}%`}
                y2={`${getY(candle.low)}%`}
                stroke={isCandleGreen ? "hsl(145 80% 45%)" : "hsl(0 72% 55%)"}
                strokeWidth="1"
                className={isLast ? "transition-all duration-100 ease-out" : ""}
              />
              {/* Body */}
              <rect
                x={`${x - candleWidth * 0.35}%`}
                y={`${bodyTop}%`}
                width={`${candleWidth * 0.7}%`}
                height={`${bodyHeight}%`}
                fill={isCandleGreen ? "hsl(145 80% 45%)" : "hsl(0 72% 55%)"}
                rx="1"
                filter={isLast && isBlinking ? "url(#glow)" : undefined}
                className={`${isLast ? "transition-all duration-100 ease-out" : ""} ${
                  isLast && isBlinking && isGreen ? "animate-pulse" : ""
                }`}
                style={
                  isLast && isBlinking
                    ? {
                        filter: `drop-shadow(0 0 6px ${
                          isGreen ? "hsl(145 80% 45%)" : "hsl(0 72% 55%)"
                        })`,
                      }
                    : undefined
                }
              />
            </g>
          );
        })}

        {/* Current price line */}
        <line
          x1="0"
          y1={`${getY(currentPrice)}%`}
          x2="100%"
          y2={`${getY(currentPrice)}%`}
          stroke="hsl(30 100% 50%)"
          strokeWidth="1"
          strokeDasharray="4"
          className="transition-all duration-100 ease-out"
        />
      </svg>

      {/* Current price label */}
      <div
        className={`absolute right-0 transform -translate-y-1/2 px-3 py-1 text-sm font-medium rounded-l transition-all duration-100 ease-out ${
          isBlinking && isGreen
            ? "bg-trading-green text-white shadow-lg shadow-trading-green/50"
            : isBlinking
            ? "bg-trading-red text-white shadow-lg shadow-trading-red/50"
            : "bg-trading-orange text-primary-foreground"
        }`}
        style={{ top: `${getY(currentPrice)}%` }}
      >
        {currentPrice.toFixed(5)}
      </div>

      {/* Time labels */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-card border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground">
        <span>27 Jan</span>
        <div className="px-2 py-1 bg-secondary rounded">
          {new Date().toISOString().slice(0, 19).replace("T", " ")}
        </div>
        <span>31 Jan</span>
        <span>February</span>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-8 left-0 right-0 h-10 bg-card border-t border-border flex items-center justify-between px-4">
        <span className="text-sm text-muted-foreground">Total portfolio</span>
        <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          Show positions
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TradingChart;
