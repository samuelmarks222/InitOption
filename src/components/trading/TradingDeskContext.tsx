import type { OpenTradeHandler } from "@/hooks/useTrading";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface TradingDeskContextValue {
  // Trading parameters
  expirySeconds: number;
  setExpirySeconds: (seconds: number) => void;
  investment: number;
  setInvestment: (amount: number) => void;
  // Trade execution
  executeTrade: (params: {
    assetSymbol: string;
    direction: "higher" | "lower";
    amount: number;
    entryPrice: number;
    expirySeconds: number;
    payoutRate: number;
  }) => Promise<boolean>;
  // Current asset
  currentAsset: { symbol: string; price: number; maxProfit?: number; payoutRate: number } | null;
  setCurrentAsset: (asset: { symbol: string; price: number; maxProfit?: number; payoutRate: number } | null) => void;
  // Account info
  accountType: "live" | "demo" | "tournament";
  balance: number;
  demoBalance: number;
  // Signal integration
  direction: "higher" | "lower" | null;
  setDirection: (direction: "higher" | "lower" | null) => void;
  isSignalMode: boolean;
  setSignalMode: (enabled: boolean) => void;
}

const TradingDeskContext = createContext<TradingDeskContextValue | null>(null);

export const useTradingDesk = () => {
  const context = useContext(TradingDeskContext);
  if (!context) {
    throw new Error("useTradingDesk must be used within a TradingDeskProvider");
  }
  return context;
};

interface TradingDeskProviderProps {
  children: ReactNode;
  // Initial values
  initialExpirySeconds?: number;
  initialInvestment?: number;
  initialAccountType?: "live" | "demo" | "tournament";
  initialBalance?: number;
  initialDemoBalance?: number;
  // Callbacks
  onExecuteTrade: OpenTradeHandler;
  onExecuteDemoTrade: OpenTradeHandler;
}

export const TradingDeskProvider = ({
  children,
  initialExpirySeconds = 60,
  initialInvestment = 1,
  initialAccountType = "demo",
  initialBalance = 0,
  initialDemoBalance = 10000,
  onExecuteTrade,
  onExecuteDemoTrade,
}: TradingDeskProviderProps) => {
  const [expirySeconds, setExpirySeconds] = useState(initialExpirySeconds);
  const [investment, setInvestment] = useState(initialInvestment);
  // The page owns account selection and balances. Do not freeze their first
  // render values: a later account switch must change the execution route.
  const accountType = initialAccountType;
  const balance = initialBalance;
  const demoBalance = initialDemoBalance;
  const [currentAsset, setCurrentAsset] = useState<TradingDeskContextValue["currentAsset"]>(null);
  const [direction, setDirection] = useState<"higher" | "lower" | null>(null);
  const [isSignalMode, setSignalMode] = useState(false);

  const executeTrade = useCallback(
    async (params: {
      assetSymbol: string;
      direction: "higher" | "lower";
      amount: number;
      entryPrice: number;
      expirySeconds: number;
      payoutRate: number;
    }) => {
      if (!params || typeof params.assetSymbol !== "string" || !params.assetSymbol.trim() ||
          !["higher", "lower"].includes(params.direction) ||
          !Number.isFinite(params.amount) || params.amount <= 0 ||
          !Number.isFinite(params.entryPrice) || params.entryPrice <= 0 ||
          !Number.isFinite(params.expirySeconds) || params.expirySeconds <= 0 ||
          !Number.isFinite(params.payoutRate) || params.payoutRate < 0 || params.payoutRate > 1) return false;
      if (accountType === "demo" && params.amount > demoBalance) return false;
      // Desk consumers use an object; dashboard order handlers are positional.
      // No selected-chart guard: signals can correctly request another symbol.
      const handler = accountType === "demo" ? onExecuteDemoTrade : onExecuteTrade;
      return await handler(params.assetSymbol, params.direction, params.amount,
        params.entryPrice, params.expirySeconds, params.payoutRate);
    },
    [accountType, demoBalance, onExecuteTrade, onExecuteDemoTrade]
  );

  const value: TradingDeskContextValue = {
    expirySeconds,
    setExpirySeconds,
    investment,
    setInvestment,
    executeTrade,
    currentAsset,
    setCurrentAsset,
    accountType,
    balance,
    demoBalance,
    direction,
    setDirection,
    isSignalMode,
    setSignalMode,
  };

  return (
    <TradingDeskContext.Provider value={value}>
      {children}
    </TradingDeskContext.Provider>
  );
};