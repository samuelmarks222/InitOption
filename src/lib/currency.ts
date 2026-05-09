export type SupportedCurrency = "USD" | "KES" | "EUR" | "GBP" | "NGN" | "ZAR" | "AED" | "INR";

export interface CurrencyOption {
  code: SupportedCurrency;
  label: string;
  countryCode: string;
  locale: string;
  rateFromUsd: number;
}

export const DEFAULT_CURRENCY: SupportedCurrency = "USD";

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "USD", label: "US Dollar", countryCode: "US", locale: "en-US", rateFromUsd: 1 },
  { code: "KES", label: "Kenyan Shilling", countryCode: "KE", locale: "en-KE", rateFromUsd: 129.5 },
  { code: "EUR", label: "Euro", countryCode: "DE", locale: "de-DE", rateFromUsd: 0.92 },
  { code: "GBP", label: "British Pound", countryCode: "GB", locale: "en-GB", rateFromUsd: 0.79 },
  { code: "NGN", label: "Nigerian Naira", countryCode: "NG", locale: "en-NG", rateFromUsd: 1550 },
  { code: "ZAR", label: "South African Rand", countryCode: "ZA", locale: "en-ZA", rateFromUsd: 18.3 },
  { code: "AED", label: "UAE Dirham", countryCode: "AE", locale: "en-AE", rateFromUsd: 3.67 },
  { code: "INR", label: "Indian Rupee", countryCode: "IN", locale: "en-IN", rateFromUsd: 83.4 },
];

const CURRENCY_MAP = Object.fromEntries(CURRENCY_OPTIONS.map((option) => [option.code, option])) as Record<
  SupportedCurrency,
  CurrencyOption
>;

export const isSupportedCurrency = (value: unknown): value is SupportedCurrency =>
  typeof value === "string" && value in CURRENCY_MAP;

export const getCurrencyOption = (currency: unknown) =>
  isSupportedCurrency(currency) ? CURRENCY_MAP[currency] : CURRENCY_MAP[DEFAULT_CURRENCY];

export const convertUsdToCurrency = (value: number, currency: unknown) => {
  const option = getCurrencyOption(currency);
  return value * option.rateFromUsd;
};

export const convertCurrencyToUsd = (value: number, currency: unknown) => {
  const option = getCurrencyOption(currency);
  return option.rateFromUsd === 0 ? value : value / option.rateFromUsd;
};

export const formatUsdAmount = (
  value: number,
  currency: unknown,
  options?: Omit<Intl.NumberFormatOptions, "style" | "currency">,
) => {
  const option = getCurrencyOption(currency);
  return new Intl.NumberFormat(option.locale, {
    style: "currency",
    currency: option.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(convertUsdToCurrency(value, option.code));
};

export const formatCurrencyAmount = (
  value: number,
  currency: unknown,
  options?: Omit<Intl.NumberFormatOptions, "style" | "currency">,
) => {
  const option = getCurrencyOption(currency);
  return new Intl.NumberFormat(option.locale, {
    style: "currency",
    currency: option.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
};

export const getCurrencySymbol = (currency: unknown) => {
  const option = getCurrencyOption(currency);
  const formatted = new Intl.NumberFormat(option.locale, {
    style: "currency",
    currency: option.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).formatToParts(0);

  return formatted.find((part) => part.type === "currency")?.value ?? option.code;
};
