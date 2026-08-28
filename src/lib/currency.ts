export type SupportedCurrency =
  | "USD"
  | "KES"
  | "EUR"
  | "GBP"
  | "NGN"
  | "ZAR"
  | "AED"
  | "INR"
  | "BRL"
  | "IDR"
  | "MYR"
  | "JPY"
  | "AUD"
  | "CAD"
  | "CHF"
  | "CNY";

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
  { code: "BRL", label: "Brazilian Real", countryCode: "BR", locale: "pt-BR", rateFromUsd: 5.4 },
  { code: "IDR", label: "Indonesian Rupiah", countryCode: "ID", locale: "id-ID", rateFromUsd: 16340 },
  { code: "MYR", label: "Malaysian Ringgit", countryCode: "MY", locale: "ms-MY", rateFromUsd: 4.7 },
  { code: "JPY", label: "Japanese Yen", countryCode: "JP", locale: "ja-JP", rateFromUsd: 157.5 },
  { code: "AUD", label: "Australian Dollar", countryCode: "AU", locale: "en-AU", rateFromUsd: 1.52 },
  { code: "CAD", label: "Canadian Dollar", countryCode: "CA", locale: "en-CA", rateFromUsd: 1.36 },
  { code: "CHF", label: "Swiss Franc", countryCode: "CH", locale: "de-CH", rateFromUsd: 0.9 },
  { code: "CNY", label: "Chinese Yuan", countryCode: "CN", locale: "zh-CN", rateFromUsd: 7.24 },
];

const CURRENCY_MAP = Object.fromEntries(CURRENCY_OPTIONS.map((option) => [option.code, option])) as Record<
  SupportedCurrency,
  CurrencyOption
>;

export const isSupportedCurrency = (value: unknown): value is SupportedCurrency =>
  typeof value === "string" && value in CURRENCY_MAP;

export const getCurrencyOption = (currency: unknown) =>
  isSupportedCurrency(currency) ? CURRENCY_MAP[currency] : CURRENCY_MAP[DEFAULT_CURRENCY];

/* ------------------------------------------------------------------ */
/* Live USD exchange-rate cache (populated by src/lib/exchangeRates.ts) */
/* ------------------------------------------------------------------ */
let liveUsdRates: Partial<Record<SupportedCurrency, number>> | null = null;

export const hasLiveRates = () => liveUsdRates !== null;

export const applyLiveUsdRates = (rates: Partial<Record<SupportedCurrency, number>>) => {
  liveUsdRates = rates;
};

export const getUsdRate = (currency: unknown) => {
  const option = getCurrencyOption(currency);
  const live = liveUsdRates?.[option.code];
  return live && live > 0 ? live : option.rateFromUsd;
};

export const convertUsdToCurrency = (value: number, currency: unknown) => value * getUsdRate(currency);

export const convertCurrencyToUsd = (value: number, currency: unknown) => {
  const rate = getUsdRate(currency);
  return rate === 0 ? value : value / rate;
};

export const formatUsdAmount = (
  value: number,
  currency: unknown,
  options?: Omit<Intl.NumberFormatOptions, "style" | "currency">,
) => formatCurrencyAmount(convertUsdToCurrency(value, currency), currency, options);

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

/* ------------------------------------------------------------------ */
/* Locale-based currency suggestion (used during signup)                */
/* ------------------------------------------------------------------ */
const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  KE: "KES",
  NG: "NGN",
  GB: "GBP",
  US: "USD",
  ZA: "ZAR",
  AE: "AED",
  IN: "INR",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  PT: "EUR",
  IE: "EUR",
  BE: "EUR",
  AT: "EUR",
  FI: "EUR",
  GR: "EUR",
  SK: "EUR",
  SI: "EUR",
  LT: "EUR",
  LV: "EUR",
  EE: "EUR",
  LU: "EUR",
  MT: "EUR",
  CY: "EUR",
  HR: "EUR",
};

export const suggestCurrencyFromLocale = (locale?: string): SupportedCurrency => {
  const source =
    locale ??
    (typeof navigator !== "undefined" && typeof navigator.language === "string" ? navigator.language : "");
  const parts = String(source).split("-");
  const country = parts[parts.length - 1]?.toUpperCase() ?? "";
  return COUNTRY_TO_CURRENCY[country] ?? DEFAULT_CURRENCY;
};
