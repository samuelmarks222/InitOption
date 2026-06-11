import { useMemo, useState } from "react";
import AssetTicker from "./AssetTicker";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { ASSETS_LIBRARY, type MasterAsset } from "@/data/assetsLibrary";
import { getAssetBasePrice, type AssetCategory } from "@/lib/assets";
import { getDeterministicChange24h, getDeterministicPriceAt } from "@/lib/deterministicMarket";

const CATEGORY_LABELS: Record<string, string> = {
  OTC: "Currencies",
  CRYPTO: "Crypto",
  COMMODITIES: "Commodities",
  STOCKS: "Stocks",
};

const PRICE_SPREADS = [15, 13, 12, 9, 17];

const formatAssetPrice = (price: number) =>
  price.toLocaleString("en-US", {
    minimumFractionDigits: price >= 1000 ? 2 : price >= 1 ? 4 : 6,
    maximumFractionDigits: price >= 1000 ? 2 : price >= 1 ? 4 : 6,
  });

const formatPairLabel = (symbol: string) => symbol.replace("/", "-");

const calculateQuoteValues = (price: number, spread: number) => {
  const factor = price >= 1 ? 0.0002 : 0.00015;
  const ask = price + spread * factor;
  const bid = price - spread * factor;
  const precision = Math.max(5, 4);

  return {
    ask: ask.toFixed(precision),
    bid: bid.toFixed(precision),
    spread,
  };
};

const getSymbolHash = (symbol: string) =>
  symbol.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);

const getDeterministicPayout = (symbol: string, change24h: number) => {
  const hash = getSymbolHash(symbol);
  const categoryBias = Math.abs(symbol.length % 5 - 2);
  const base = 70 + (hash % 18) + categoryBias;
  const volatility = Math.round(Math.sin(hash / 7) * 3 + Math.cos(hash / 13) * 2);
  const momentum = Math.round(Math.max(-5, Math.min(8, change24h * 4)));
  return Math.max(68, Math.min(94, base + volatility + momentum));
};

const getDeterministicDuration = (symbol: string) => {
  const durations = [15, 30, 45, 60, 90, 120];
  const index = getSymbolHash(symbol) % durations.length;
  return durations[index];
};

const getDeterministicRoi = (payout: number) => Math.min(100, Math.max(70, payout + (payout % 5) + 2));

const getDeterministicStatus = (symbol: string) => (getSymbolHash(symbol) % 4 === 0 ? "Closed" : "Open");

const getDeterministicDirection = (symbol: string) => getSymbolHash(symbol) % 2 === 0;

type ShowcaseAsset = {
  symbol: string;
  name: string;
  category: AssetCategory;
  label: string;
  price: number;
  change24h: number;
  payout: number;
  roi: number;
  duration: number;
  marketStatus: "Open" | "Closed";
  directionUp: boolean;
  ask: string;
  bid: string;
  stockLogo?: string | null;
  commodityIcon?: MasterAsset["commodity_icon"];
};

const buildCategoryAssets = (categoryKey: string) => {
  return ASSETS_LIBRARY.filter((a) => a.category === (categoryKey as MasterAsset["category"]));
};

const TARGET_ASSETS = 8;

const calculateCategoryQuotas = (categories: string[]) => {
  const totalAssets = ASSETS_LIBRARY.length;
  const quotas = categories.map((categoryKey) => {
    const assetsInCategory = buildCategoryAssets(categoryKey);
    const exact = (assetsInCategory.length * TARGET_ASSETS) / totalAssets;
    const count = Math.max(1, Math.floor(exact));

    return {
      categoryKey,
      count,
      remainder: exact - count,
      available: assetsInCategory.length,
    };
  });

  let allocated = quotas.reduce((sum, quota) => sum + quota.count, 0);

  while (allocated < TARGET_ASSETS) {
    quotas.sort((a, b) => b.remainder - a.remainder);
    quotas[0].count += 1;
    quotas[0].remainder = 0;
    allocated += 1;
  }

  while (allocated > TARGET_ASSETS) {
    quotas.sort((a, b) => a.remainder - b.remainder);
    const target = quotas.find((quota) => quota.count > 1);
    if (!target) break;
    target.count -= 1;
    allocated -= 1;
  }

  return quotas.reduce<Record<string, number>>((counts, quota) => {
    counts[quota.categoryKey] = Math.min(quota.available, quota.count);
    return counts;
  }, {});
};

const WhatWeOfferSection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const { markets } = websiteContent;

  const CATEGORIES_ORDER = ["OTC", "CRYPTO", "STOCKS", "COMMODITIES"];

  const availableCategories = useMemo(() => {
    return CATEGORIES_ORDER.filter((c) => ASSETS_LIBRARY.some((a) => a.category === c));
  }, []);

  const [activeCategory, setActiveCategory] = useState<string>(availableCategories[0] ?? "OTC");

  const selectedAssets = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const quotas = calculateCategoryQuotas(availableCategories);
    const orderedCategories = [activeCategory, ...availableCategories.filter((c) => c !== activeCategory)];

    const assets = orderedCategories.flatMap((categoryKey) => {
      const count = quotas[categoryKey] ?? 0;
      return buildCategoryAssets(categoryKey).slice(0, count);
    }).slice(0, TARGET_ASSETS);

    return assets.map((asset, index) => {
      const basePrice = getAssetBasePrice(asset.symbol, asset.category as AssetCategory);
      const price = getDeterministicPriceAt({
        symbol: asset.symbol,
        basePrice,
        timestamp: nowSec,
        category: asset.category as AssetCategory,
      });
      const change24h = getDeterministicChange24h({
        symbol: asset.symbol,
        basePrice,
        timestamp: nowSec,
        category: asset.category as AssetCategory,
      });
      const quote = calculateQuoteValues(price, PRICE_SPREADS[index % PRICE_SPREADS.length]);

      const payout = getDeterministicPayout(asset.symbol, change24h);
      const duration = getDeterministicDuration(asset.symbol);
      const roi = getDeterministicRoi(payout);

      return {
        symbol: asset.symbol,
        name: asset.name,
        category: asset.category as AssetCategory,
        label: CATEGORY_LABELS[asset.category] ?? asset.category,
        price,
        change24h,
        payout,
        roi,
        duration,
        marketStatus: getDeterministicStatus(asset.symbol),
        directionUp: getDeterministicDirection(asset.symbol),
        ask: quote.ask,
        bid: quote.bid,
        stockLogo: asset.stock_logo,
        commodityIcon: asset.commodity_icon,
      } as const;
    });
  }, [activeCategory]);

  return (
    <section className="relative overflow-hidden py-16 sm:py-24" style={{ background: "#0f172a" }}>
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,hsl(var(--landing-primary))_0_0.08,transparent_24%)]" />
      <div className="relative px-6 sm:px-10 lg:px-[300px]">
        <div className="mx-auto w-full max-w-full">
          <div className="mx-auto mb-8 max-w-5xl text-center">
          <span className="inline-flex rounded-full bg-[hsl(var(--landing-primary))]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-[hsl(var(--landing-primary))]">
            TRADE NOW
          </span>
          <h2 className="mt-10 text-5xl font-extrabold tracking-[-0.05em] text-white sm:text-6xl">
            Market Spreads and Swaps
          </h2>
          {markets.description ? (
            <p className="mx-auto mt-8 max-w-3xl text-lg font-semibold leading-9 text-slate-200 sm:text-xl">
              {markets.description}
            </p>
          ) : null}
        </div>

        <div className="mb-14 overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
          <div className="flex flex-nowrap items-center justify-center gap-2 px-4 py-3">
            {availableCategories.map((categoryKey) => (
              <button
                key={categoryKey}
                type="button"
                onClick={() => setActiveCategory(categoryKey)}
                className={`rounded-full px-5 py-2 text-base font-semibold uppercase tracking-[0.06em] transition ${
                  activeCategory === categoryKey
                    ? "bg-[hsl(var(--landing-primary))] text-black shadow-[0_10px_24px_rgba(28,215,147,0.16)]"
                    : "border border-white/10 bg-transparent text-white/70 hover:border-white/20 hover:text-white"
                }`}
              >
                {CATEGORY_LABELS[categoryKey] ?? categoryKey}
              </button>
            ))}
          </div>
        </div>

        <AssetTicker assets={selectedAssets} />
      </div>
    </div>
    </section>
  );
};

export default WhatWeOfferSection;
