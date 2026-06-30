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
  setDirection: (direction: "higher" | "lower") => void;
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
  onExecuteTrade: (params: {
    assetSymbol: string;
    direction: "higher" | "lower";
    amount: number;
    entryPrice: number;
    expirySeconds: number;
    payoutRate: number;
  }) => Promise<boolean>;
  onExecuteDemoTrade: (params: {
    assetSymbol: string;
    direction: "higher" | "lower";
    amount: number;
    entryPrice: number;
    expirySeconds: number;
    payoutRate: number;
  }) => Promise<boolean>;
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
  const [accountType, setAccountType] = useState<"live" | "demo" | "tournament">(initialAccountType);
  const [balance, setBalance] = useState(initialBalance);
  const [demoBalance, setDemoBalance] = useState(initialDemoBalance);
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
      if (!currentAsset) return false;
      if (params.amount <= 0) return false;

      if (accountType === "demo") {
        if (params.amount > demoBalance) return false;
        return await onExecuteDemoTrade(params);
      }

      return await onExecuteTrade(params);
    },
    [currentAsset, accountType, demoBalance, onExecuteTrade, onExecuteDemoTrade]
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