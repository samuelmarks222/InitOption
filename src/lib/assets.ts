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

const hashStringToUnitInterval = (input: string) => {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 0xffffffff;
};

export const normalizeAssetSymbol = (symbol?: string | null) => String(symbol ?? "").trim().toUpperCase();

export const getMasterAssetBySymbol = (symbol?: string | null) => {
  const normalizedSymbol = normalizeAssetSymbol(symbol);
  return ASSETS_LIBRARY.find((asset) => normalizeAssetSymbol(asset.symbol) === normalizedSymbol);
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

  return cleanedFlags;
};

export const getAssetStockLogo = (symbol?: string | null, stockLogo?: string | null) =>
  stockLogo || getMasterAssetBySymbol(symbol)?.stock_logo || null;

export const getAssetCommodityIcon = (symbol?: string | null, commodityIcon?: CommodityIcon | null) =>
  commodityIcon || getMasterAssetBySymbol(symbol)?.commodity_icon || inferCommodityIcon(symbol);

export const getAssetDefaultPayout = (category: AssetCategory) => {
  if (category === "CRYPTO") return 82;
  if (category === "STOCKS") return 78;
  if (category === "COMMODITIES") return 80;
  return 85;
};

export const clampAssetPayout = (value?: number | string | null, fallback = 85) => {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : fallback;
  return Math.min(95, Math.max(60, Math.round(safeValue)));
};

export const getAssetBasePrice = (symbol?: string | null, category?: string | null) => {
  const normalizedSymbol = normalizeAssetSymbol(symbol);
  const exactPrice = ASSET_BASE_PRICES[normalizedSymbol];
  if (typeof exactPrice === "number") return exactPrice;
  return getDeterministicFallbackBasePrice(normalizedSymbol, category);
};

export const getCryptoLogoUrl = (symbol?: string | null) => {
  const normalizedSymbol = normalizeAssetSymbol(symbol);
  const iconSlug = CRYPTO_LOGO_OVERRIDES[normalizedSymbol] || normalizedSymbol.toLowerCase();
  return `https://assets.coincap.io/assets/icons/${iconSlug}@2x.png`;
};

export const getAssetFallbackLabel = (symbol?: string | null, name?: string | null, maxLength = 2) => {
  const normalizedSymbol = normalizeAssetSymbol(symbol).replace(/[^A-Z0-9]/g, "");
  if (normalizedSymbol) return normalizedSymbol.slice(0, maxLength);

  const initials = String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (initials || "AS").slice(0, maxLength);
};
