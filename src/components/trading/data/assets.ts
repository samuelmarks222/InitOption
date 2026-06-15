// All currency pairs and assets
export interface Asset {
  symbol: string;
  type: "OTC" | "Forex" | "Crypto" | "Stocks" | "Stock" | "Commodities";
  name: string;
  basePrice: number;
  icon: string;
  flags: string[]; // Emojis like ['🇺🇸', '🇪🇺'] or single icon for crypto/stocks
  maxProfit?: number; // Represented as a percentage, e.g., 85
  change5min?: string; // e.g., "+0.01%" or "-0.06%"
  category?: "Trending" | "Options" | "Margin" | "Watchlist" | "Stocks"; // Maps to the left sidebar
  isTradersChoice?: boolean;
}

export const allAssets: Asset[] = []; // Intentionally left empty. Backend handles all assets now.

export const assetTypes = ["OTC", "Forex", "Crypto", "Stocks", "Commodities"] as const;

// ... keeping existing timeframes/indicators below ...

// Chart timeframes from 1 minute to 3 days
export const chartTimeframes = [
  { label: "1m", value: 60, unit: "seconds" },
  { label: "5m", value: 300, unit: "seconds" },
  { label: "10m", value: 600, unit: "seconds" },
  { label: "15m", value: 900, unit: "seconds" },
  { label: "30m", value: 1800, unit: "seconds" },
  { label: "1h", value: 3600, unit: "seconds" },
  { label: "2h", value: 7200, unit: "seconds" },
  { label: "3h", value: 10800, unit: "seconds" },
  { label: "4h", value: 14400, unit: "seconds" },
  { label: "12h", value: 43200, unit: "seconds" },
  { label: "1D", value: 86400, unit: "seconds" },
];

// Expiry times from 1 minute to 1 day
export const expiryTimes = [
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "3m", value: 180 },
  { label: "5m", value: 300 },
  { label: "10m", value: 600 },
  { label: "15m", value: 900 },
  { label: "30m", value: 1800 },
  { label: "1h", value: 3600 },
  { label: "2h", value: 7200 },
  { label: "4h", value: 14400 },
  { label: "8h", value: 28800 },
  { label: "12h", value: 43200 },
  { label: "1d", value: 86400 },
];

// Indicators list
export const indicators = [
  { id: "sma", name: "SMA", fullName: "Simple Moving Average", category: "Trend" },
  { id: "ema", name: "EMA", fullName: "Exponential Moving Average", category: "Trend" },
  { id: "wma", name: "WMA", fullName: "Weighted Moving Average", category: "Trend" },
  { id: "bb", name: "BB", fullName: "Bollinger Bands", category: "Volatility" },
  { id: "rsi", name: "RSI", fullName: "Relative Strength Index", category: "Momentum" },
  { id: "macd", name: "MACD", fullName: "Moving Average Convergence Divergence", category: "Momentum" },
  { id: "stoch", name: "Stochastic", fullName: "Stochastic Oscillator", category: "Momentum" },
  { id: "atr", name: "ATR", fullName: "Average True Range", category: "Volatility" },
  { id: "adx", name: "ADX", fullName: "Average Directional Index", category: "Trend" },
  { id: "cci", name: "CCI", fullName: "Commodity Channel Index", category: "Momentum" },
  { id: "wpr", name: "Williams %R", fullName: "Williams Percent Range", category: "Momentum" },
  { id: "ao", name: "AO", fullName: "Awesome Oscillator", category: "Momentum" },
  { id: "alligator", name: "Alligator", fullName: "Williams Alligator", category: "Trend" },
  { id: "fractal", name: "Fractal", fullName: "Williams Fractal", category: "Pattern" },
  { id: "ichimoku", name: "Ichimoku", fullName: "Ichimoku Cloud", category: "Trend" },
  { id: "parabolic", name: "Parabolic SAR", fullName: "Parabolic Stop and Reverse", category: "Trend" },
  { id: "pivot", name: "Pivot Points", fullName: "Pivot Points", category: "Support/Resistance" },
  { id: "volume", name: "Volume", fullName: "Volume", category: "Volume" },
  { id: "obv", name: "OBV", fullName: "On Balance Volume", category: "Volume" },
  { id: "mfi", name: "MFI", fullName: "Money Flow Index", category: "Volume" },
];

// Drawing tools list
export const drawingTools = [
  { id: "line", name: "Line", icon: "line" },
  { id: "horizontal", name: "Horizontal Line", icon: "horizontal" },
  { id: "vertical", name: "Vertical Line", icon: "vertical" },
  { id: "ray", name: "Ray", icon: "ray" },
  { id: "trend", name: "Trend Line", icon: "trend" },
  { id: "channel", name: "Channel", icon: "channel" },
  { id: "fib", name: "Fibonacci Retracement", icon: "fib" },
  { id: "fibext", name: "Fibonacci Extension", icon: "fibext" },
  { id: "gann", name: "Gann Fan", icon: "gann" },
  { id: "rectangle", name: "Rectangle", icon: "rectangle" },
  { id: "ellipse", name: "Ellipse", icon: "ellipse" },
  { id: "triangle", name: "Triangle", icon: "triangle" },
  { id: "arrow", name: "Arrow", icon: "arrow" },
  { id: "text", name: "Text", icon: "text" },
  { id: "brush", name: "Brush", icon: "brush" },
  { id: "eraser", name: "Eraser", icon: "eraser" },
];
