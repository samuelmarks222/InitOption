export type CryptoDepositCheckoutCacheEntry = {
  cached_at: string;
  hosted_checkout_url?: string | null;
  instruction_id: string;
  payment_method_id: string;
  provider_name?: string | null;
  provider_order_id?: string | null;
  provider_pay_amount?: number | null;
  provider_pay_currency?: string | null;
  provider_payment_id?: string | null;
  provider_payment_status?: string | null;
};

const CACHE_PREFIX = "crypto_hosted_checkout_cache:";
const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;

const isBrowser = () => typeof window !== "undefined";

const getCacheKey = (instructionId: string) => `${CACHE_PREFIX}${instructionId}`;

const isFresh = (cachedAt: string) => {
  const timestamp = new Date(cachedAt).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp <= CACHE_TTL_MS;
};

export const saveCryptoDepositCheckoutCache = (entry: Omit<CryptoDepositCheckoutCacheEntry, "cached_at">) => {
  if (!isBrowser() || !entry.instruction_id) return;

  const payload: CryptoDepositCheckoutCacheEntry = {
    ...entry,
    cached_at: new Date().toISOString(),
  };

  window.localStorage.setItem(getCacheKey(entry.instruction_id), JSON.stringify(payload));
};

export const loadCryptoDepositCheckoutCache = (
  instructionId: string | null | undefined,
): CryptoDepositCheckoutCacheEntry | null => {
  if (!isBrowser() || !instructionId) return null;

  const raw = window.localStorage.getItem(getCacheKey(instructionId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CryptoDepositCheckoutCacheEntry;
    if (!parsed || parsed.instruction_id !== instructionId || !isFresh(parsed.cached_at)) {
      window.localStorage.removeItem(getCacheKey(instructionId));
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(getCacheKey(instructionId));
    return null;
  }
};

export const clearCryptoDepositCheckoutCache = (instructionId: string | null | undefined) => {
  if (!isBrowser() || !instructionId) return;
  window.localStorage.removeItem(getCacheKey(instructionId));
};
