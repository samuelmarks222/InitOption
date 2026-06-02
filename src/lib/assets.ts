import { ASSETS_LIBRARY, type MasterAsset } from "@/data/assetsLibrary";

export type AssetCategory = MasterAsset["category"];
export type RuntimeAssetType = "Forex" | "Crypto" | "Stock" | "Commodities";
export type SelectorAssetCategory = "CURRENCIES" | "CRYPTO" | "COMMODITIES" | "STOCKS";
export type CommodityIcon = NonNullable<MasterAsset["commodity_icon"]>;

const CATEGORY_ALIASES: Record<string, AssetCategory> = {
  OTC: "OTC",
  FOREX: "OTC",
  CURRENCIES: "OTC",
  CURRENCY: "OTC",
  CRYPTO: "CRYPTO",
  CRYPTOCURRENCY: "CRYPTO",
  CRYPTOCURRENCIES: "CRYPTO",
  STOCK: "STOCKS",
  STOCKS: "STOCKS",
  COMMODITY: "COMMODITIES",
  COMMODITIES: "COMMODITIES",
};

const ASSET_BASE_PRICES: Record<string, number> = {
  BTC: 64320,
  ETH: 3400,
  BNB: 580,
  XRP: 0.62,
  SOL: 145,
  DOGE: 0.18,
  ADA: 0.72,
  TRX: 0.12,
  MATIC: 0.94,
  DOT: 8.2,
  LTC: 92,
  BCH: 410,
  AAPL: 212,
  MSFT: 428,
  GOOGL: 171,
  AMZN: 186,
  NVDA: 910,
  TSLA: 182,
  META: 505,
  NFLX: 628,
  "XAU/USD": 2350,
  "XAG/USD": 28.4,
  "WTICO/USD": 78.2,
  "BRENT/USD": 82.1,
  "NATGAS/USD": 2.7,
  COPPER: 4.2,
  PALLADIUM: 980,
  PLATINUM: 950,
};

const CRYPTO_LOGO_OVERRIDES: Record<string, string> = {
  BCH: "bitcoin-cash",
  DOGE: "dogecoin",
  SHIB: "shiba-inu",
};

const CURRENCY_FLAG_CODES: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  CHF: "CH",
  AUD: "AU",
  CAD: "CA",
  NZD: "NZ",
  ZAR: "ZA",
  MXN: "MX",
  BRL: "BR",
  TRY: "TR",
  CNH: "CN",
  CNY: "CN",
  INR: "IN",
  SGD: "SG",
  HKD: "HK",
  NOK: "NO",
  SEK: "SE",
  DKK: "DK",
  PLN: "PL",
  HUF: "HU",
 };

const COMMODITY_LOGO_PATHS: Record<CommodityIcon, string> = {
  gold: "/asset-logos/commodities/gold.svg",
  silver: "/asset-logos/commodities/silver.svg",
  oil: "/asset-logos/commodities/oil.svg",
  gas: "/asset-logos/commodities/gas.svg",
  copper: "/asset-logos/commodities/copper.svg",
};

const hashStringToUnitInterval = (input: string) => {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 0xffffffff;
};

export const normalizeAssetSymbol = (symbol?: string | null) => String(symbol ?? "").trim().toUpperCase();

const normalizeAssetLookupSymbol = (symbol?: string | null) =>
  normalizeAssetSymbol(symbol)
    .replace(/\(\s*OTC\s*\)/g, "")
    .replace(/(?:[\s_-]+OTC)$/g, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();

const normalizeAssetToken = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const getAssetPairTokens = (symbol?: string | null) => {
  const normalizedSymbol = normalizeAssetLookupSymbol(symbol);
  if (!normalizedSymbol.includes("/")) return null;

  const [rawBase, rawQuote] = normalizedSymbol.split("/");
  const base = normalizeAssetToken(rawBase);
  const quote = normalizeAssetToken(rawQuote);

  if (!base || !quote) return null;

  return {
    base,
    quote,
    pair: `${base}/${quote}`,
  };
};

const getAssetLookupCandidates = (symbol?: string | null) => {
  const normalizedSymbol = normalizeAssetLookupSymbol(symbol);
  const pairTokens = getAssetPairTokens(normalizedSymbol);
  const firstToken = normalizeAssetToken(normalizedSymbol.split(/\s+/)[0] ?? "");

  return Array.from(
    new Set(
      [
        normalizedSymbol,
        pairTokens?.pair,
        pairTokens?.base,
        firstToken,
      ].filter((value): value is string => Boolean(value)),
    ),
  );
};

const resolveCurrencyFlagCode = (symbol?: string | null) => {
  const normalizedSymbol = normalizeAssetToken(symbol);
  return CURRENCY_FLAG_CODES[normalizedSymbol] ?? null;
};

export const getMasterAssetBySymbol = (symbol?: string | null, preferredCategory?: AssetCategory | null) => {
  const candidates = getAssetLookupCandidates(symbol);

  for (const candidate of candidates) {
    const match = ASSETS_LIBRARY.find((asset) => {
      if (preferredCategory && asset.category !== preferredCategory) return false;
      return normalizeAssetSymbol(asset.symbol) === candidate;
    });

    if (match) return match;
  }

  if (preferredCategory) {
    return getMasterAssetBySymbol(symbol);
  }

  return undefined;
};

const inferCommodityIcon = (symbol?: string | null): CommodityIcon => {
  const normalizedSymbol = normalizeAssetSymbol(symbol);

  if (normalizedSymbol.includes("XAU") || normalizedSymbol.includes("GOLD")) return "gold";
  if (normalizedSymbol.includes("XAG") || normalizedSymbol.includes("SILV")) return "silver";
  if (normalizedSymbol.includes("WTI") || normalizedSymbol.includes("BRENT") || normalizedSymbol.includes("OIL")) return "oil";
  if (normalizedSymbol.includes("GAS")) return "gas";
  return "copper";
};

export const normalizeAssetCategory = (category?: string | null, symbol?: string | null): AssetCategory => {
  const normalizedCategory = String(category ?? "").trim().toUpperCase();
  return CATEGORY_ALIASES[normalizedCategory] ?? getMasterAssetBySymbol(symbol)?.category ?? "OTC";
};

export const getDeterministicFallbackBasePrice = (symbol?: string | null, category?: string | null) => {
  const normalizedSymbol = normalizeAssetSymbol(symbol) || "ASSET";
  const normalizedCategory = normalizeAssetCategory(category, normalizedSymbol);
  const seed = hashStringToUnitInterval(`${normalizedCategory}:${normalizedSymbol}`);

  if (normalizedCategory === "CRYPTO") {
    return 5 + seed * 600;
  }

  if (normalizedCategory === "STOCKS") {
    return 50 + seed * 400;
  }

  if (normalizedCategory === "COMMODITIES") {
    return 10 + seed * 2400;
  }

  return 1.05 + seed * 0.3;
};

export const assetCategoryToRuntimeType = (category: AssetCategory): RuntimeAssetType => {
  if (category === "CRYPTO") return "Crypto";
  if (category === "STOCKS") return "Stock";
  if (category === "COMMODITIES") return "Commodities";
  return "Forex";
};

export const assetCategoryToSelectorTab = (category: AssetCategory): SelectorAssetCategory => {
  if (category === "CRYPTO") return "CRYPTO";
  if (category === "STOCKS") return "STOCKS";
  if (category === "COMMODITIES") return "COMMODITIES";
  return "CURRENCIES";
};

export const getAssetFlags = (symbol?: string | null, existingFlags: Array<string | null | undefined> = []) => {
  const cleanedFlags = existingFlags.filter((flag): flag is string => Boolean(String(flag ?? "").trim()));
  if (cleanedFlags.length >= 2) return cleanedFlags.slice(0, 2);

  const masterAsset = getMasterAssetBySymbol(symbol);
  if (masterAsset?.base_country && masterAsset?.quote_country) {
    return [masterAsset.base_country, masterAsset.quote_country];
  }

  const pairTokens = getAssetPairTokens(symbol);
  if (pairTokens) {
    const baseFlag = resolveCurrencyFlagCode(pairTokens.base);
    const quoteFlag = resolveCurrencyFlagCode(pairTokens.quote);

    if (baseFlag && quoteFlag) {
      return [baseFlag, quoteFlag];
    }
  }

  return cleanedFlags;
};

export const getAssetQuoteFlagCode = (
  symbol?: string | null,
  existingFlags: Array<string | null | undefined> = [],
) => {
  const cleanedFlags = existingFlags.filter((flag): flag is string => Boolean(String(flag ?? "").trim()));
  if (cleanedFlags.length >= 2) return cleanedFlags[1];

  const masterAsset = getMasterAssetBySymbol(symbol);
  if (masterAsset?.quote_country) {
    return masterAsset.quote_country;
  }

  const pairTokens = getAssetPairTokens(symbol);
  return pairTokens ? resolveCurrencyFlagCode(pairTokens.quote) : null;
};

export const getAssetStockLogo = (symbol?: string | null, stockLogo?: string | null) =>
  stockLogo || getMasterAssetBySymbol(symbol, "STOCKS")?.stock_logo || null;

export const getAssetCommodityIcon = (symbol?: string | null, commodityIcon?: CommodityIcon | null) =>
  commodityIcon || getMasterAssetBySymbol(symbol, "COMMODITIES")?.commodity_icon || inferCommodityIcon(symbol);

const extractStockLogoDomain = (stockLogo?: string | null) => {
  const rawValue = String(stockLogo ?? "").trim();
  if (!rawValue) return null;

  const sanitizeDomain = (value: string) => value.replace(/^www\./i, "").replace(/\/+$/g, "").trim();

  try {
    const parsed = new URL(rawValue);

    if (parsed.hostname.includes("logo.clearbit.com")) {
      const domainFromPath = decodeURIComponent(parsed.pathname.replace(/^\/+/, "").split("/")[0] ?? "");
      return sanitizeDomain(domainFromPath);
    }

    return sanitizeDomain(parsed.hostname);
  } catch {
    const withoutProtocol = rawValue.replace(/^https?:\/\//i, "");
    const candidate = withoutProtocol.split(/[/?#]/)[0] ?? "";
    return sanitizeDomain(candidate);
  }
};

export const getStockLogoSources = (symbol?: string | null, stockLogo?: string | null) => {
  const resolvedLogo = getAssetStockLogo(symbol, stockLogo);
  const domain = extractStockLogoDomain(resolvedLogo);

  return Array.from(
    new Set(
      [
        resolvedLogo,
        domain ? `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(domain)}` : null,
        domain ? `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico` : null,
      ].filter((value): value is string => Boolean(value)),
    ),
  );
};

export const getAssetCommodityLogo = (symbol?: string | null, commodityIcon?: CommodityIcon | null) =>
  COMMODITY_LOGO_PATHS[getAssetCommodityIcon(symbol, commodityIcon)];

export const getAssetDefaultPayout = (category: AssetCategory) => {
  if (category === "CRYPTO") return 82;
  if (category === "STOCKS") return 78;
  if (category === "COMMODITIES") return 80;
  return 85;
};

export const clampAssetPayout = (value?: number | string | null, fallback = 85) => {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : fallback;
  return Math.min(95, Math.max(30, Math.round(safeValue)));
};

const clampNumericRange = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const getDynamicAssetPayoutProfile = ({
  symbol,
  category,
  basePayout,
  timestampSec,
  marketBiasPercent = 0,
}: {
  symbol?: string | null;
  category?: string | null;
  basePayout: number;
  timestampSec: number;
  marketBiasPercent?: number;
}) => {
  const normalizedSymbol = normalizeAssetSymbol(symbol) || "ASSET";
  const normalizedCategory = normalizeAssetCategory(category, normalizedSymbol);
  const seed = hashStringToUnitInterval(`payout:${normalizedCategory}:${normalizedSymbol}`);

  const cycleDuration = 40; // 40 seconds per cycle
  const cyclePhase = (timestampSec % cycleDuration) / cycleDuration; // 0 to 1
  const declineFraction = 0.75; // 75% declining, 25% N/A dead zone
  const highPayout = clampAssetPayout(basePayout + 5 + (seed - 0.5) * 10, basePayout);

  let profit1m: number;
  let profit5m: number;
  let available: boolean;

  if (cyclePhase < declineFraction) {
    // Decline phase: smooth decrease from high down to 30
    const progress = cyclePhase / declineFraction; // 0 to 1
    const rawValue = highPayout - progress * (highPayout - 30);
    const microJitter = Math.sin(timestampSec * 0.8 + seed * 100) * 0.4;
    profit1m = clampAssetPayout(rawValue + microJitter, basePayout);
    available = true;

    // profit5m slightly lower than profit1m with its own micro-jitter
    const raw5m = rawValue - 2 + Math.cos(timestampSec * 0.6 + seed * 50) * 0.4;
    profit5m = clampAssetPayout(raw5m, basePayout);
  } else {
    // Dead zone: show 30 (floor) and mark unavailable
    profit1m = 30;
    profit5m = 30;
    available = false;
  }

  return {
    profit1m,
    profit5m,
    available,
  };
};

export const getAssetBasePrice = (symbol?: string | null, category?: string | null) => {
  const normalizedSymbol = normalizeAssetSymbol(symbol);
  const exactPrice = ASSET_BASE_PRICES[normalizedSymbol];
  if (typeof exactPrice === "number") return exactPrice;
  return getDeterministicFallbackBasePrice(normalizedSymbol, category);
};

export const getCryptoLogoUrl = (symbol?: string | null) => {
  const pairTokens = getAssetPairTokens(symbol);
  const normalizedSymbol = pairTokens?.base || normalizeAssetLookupSymbol(symbol);
  const iconSlug = CRYPTO_LOGO_OVERRIDES[normalizedSymbol] || normalizedSymbol.toLowerCase();
  return `https://assets.coincap.io/assets/icons/${iconSlug}@2x.png`;
};

export const getAssetFallbackLabel = (symbol?: string | null, name?: string | null, maxLength = 2) => {
  const pairTokens = getAssetPairTokens(symbol);
  const normalizedSymbol = (pairTokens?.base || normalizeAssetLookupSymbol(symbol)).replace(/[^A-Z0-9]/g, "");
  if (normalizedSymbol) return normalizedSymbol.slice(0, maxLength);

  const initials = String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (initials || "AS").slice(0, maxLength);
};
