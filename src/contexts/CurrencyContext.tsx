import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { preloadUsdRates } from "@/lib/exchangeRates";
import { setSignedMoneyFormatter } from "@/components/trading/tradeSettlementToast";
import { attachTradeResultCurrency } from "@/components/trading/TradeResultPresentation";
import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  SupportedCurrency,
  convertCurrencyToUsd,
  convertUsdToCurrency,
  formatUsdAmount,
  getCurrencyOption,
  getUsdRate,
  isSupportedCurrency,
} from "@/lib/currency";

interface CurrencyContextValue {
  currency: SupportedCurrency;
  currencyOption: ReturnType<typeof getCurrencyOption>;
  options: typeof CURRENCY_OPTIONS;
  isUpdating: boolean;
  setCurrency: (currency: SupportedCurrency) => Promise<void>;
  formatMoney: (valueUsd: number, options?: Omit<Intl.NumberFormatOptions, "style" | "currency">) => string;
  convertFromUsd: (valueUsd: number) => number;
  convertToUsd: (value: number) => number;
  rate: number;
  getRate: (currency: SupportedCurrency) => number;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const STORAGE_KEY = "preferred_currency";

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const { profile, updateProfile } = useAuth();
  const [currency, setCurrencyState] = useState<SupportedCurrency>(DEFAULT_CURRENCY);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    preloadUsdRates();
  }, []);

  useEffect(() => {
    setSignedMoneyFormatter((amount) => {
      const absolute = Math.abs(amount);
      return `${amount >= 0 ? "+" : "-"}${formatUsdAmount(absolute, currency)}`;
    });
    attachTradeResultCurrency(currency);
    return () => setSignedMoneyFormatter(null);
  }, [currency]);

  useEffect(() => {
    const profileCurrency = (profile as any)?.preferred_currency;
    const storedCurrency = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const nextCurrency = isSupportedCurrency(profileCurrency)
      ? profileCurrency
      : isSupportedCurrency(storedCurrency)
        ? storedCurrency
        : DEFAULT_CURRENCY;

    setCurrencyState(nextCurrency);
  }, [profile]);

  const setCurrency = async (nextCurrency: SupportedCurrency) => {
    setCurrencyState(nextCurrency);
    localStorage.setItem(STORAGE_KEY, nextCurrency);

    if (!profile?.id) {
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile({ preferred_currency: nextCurrency });
    } finally {
      setIsUpdating(false);
    }
  };

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      currencyOption: getCurrencyOption(currency),
      options: CURRENCY_OPTIONS,
      isUpdating,
      setCurrency,
      formatMoney: (valueUsd, options) => formatUsdAmount(valueUsd, currency, options),
      convertFromUsd: (valueUsd) => convertUsdToCurrency(valueUsd, currency),
      convertToUsd: (value) => convertCurrencyToUsd(value, currency),
      rate: getUsdRate(currency),
      getRate: (code) => getUsdRate(code),
    }),
    [currency, isUpdating],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

const DEFAULT_CONTEXT: CurrencyContextValue = {
  currency: DEFAULT_CURRENCY,
  currencyOption: getCurrencyOption(DEFAULT_CURRENCY),
  options: CURRENCY_OPTIONS,
  isUpdating: false,
  setCurrency: async () => undefined,
  formatMoney: (valueUsd, options) => formatUsdAmount(valueUsd, DEFAULT_CURRENCY, options),
  convertFromUsd: (valueUsd) => convertUsdToCurrency(valueUsd, DEFAULT_CURRENCY),
  convertToUsd: (value) => convertCurrencyToUsd(value, DEFAULT_CURRENCY),
  rate: getUsdRate(DEFAULT_CURRENCY),
  getRate: (code) => getUsdRate(code),
};

export const useCurrency = () => useContext(CurrencyContext) ?? DEFAULT_CONTEXT;