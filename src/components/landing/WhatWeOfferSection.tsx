import { useMemo, useState } from "react";
import AssetTicker from "./AssetTicker";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { ASSETS_LIBRARY, type MasterAsset } from "@/data/assetsLibrary";

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

        <AssetTicker />
      </div>
    </section>
  );
};

export default WhatWeOfferSection;
