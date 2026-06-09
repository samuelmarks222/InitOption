import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const PAIRS = [
  { name: "EUR/USD", payout: "87%" },
  { name: "GBP/JPY", payout: "85%" },
  { name: "USD/NOK", payout: "92%" },
  { name: "CAD/JPY", payout: "83%" },
  { name: "EUR/GBP", payout: "89%" },
];

const AMOUNTS = [5, 10, 25, 50, 100];

type TradeDirection = "up" | "down";
type TradeResult = "win" | "loss";

interface Trade {
  id: number;
  amount: number;
  direction: TradeDirection;
  pair: string;
  price: string;
  result?: TradeResult;
}

interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
}

const generateOHLCData = (count: number, basePrice: number): OHLC[] => {
  const data: OHLC[] = [];
  let prevClose = basePrice;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * 0.0012;
    const open = prevClose;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 0.0004;
    const low = Math.min(open, close) - Math.random() * 0.0004;
    data.push({ open, high, low, close });
    prevClose = close;
  }
  return data;
};

const AnimatedTradingChart = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();
  const [prices, setPrices] = useState(() => generateOHLCData(80, 1.258));
  const pricesRef = useRef<OHLC[]>(prices);
  pricesRef.current = prices;

  const [currentPrice, setCurrentPrice] = useState(1.258);
  const currentPriceRef = useRef(currentPrice);
  currentPriceRef.current = currentPrice;

  const [activePairIndex, setActivePairIndex] = useState(0);
  const [investment, setInvestment] = useState(10);
  const [balance, setBalance] = useState(847.5);
  const [totalProfit, setTotalProfit] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeButton, setActiveButton] = useState<TradeDirection | null>(null);
  const [winStreak, setWinStreak] = useState(0);
  const [showStreakBadge, setShowStreakBadge] = useState(false);
  const [showTradeResult, setShowTradeResult] = useState<Trade | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const data = pricesRef.current;

      context.clearRect(0, 0, width, height);

      context.strokeStyle = "rgba(255, 255, 255, 0.08)";
      context.lineWidth = 0.75;
      for (let row = 0; row < 6; row += 1) {
        const y = (height / 6) * row;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      for (let column = 0; column < 10; column += 1) {
        const x = (width / 10) * column;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }

      let min = Infinity;
      let max = -Infinity;
      data.forEach((d) => {
        if (d.high > max) max = d.high;
        if (d.low < min) min = d.low;
      });
      min -= 0.0005;
      max += 0.0005;
      const range = Math.max(max - min, 0.0001);
      const chartWidth = Math.max(width - 62, 40);

      const toX = (index: number) => (index / (data.length - 1)) * chartWidth;
      const toY = (value: number) => height - ((value - min) / range) * height;

      const spacing = chartWidth / (data.length - 1);
      const bodyWidth = Math.max(2, Math.min(spacing * 0.55, 12));

      data.forEach((candle, index) => {
        const x = toX(index);
        const isUp = candle.close >= candle.open;
        const color = isUp ? "#1c81f8" : "#e85b4e";

        context.strokeStyle = color;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x, toY(candle.high));
        context.lineTo(x, toY(candle.low));
        context.stroke();

        const openY = toY(candle.open);
        const closeY = toY(candle.close);
        const bodyTop = Math.min(openY, closeY);
        const bodyH = Math.max(1, Math.abs(closeY - openY));
        context.fillStyle = color;
        context.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyH);
      });

      const lastCandle = data[data.length - 1];
      const lastX = toX(data.length - 1);
      const lastY = toY(lastCandle.close);

      context.setLineDash([4, 4]);
      context.strokeStyle = "rgba(255, 255, 255, 0.12)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, lastY);
      context.lineTo(width, lastY);
      context.stroke();
      context.setLineDash([]);

      const badgeWidth = width < 380 ? 60 : 74;
      const badgeX = Math.min(lastX + 6, width - badgeWidth - 4);
      context.beginPath();
      context.roundRect(badgeX, lastY - 11, badgeWidth, 22, 6);
      context.fillStyle = "#1c81f8";
      context.fill();
      context.fillStyle = "#ffffff";
      context.font = width < 380 ? "700 9px Sora, sans-serif" : "700 11px Sora, sans-serif";
      context.textAlign = "center";
      context.fillText(lastCandle.close.toFixed(5), badgeX + badgeWidth / 2, lastY + 4);

      frameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPrices((previous) => {
        const last = previous[previous.length - 1];
        const change = (Math.random() - 0.48) * 0.001;
        const open = last.close;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * 0.0003;
        const low = Math.min(open, close) - Math.random() * 0.0003;
        setCurrentPrice(close);
        return [...previous.slice(1), { open, high, low, close }];
      });
    }, 350);

    return () => window.clearInterval(interval);
  }, []);

  const placeTrade = useCallback(() => {
    const direction: TradeDirection = Math.random() > 0.4 ? "up" : "down";
    const amount = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
    const pairIndex = Math.floor(Math.random() * PAIRS.length);
    const pair = PAIRS[pairIndex];

    setActivePairIndex(pairIndex);
    setInvestment(amount);
    setActiveButton(direction);

    const trade: Trade = {
      id: Date.now(),
      amount,
      direction,
      pair: pair.name,
      price: currentPriceRef.current.toFixed(5),
    };

    window.setTimeout(() => setActiveButton(null), 400);
    setTrades((previous) => [trade, ...previous].slice(0, 8));
    setTradeCount((count) => count + 1);
    setBalance((value) => value - amount);

    const resolveTime = 1500 + Math.random() * 1500;
    window.setTimeout(() => {
      const win = Math.random() > 0.2;
      const payoutRate = parseFloat(pair.payout) / 100;
      const winAmount = amount * payoutRate;
      const result: TradeResult = win ? "win" : "loss";

      setTrades((previous) =>
        previous.map((item) => (item.id === trade.id ? { ...item, result } : item)),
      );

      if (win) {
        setBalance((value) => value + amount + winAmount);
        setTotalProfit((value) => value + winAmount);
        setWinStreak((value) => {
          const next = value + 1;
          if (next >= 3) {
            setShowStreakBadge(true);
            window.setTimeout(() => setShowStreakBadge(false), 1800);
          }
          return next;
        });
      } else {
        setWinStreak(0);
      }

      setShowTradeResult({ ...trade, result });
      window.setTimeout(() => setShowTradeResult(null), 1800);
    }, resolveTime);
  }, []);

  useEffect(() => {
    const firstTimeout = window.setTimeout(placeTrade, 1500);
    const interval = window.setInterval(placeTrade, 3000 + Math.random() * 1500);

    return () => {
      window.clearTimeout(firstTimeout);
      window.clearInterval(interval);
    };
  }, [placeTrade]);

  const activePair = PAIRS[activePairIndex];
  const payout = (investment * (parseFloat(activePair.payout) / 100) + investment).toFixed(2);

  return (
    <div className="w-full overflow-hidden rounded-[22px] border border-white/10 bg-white/5 shadow-none sm:rounded-[28px]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-2.5 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-hide sm:gap-2">
          {PAIRS.map((pair, index) => (
            <motion.button
              key={pair.name}
              animate={index === activePairIndex ? { scale: [1, 1.04, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[9px] font-medium transition-colors sm:text-xs ${
                index === activePairIndex
                  ? "border-[#1c81f8]/30 bg-[#1c81f8]/10 text-[#1c81f8]"
                  : "border-transparent text-white/60 hover:text-white"
              }`}
              type="button"
            >
              <span>{pair.name}</span>
              <span className="text-[#1c81f8]">{pair.payout}</span>
            </motion.button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 rounded-md border border-[#1c81f8]/18 bg-[#1c81f8]/10 px-2.5 py-1 sm:flex">
            <span className="text-[10px] text-white/60">Balance:</span>
            <motion.span
              key={balance.toFixed(2)}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-mono text-xs font-bold text-[#1c81f8]"
            >
              ${balance.toFixed(2)}
            </motion.span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-white/60 sm:gap-2 sm:text-[10px]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1c81f8]" />
            LIVE
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="relative flex-1 min-h-[198px] sm:min-h-[320px]">
          <canvas ref={canvasRef} className="h-[198px] w-full sm:h-[320px]" style={{ display: "block" }} />

          <div className="absolute left-2 top-2 rounded-full border border-[#1c81f8]/20 bg-white/10 px-2 py-1 text-[9px] font-semibold text-[#1c81f8] backdrop-blur min-[430px]:hidden">
            52% higher
          </div>

          <div className="absolute left-3 top-1/4 hidden flex-col items-center gap-0.5 min-[430px]:flex">
            <div className="text-[10px] font-bold text-[#1c81f8]">HIGHER</div>
            <div className="text-[9px] text-white/60">52%</div>
            <div className="my-1 flex flex-col gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <motion.div
                  key={`up-${index}`}
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 1.5, delay: index * 0.15, repeat: Infinity }}
                  className="h-2 w-3 rotate-45 bg-[#1c81f8]/80"
                />
              ))}
            </div>
            <div className="my-1 flex flex-col gap-0.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <motion.div
                  key={`down-${index}`}
                  animate={{ opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 1.5, delay: index * 0.15, repeat: Infinity }}
                  className="h-2 w-3 rotate-45 bg-white/20"
                />
              ))}
            </div>
            <div className="text-[9px] text-white/60">48%</div>
            <div className="text-[10px] font-bold text-white/60">LOWER</div>
          </div>

          <AnimatePresence>
            {showStreakBadge && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: -20 }}
                className="absolute left-1/2 top-3 flex max-w-[78vw] -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#1c81f8] px-3 py-1.5 text-[10px] font-bold text-white shadow-[0_18px_36px_rgba(28,129,248,0.24)] sm:top-4 sm:max-w-none sm:gap-2 sm:px-4 sm:text-sm"
              >
                WIN STREAK {winStreak}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showTradeResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -30 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute left-1/2 top-1/2 z-10 w-[82vw] max-w-[280px] -translate-x-1/2 -translate-y-1/2 sm:w-auto sm:max-w-none"
              >
                <div
                  className={`flex flex-col items-center gap-1 rounded-xl px-4 py-3 text-sm font-bold shadow-2xl sm:px-8 sm:py-4 sm:text-xl ${
                    showTradeResult.result === "win"
                      ? "bg-[#1c81f8] text-white shadow-[0_20px_40px_rgba(28,129,248,0.24)]"
                      : "border border-white/15 bg-[#0f487c] text-white shadow-none"
                  }`}
                >
                  <span>{showTradeResult.result === "win" ? "TRADE WON" : "TRADE LOST"}</span>
                  <span>
                    {showTradeResult.result === "win"
                      ? `+$${(showTradeResult.amount * 0.87).toFixed(2)}`
                      : `-$${showTradeResult.amount.toFixed(2)}`}
                  </span>
                  <span className="text-[10px] font-normal opacity-85">
                    {showTradeResult.pair} | {showTradeResult.direction.toUpperCase()}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0f487c]/90 px-2 py-1 backdrop-blur sm:bottom-3 sm:right-20 sm:px-2.5">
            <span className="text-[9px] text-white/60">Profit:</span>
            <motion.span
              key={totalProfit.toFixed(2)}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="font-mono text-[11px] font-bold text-[#1c81f8]"
            >
              +${totalProfit.toFixed(2)}
            </motion.span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5 border-t border-white/10 bg-white/5 p-2.5 sm:gap-3 sm:p-4 lg:w-[220px] lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-xs font-bold text-white sm:text-sm">{activePair.name}</span>
              <span className="text-[10px] font-semibold text-[#1c81f8] sm:text-xs">{activePair.payout}</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-[#1c81f8]/18 bg-[#1c81f8]/10 px-2.5 py-1.5 sm:hidden">
            <span className="text-[10px] text-white/60">Balance</span>
            <motion.span
              key={balance.toFixed(2)}
              initial={{ y: -5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-mono text-xs font-bold text-[#1c81f8]"
            >
              ${balance.toFixed(2)}
            </motion.span>
          </div>

          <div className="grid gap-2 min-[390px]:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-1.5">
              <div className="text-[10px] text-white/60">Time</div>
              <div className="flex items-center justify-between rounded-lg border border-white/12 bg-white/8 px-3 py-1.5">
                <span className="text-[10px] text-white/60">-</span>
                <span className="font-mono text-xs font-bold text-white sm:text-sm">00:01:00</span>
                <span className="text-[10px] text-white/60">+</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] font-medium text-[#1c81f8]">SWITCH TIME</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/60">Investment</span>
                <span className="text-[9px] font-medium text-[#1c81f8]">SWITCH</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/12 bg-white/8 px-3 py-1.5">
                <span className="text-[10px] text-white/60">-</span>
                <motion.span
                  key={investment}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="font-mono text-xs font-bold text-white sm:text-sm"
                >
                  {investment} $
                </motion.span>
                <span className="text-[10px] text-white/60">+</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/60">Your payout:</span>
            <span className="font-bold text-white">{payout} $</span>
          </div>

          <div className="flex flex-col gap-2">
            <motion.div
              animate={
                activeButton === "up"
                  ? {
                      scale: [1, 0.92, 1],
                      boxShadow: [
                        "0 0 0px rgba(28,129,248,0)",
                        "0 0 20px rgba(28,129,248,0.4)",
                        "0 0 0px rgba(28,129,248,0)",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 0.4 }}
              className="flex cursor-pointer items-center justify-between rounded-lg bg-[#1c81f8] px-4 py-2 text-sm font-bold text-white sm:py-2.5"
            >
              Up <span>&uarr;</span>
            </motion.div>
            <motion.div
              animate={
                activeButton === "down"
                  ? {
                      scale: [1, 0.92, 1],
                      boxShadow: [
                        "0 0 0px rgba(0,0,0,0)",
                        "0 0 20px rgba(0,0,0,0.08)",
                        "0 0 0px rgba(0,0,0,0)",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 0.4 }}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-white/16 bg-white/8 px-4 py-2 text-sm font-bold text-white sm:py-2.5"
            >
              Down <span>&darr;</span>
            </motion.div>
          </div>

          <div className="mt-1 flex-1">
            <div className="mb-2 flex items-center gap-3 text-[10px] text-[#536471]">
              <span className="border-b-2 border-[#1c81f8] pb-0.5 font-medium text-white">Trades {tradeCount}</span>
              <span className="text-white/60">History</span>
            </div>
            <div className="max-h-[104px] space-y-1 overflow-hidden sm:max-h-[120px]">
              <AnimatePresence mode="popLayout">
                {trades.slice(0, 5).map((trade, index) => (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, x: 30, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: "auto" }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={`${index > 2 ? "hidden sm:flex" : "flex"} items-center justify-between rounded-md px-2 py-1.5 text-[9px] sm:text-[10px] ${
                      trade.result === "win"
                        ? "border border-[#1c81f8]/20 bg-[#1c81f8]/10 text-[#1c81f8]"
                        : trade.result === "loss"
                        ? "border border-white/10 bg-white/5 text-white"
                        : "border border-white/10 bg-white/5 text-white/60"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <span className={trade.direction === "up" ? "text-[#1c81f8]" : "text-[#536471]"}>
                        {trade.direction === "up" ? "\u25B2" : "\u25BC"}
                      </span>
                      <span className="font-medium">{trade.pair}</span>
                      <span className="opacity-60">${trade.amount}</span>
                    </span>
                    <span className="font-bold">
                      {trade.result === "win"
                        ? `+$${(trade.amount * 0.87).toFixed(2)}`
                        : trade.result === "loss"
                        ? `-$${trade.amount.toFixed(2)}`
                        : "\u23F3"}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedTradingChart;
