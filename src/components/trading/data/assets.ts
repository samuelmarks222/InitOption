// All currency pairs and assets
export interface Asset {
  symbol: string;
  type: "OTC" | "Forex" | "Crypto" | "Stocks" | "Commodities";
  name: string;
  basePrice: number;
  icon: string;
}

export const allAssets: Asset[] = [
  // OTC Assets
  { symbol: "EUR/USD", type: "OTC", name: "Blitz", basePrice: 1.24183, icon: "€" },
  { symbol: "GBP/USD", type: "OTC", name: "Blitz", basePrice: 1.31245, icon: "£" },
  { symbol: "USD/JPY", type: "OTC", name: "Blitz", basePrice: 149.32, icon: "¥" },
  { symbol: "AUD/USD", type: "OTC", name: "Blitz", basePrice: 0.65432, icon: "A$" },
  { symbol: "USD/CAD", type: "OTC", name: "Blitz", basePrice: 1.35678, icon: "C$" },
  { symbol: "EUR/GBP", type: "OTC", name: "Blitz", basePrice: 0.85432, icon: "€" },
  { symbol: "USD/CHF", type: "OTC", name: "Blitz", basePrice: 0.89234, icon: "Fr" },
  { symbol: "NZD/USD", type: "OTC", name: "Blitz", basePrice: 0.61234, icon: "NZ$" },

  // Forex Major Pairs
  { symbol: "EUR/USD", type: "Forex", name: "Euro/Dollar", basePrice: 1.08542, icon: "€" },
  { symbol: "GBP/USD", type: "Forex", name: "Pound/Dollar", basePrice: 1.26783, icon: "£" },
  { symbol: "USD/JPY", type: "Forex", name: "Dollar/Yen", basePrice: 151.234, icon: "¥" },
  { symbol: "AUD/USD", type: "Forex", name: "Aussie/Dollar", basePrice: 0.64892, icon: "A$" },
  { symbol: "USD/CAD", type: "Forex", name: "Dollar/CAD", basePrice: 1.37234, icon: "C$" },
  { symbol: "EUR/JPY", type: "Forex", name: "Euro/Yen", basePrice: 164.123, icon: "€" },
  { symbol: "GBP/JPY", type: "Forex", name: "Pound/Yen", basePrice: 191.456, icon: "£" },
  { symbol: "EUR/GBP", type: "Forex", name: "Euro/Pound", basePrice: 0.85678, icon: "€" },
  { symbol: "EUR/CHF", type: "Forex", name: "Euro/Franc", basePrice: 0.96234, icon: "€" },
  { symbol: "USD/CHF", type: "Forex", name: "Dollar/Franc", basePrice: 0.88765, icon: "$" },
  { symbol: "NZD/USD", type: "Forex", name: "Kiwi/Dollar", basePrice: 0.59876, icon: "NZ$" },
  { symbol: "EUR/AUD", type: "Forex", name: "Euro/Aussie", basePrice: 1.67234, icon: "€" },
  { symbol: "GBP/AUD", type: "Forex", name: "Pound/Aussie", basePrice: 1.95432, icon: "£" },
  { symbol: "EUR/CAD", type: "Forex", name: "Euro/CAD", basePrice: 1.48765, icon: "€" },
  { symbol: "GBP/CAD", type: "Forex", name: "Pound/CAD", basePrice: 1.73456, icon: "£" },
  { symbol: "AUD/CAD", type: "Forex", name: "Aussie/CAD", basePrice: 0.89123, icon: "A$" },
  { symbol: "AUD/JPY", type: "Forex", name: "Aussie/Yen", basePrice: 98.234, icon: "A$" },
  { symbol: "CHF/JPY", type: "Forex", name: "Franc/Yen", basePrice: 170.345, icon: "Fr" },
  { symbol: "NZD/JPY", type: "Forex", name: "Kiwi/Yen", basePrice: 90.567, icon: "NZ$" },
  { symbol: "AUD/NZD", type: "Forex", name: "Aussie/Kiwi", basePrice: 1.08432, icon: "A$" },

  // Crypto
  { symbol: "BTC/USD", type: "Crypto", name: "Bitcoin", basePrice: 43567.89, icon: "₿" },
  { symbol: "ETH/USD", type: "Crypto", name: "Ethereum", basePrice: 2345.67, icon: "Ξ" },
  { symbol: "XRP/USD", type: "Crypto", name: "Ripple", basePrice: 0.5234, icon: "X" },
  { symbol: "LTC/USD", type: "Crypto", name: "Litecoin", basePrice: 72.34, icon: "Ł" },
  { symbol: "BCH/USD", type: "Crypto", name: "Bitcoin Cash", basePrice: 234.56, icon: "Ƀ" },
  { symbol: "ADA/USD", type: "Crypto", name: "Cardano", basePrice: 0.4567, icon: "₳" },
  { symbol: "DOT/USD", type: "Crypto", name: "Polkadot", basePrice: 7.234, icon: "●" },
  { symbol: "SOL/USD", type: "Crypto", name: "Solana", basePrice: 98.76, icon: "◎" },
  { symbol: "DOGE/USD", type: "Crypto", name: "Dogecoin", basePrice: 0.0823, icon: "Ð" },
  { symbol: "MATIC/USD", type: "Crypto", name: "Polygon", basePrice: 0.9876, icon: "M" },

  // Stocks
  { symbol: "AAPL", type: "Stocks", name: "Apple Inc.", basePrice: 178.45, icon: "" },
  { symbol: "GOOGL", type: "Stocks", name: "Alphabet Inc.", basePrice: 141.23, icon: "G" },
  { symbol: "MSFT", type: "Stocks", name: "Microsoft", basePrice: 378.91, icon: "M" },
  { symbol: "AMZN", type: "Stocks", name: "Amazon", basePrice: 178.12, icon: "A" },
  { symbol: "TSLA", type: "Stocks", name: "Tesla", basePrice: 234.56, icon: "T" },
  { symbol: "META", type: "Stocks", name: "Meta", basePrice: 367.89, icon: "M" },
  { symbol: "NVDA", type: "Stocks", name: "NVIDIA", basePrice: 543.21, icon: "N" },
  { symbol: "NFLX", type: "Stocks", name: "Netflix", basePrice: 478.90, icon: "N" },
  { symbol: "DIS", type: "Stocks", name: "Disney", basePrice: 91.23, icon: "D" },
  { symbol: "PYPL", type: "Stocks", name: "PayPal", basePrice: 62.45, icon: "P" },

  // Commodities
  { symbol: "XAU/USD", type: "Commodities", name: "Gold", basePrice: 2034.56, icon: "Au" },
  { symbol: "XAG/USD", type: "Commodities", name: "Silver", basePrice: 23.456, icon: "Ag" },
  { symbol: "OIL/USD", type: "Commodities", name: "Crude Oil", basePrice: 78.34, icon: "🛢" },
  { symbol: "GAS/USD", type: "Commodities", name: "Natural Gas", basePrice: 2.345, icon: "⛽" },
  { symbol: "XPT/USD", type: "Commodities", name: "Platinum", basePrice: 912.34, icon: "Pt" },
  { symbol: "XPD/USD", type: "Commodities", name: "Palladium", basePrice: 1023.45, icon: "Pd" },
  { symbol: "COPPER", type: "Commodities", name: "Copper", basePrice: 3.789, icon: "Cu" },
  { symbol: "WHEAT", type: "Commodities", name: "Wheat", basePrice: 567.89, icon: "🌾" },
];

export const assetTypes = ["OTC", "Forex", "Crypto", "Stocks", "Commodities"] as const;

// Chart timeframes from 5 seconds to 3 days
export const chartTimeframes = [
  { label: "5s", value: 5, unit: "seconds" },
  { label: "10s", value: 10, unit: "seconds" },
  { label: "15s", value: 15, unit: "seconds" },
  { label: "30s", value: 30, unit: "seconds" },
  { label: "1m", value: 60, unit: "seconds" },
  { label: "5m", value: 300, unit: "seconds" },
  { label: "15m", value: 900, unit: "seconds" },
  { label: "30m", value: 1800, unit: "seconds" },
  { label: "1h", value: 3600, unit: "seconds" },
  { label: "4h", value: 14400, unit: "seconds" },
  { label: "12h", value: 43200, unit: "seconds" },
  { label: "1d", value: 86400, unit: "seconds" },
  { label: "3d", value: 259200, unit: "seconds" },
];

// Expiry times from 5 seconds to 1 day
export const expiryTimes = [
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
  { label: "15s", value: 15 },
  { label: "30s", value: 30 },
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
