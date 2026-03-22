import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  SupportedCurrency,
  convertCurrencyToUsd,
  convertUsdToCurrency,
  formatUsdAmount,
  getCurrencyOption,
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
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const STORAGE_KEY = "preferred_currency";

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const { profile, updateProfile } = useAuth();
  const [currency, setCurrencyState] = useState<SupportedCurrency>(DEFAULT_CURRENCY);
  const [isUpdating, setIsUpdating] = useState(false);

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
    }),
    [currency, isUpdating],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
  return context;
};
