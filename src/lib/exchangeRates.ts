import {
  applyLiveUsdRates,
  SupportedCurrency,
  getUsdRate,
  isSupportedCurrency,
} from "@/lib/currency";

const RATES_CACHE_KEY = "exchange_rates_usd_v1";
const RATES_TTL_MS = 6 * 60 * 60 * 1000;

const SUPPORTED: SupportedCurrency[] = ["USD", "KES", "EUR", "GBP", "NGN", "ZAR", "AED", "INR"];

interface CachedRates {
  ts: number;
  rates: Partial<Record<SupportedCurrency, number>>;
}

const readCache = (): CachedRates | null => {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedRates;
    if (!cached || typeof cached.ts !== "number" || !cached.rates) return null;
    return cached;
  } catch {
    return null;
  }
};

const writeCache = (rates: Partial<Record<SupportedCurrency, number>>) => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ ts: Date.now(), rates }));
  } catch {
    /* ignore storage errors */
  }
};

export const loadUsdRates = async (): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Exchange-rate request failed: ${res.status}`);
    const json = (await res.json()) as { rates?: Record<string, unknown> };
    if (!json?.rates) throw new Error("Exchange-rate response missing rates");

    const next: Partial<Record<SupportedCurrency, number>> = {};
    for (const code of SUPPORTED) {
      const value = Number(json.rates[code]);
      if (Number.isFinite(value) && value > 0) next[code] = value;
    }
    if (Object.keys(next).length === 0) throw new Error("Exchange-rate response empty");

    applyLiveUsdRates(next);
    writeCache(next);
  } catch {
    const cached = readCache();
    if (cached && Date.now() - cached.ts < RATES_TTL_MS) {
      applyLiveUsdRates(cached.rates);
    }
  }
};

export const preloadUsdRates = () => {
  const cached = readCache();
  if (cached && cached.rates) {
    applyLiveUsdRates(cached.rates);
  }
  void loadUsdRates();
};

export const formatUsdToCurrencyRate = (currency: SupportedCurrency) => getUsdRate(currency);

export const normalizeStoredCurrency = (value: unknown): SupportedCurrency | null =>
  isSupportedCurrency(value) ? value : null;
