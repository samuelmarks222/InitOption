import { useEffect, useState, useRef } from "react";
import { Pencil, Waves, Clock } from "lucide-react";

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
  const [timeframe, setTimeframe] = useState("12h");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCandles((prev) => {
        const lastCandle = prev[prev.length - 1];
        const volatility = 0.0005;
        const change = (Math.random() - 0.5) * 2 * volatility;
        const newClose = lastCandle.close * (1 + change);
        
        setCurrentPrice(newClose);
        
        // Update last candle
        const updatedCandles = [...prev];
        updatedCandles[updatedCandles.length - 1] = {
          ...lastCandle,
          close: newClose,
          high: Math.max(lastCandle.high, newClose),
          low: Math.min(lastCandle.low, newClose),
        };
        
        return updatedCandles;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minPrice = Math.min(...candles.map((c) => c.low));
  const maxPrice = Math.max(...candles.map((c) => c.high));
  const priceRange = maxPrice - minPrice;
  
  const getY = (price: number) => {
    return ((maxPrice - price) / priceRange) * 100;
  };

  const candleWidth = 100 / candles.length;

  return (
    <div className="flex-1 bg-chart-bg relative" ref={containerRef}>
      {/* Chart tools */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
        <button className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Clock className="w-4 h-4" />
        </button>
        <div className="px-2 py-1 rounded bg-secondary text-xs text-muted-foreground">
          {timeframe}
        </div>
        <button className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Waves className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {/* Chart OHLC info */}
      <div className="absolute left-16 top-4 z-10 flex gap-4 text-xs text-muted-foreground">
        <span>Open <span className="text-foreground">{candles[candles.length - 1]?.open.toFixed(6)}</span></span>
        <span>High <span className="text-foreground">{candles[candles.length - 1]?.high.toFixed(6)}</span></span>
        <span>Low <span className="text-foreground">{candles[candles.length - 1]?.low.toFixed(6)}</span></span>
        <span>Close <span className="text-foreground">{candles[candles.length - 1]?.close.toFixed(6)}</span></span>
      </div>

      {/* SVG Chart */}
      <svg className="w-full h-full" preserveAspectRatio="none">
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

        {/* Candles */}
        {candles.map((candle, index) => {
          const isGreen = candle.close >= candle.open;
          const x = index * candleWidth + candleWidth / 2;
          const bodyTop = getY(Math.max(candle.open, candle.close));
          const bodyBottom = getY(Math.min(candle.open, candle.close));
          const bodyHeight = Math.max(bodyBottom - bodyTop, 0.5);
          
          return (
            <g key={index}>
              {/* Wick */}
              <line
                x1={`${x}%`}
                y1={`${getY(candle.high)}%`}
                x2={`${x}%`}
                y2={`${getY(candle.low)}%`}
                stroke={isGreen ? "hsl(145 80% 45%)" : "hsl(0 72% 55%)"}
                strokeWidth="1"
              />
              {/* Body */}
              <rect
                x={`${x - candleWidth * 0.35}%`}
                y={`${bodyTop}%`}
                width={`${candleWidth * 0.7}%`}
                height={`${bodyHeight}%`}
                fill={isGreen ? "hsl(145 80% 45%)" : "hsl(0 72% 55%)"}
                rx="1"
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
        />
      </svg>

      {/* Current price label */}
      <div
        className="absolute right-0 transform -translate-y-1/2 px-3 py-1 bg-trading-orange text-primary-foreground text-sm font-medium rounded-l"
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
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TradingChart;
