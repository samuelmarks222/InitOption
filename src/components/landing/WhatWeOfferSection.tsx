import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AssetSymbolMark from "@/components/trading/AssetSymbolMark";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { ASSETS_LIBRARY, type MasterAsset } from "@/data/assetsLibrary";
import { getAssetBasePrice, type AssetCategory } from "@/lib/assets";
import { getDeterministicChange24h, getDeterministicPriceAt } from "@/lib/deterministicMarket";
import { clampAssetPayout, getDynamicAssetPayoutProfile } from "@/lib/assets";

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

type ShowcaseAsset = {
  symbol: string;
  name: string;
  category: AssetCategory;
  label: string;
  price: number;
  change24h: number;
  maxProfit: number;
  stockLogo?: string | null;
  commodityIcon?: MasterAsset["commodity_icon"];
};

const buildCategoryAssets = (categoryKey: string) => {
  return ASSETS_LIBRARY.filter((a) => a.category === (categoryKey as MasterAsset["category"]));
};

const WhatWeOfferSection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const { markets } = websiteContent;

  const availableCategories = useMemo(() => {
    const set = Array.from(new Set(ASSETS_LIBRARY.map((a) => a.category)));
    return set;
  }, []);

  const [activeCategory, setActiveCategory] = useState<string>(availableCategories[0] ?? "OTC");

  const selectedAssets = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const assets = buildCategoryAssets(activeCategory).slice(0, 12);

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
      const { profit1m } = getDynamicAssetPayoutProfile({
        symbol: asset.symbol,
        category: asset.category as AssetCategory,
        basePayout: clampAssetPayout(undefined),
        timestampSec: nowSec,
        marketBiasPercent: change24h,
      });

      return {
        symbol: asset.symbol,
        name: asset.name,
        category: asset.category as AssetCategory,
        label: CATEGORY_LABELS[asset.category] ?? asset.category,
        price,
        change24h,
        maxProfit: profit1m,
        spread: PRICE_SPREADS[index % PRICE_SPREADS.length],
        stockLogo: asset.stock_logo,
        commodityIcon: asset.commodity_icon,
      } as const;
    });
  }, [activeCategory]);

  return (
    <section className="relative overflow-hidden py-16 sm:py-24" style={{ background: "#0f172a" }}>
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,hsl(var(--landing-primary))_0_0.08,transparent_24%)]" />
      <div className="relative px-[70px]">
        <div className="mx-auto mb-8 max-w-5xl text-center">
          <span className="inline-flex rounded-full bg-[hsl(var(--landing-primary))]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-[hsl(var(--landing-primary))]">
            TRADE NOW
          </span>
          <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Market Spreads and Swaps
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
            {markets.description}
          </p>
        </div>

        <div className="mb-10 overflow-hidden rounded-full border border-white/10 bg-white/5 p-1 shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
          <div className="flex flex-wrap items-center justify-center gap-2 px-2 py-2">
            {availableCategories.map((categoryKey) => (
              <button
                key={categoryKey}
                type="button"
                onClick={() => setActiveCategory(categoryKey)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeCategory === categoryKey
                    ? "bg-[hsl(var(--landing-primary))] text-black shadow-[0_8px_20px_rgba(28,215,147,0.18)]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {CATEGORY_LABELS[categoryKey] ?? categoryKey}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-5 lg:grid-cols-2 md:grid-cols-2">
          {selectedAssets.map((asset, index) => {
            const { ask, bid, spread } = calculateQuoteValues(asset.price, asset.spread);
            return (
              <article key={asset.symbol} className="rounded-[26px] border border-white/10 bg-white px-5 py-6 shadow-[0_30px_70px_rgba(0,0,0,0.14)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {asset.label}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                      {formatPairLabel(asset.symbol)}
                    </h3>
                  </div>
                  <AssetSymbolMark
                    symbol={asset.symbol}
                    name={asset.name}
                    category={asset.category}
                    stockLogo={asset.stockLogo}
                    commodityIcon={asset.commodityIcon}
                    size={44}
                  />
                </div>

                <div className="mt-6 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Ask</span>
                    <span className="font-semibold text-slate-950">{ask}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bid</span>
                    <span className="font-semibold text-slate-950">{bid}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Spread</span>
                    <span className="font-semibold text-slate-950">{spread}</span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="mt-6 w-full rounded-[14px] border border-[hsl(var(--landing-primary))] bg-transparent px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-[hsl(var(--landing-primary))] transition hover:bg-[hsl(var(--landing-primary))] hover:text-black"
                  asChild
                >
                  <Link to="/register">Trade</Link>
                </Button>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-white shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
            <div className="font-copy text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--landing-primary))]">
              Live spreads
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
              See our most competitive spreads across forex, crypto, commodities and indices — presented with the same platform precision you already trust.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-white shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
            <div className="font-copy text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--landing-primary))]">
              Actionable trades
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
              Every card uses real platform asset data and pricing logic so the section feels native to Init Option and aligns with the underlying feed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatWeOfferSection;
