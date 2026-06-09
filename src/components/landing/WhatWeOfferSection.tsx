import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AssetSymbolMark from "@/components/trading/AssetSymbolMark";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { getAssetBasePrice, type AssetCategory } from "@/lib/assets";
import { getDeterministicChange24h, getDeterministicPriceAt } from "@/lib/deterministicMarket";
import { ASSETS_LIBRARY, type MasterAsset } from "@/data/assetsLibrary";
import { clampAssetPayout, getAssetFlags, getDynamicAssetPayoutProfile } from "@/lib/assets";

const SHOWCASE_COUNT = 6;

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const assetCategoryToLabel = (category: AssetCategory) => {
  if (category === "CRYPTO") return "Crypto";
  if (category === "STOCKS") return "Stock";
  if (category === "COMMODITIES") return "Commodity";
  return "Forex";
};

const getSparklineStepSeconds = (category: AssetCategory) => {
  if (category === "CRYPTO") return 22 * 60;
  if (category === "STOCKS") return 35 * 60;
  if (category === "COMMODITIES") return 28 * 60;
  return 18 * 60;
};

type ShowcaseAsset = {
  symbol: string;
  name: string;
  category: AssetCategory;
  label: string;
  price: number;
  change24h: number;
  maxProfit: number;
  flags: string[];
  stockLogo?: string | null;
  commodityIcon?: MasterAsset["commodity_icon"];
};

const buildSparklinePoints = (asset: ShowcaseAsset, nowSec: number) => {
  const category = asset.category;
  const basePrice = getAssetBasePrice(asset.symbol, category);
  const stepSeconds = getSparklineStepSeconds(category);

  return Array.from({ length: 17 }, (_, index) =>
    getDeterministicPriceAt({
      symbol: asset.symbol,
      basePrice,
      timestamp: nowSec - (16 - index) * stepSeconds,
      category,
    }),
  );
};

const pickShowcaseSymbols = (assets: MasterAsset[], seed: string) => {
  const uniqueAssets = Array.from(new Map(assets.map((asset) => [asset.symbol, asset])).values());
  const sortedAssets = [...uniqueAssets].sort(
    (left, right) => hashString(`${seed}:${left.symbol}`) - hashString(`${seed}:${right.symbol}`),
  );
  const selectedSymbols: string[] = [];

  (["CRYPTO", "STOCKS", "COMMODITIES", "CURRENCIES"] as AssetCategory[]).forEach((category) => {
    const firstOfType = sortedAssets.find((asset) => asset.category === category);
    if (firstOfType) {
      selectedSymbols.push(firstOfType.symbol);
    }
  });

  sortedAssets.forEach((asset) => {
    if (selectedSymbols.length >= SHOWCASE_COUNT) {
      return;
    }

    if (!selectedSymbols.includes(asset.symbol)) {
      selectedSymbols.push(asset.symbol);
    }
  });

  return selectedSymbols.slice(0, SHOWCASE_COUNT);
};

const formatTrend = (value: number) => `${value >= 0 ? "" : "-"}${Math.abs(value).toFixed(2)}%`;

const formatAssetPrice = (price: number) =>
  price.toLocaleString("en-US", {
    minimumFractionDigits: price >= 1000 ? 2 : price >= 1 ? 2 : 4,
    maximumFractionDigits: price >= 1000 ? 2 : price >= 1 ? 4 : 6,
  });

const Sparkline = ({ points, positive }: { points: number[]; positive: boolean }) => {
  const width = 236;
  const height = 120;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const spread = Math.max(max - min, 1);
  const linePoints = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((point - min) / spread) * (height - 12) - 6;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full sm:h-28" aria-hidden="true">
      <polygon
        points={`0,${height} ${linePoints} ${width},${height}`}
        fill={positive ? "rgba(28,129,248,0.12)" : "rgba(255,255,255,0.06)"}
      />
      <polyline
        points={linePoints}
        fill="none"
        stroke="#1c81f8"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const WhatWeOfferSection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const { markets } = websiteContent;
  const showcaseSeed = new Date().toISOString().slice(0, 10);
  const catalogSignature = useMemo(() => ASSETS_LIBRARY.map((asset) => asset.symbol).join("|"), []);
  const selectedSymbols = useMemo(() => pickShowcaseSymbols(ASSETS_LIBRARY, showcaseSeed), [catalogSignature, showcaseSeed]);
  const selectedAssets = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const assetMap = new Map(ASSETS_LIBRARY.map((asset) => [asset.symbol, asset]));

    return selectedSymbols
      .map((symbol) => assetMap.get(symbol))
      .filter((asset): asset is MasterAsset => Boolean(asset))
      .map((asset) => {
        const basePrice = getAssetBasePrice(asset.symbol, asset.category);
        const price = getDeterministicPriceAt({
          symbol: asset.symbol,
          basePrice,
          timestamp: nowSec,
          category: asset.category,
        });
        const change24h = getDeterministicChange24h({
          symbol: asset.symbol,
          basePrice,
          timestamp: nowSec,
          category: asset.category,
        });
        const { profit1m } = getDynamicAssetPayoutProfile({
          symbol: asset.symbol,
          category: asset.category,
          basePayout: clampAssetPayout(undefined),
          timestampSec: nowSec,
          marketBiasPercent: change24h,
        });

        return {
          symbol: asset.symbol,
          name: asset.name,
          category: asset.category,
          label: assetCategoryToLabel(asset.category),
          price,
          change24h,
          maxProfit: profit1m,
          flags: getAssetFlags(asset.symbol, [asset.base_country, asset.quote_country]),
          stockLogo: asset.stock_logo,
          commodityIcon: asset.commodity_icon,
        } satisfies ShowcaseAsset;
      });
  }, [selectedSymbols]);
  const sparklineBucket = Math.floor(Date.now() / 30000);
  const sparklineMap = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    return new Map(selectedAssets.map((asset) => [asset.symbol, buildSparklinePoints(asset, nowSec)]));
  }, [selectedAssets, sparklineBucket]);

  return (
    <section className="relative overflow-hidden bg-[#f5f7fa] py-16 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(28,129,248,0.05),transparent_24%)]" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-7 max-w-3xl text-center sm:mb-10"
        >
          <span className="mb-3 inline-block font-copy text-[11px] font-bold uppercase tracking-[0.28em] text-[#536471]">
            Market Showcase
          </span>
          <h2 className="font-display text-2xl font-bold text-[#0f1419] sm:text-4xl lg:text-5xl">
            {markets.title}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl font-copy text-[15px] leading-7 text-[#536471] sm:text-lg sm:leading-8">
            {markets.description}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 text-center sm:mb-10"
        >
          <Button
            size="lg"
            className="group h-11 rounded-[10px] border border-[#1c81f8] bg-[#1c81f8] px-6 font-copy text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#ffffff] shadow-[0_8px_32px_rgba(28,129,248,0.3)] transition-all duration-300 hover:shadow-[0_8px_48px_rgba(28,129,248,0.45)] hover:brightness-110 sm:h-12 sm:px-8 sm:text-sm"
            asChild
          >
            <Link to="/register">Start Trading</Link>
          </Button>
        </motion.div>

        <motion.div
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {!selectedAssets.length ? (
            <div className="rounded-[24px] border border-dashed border-[#e5e7eb] bg-[#f8f9fc] px-6 py-10 text-center text-sm text-[#536471] md:col-span-2 xl:col-span-3">
              Active platform assets will appear here as soon as the asset feed is available.
            </div>
          ) : selectedAssets.map((asset) => {
            const positive = asset.change24h >= 0;
            const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;
            const sparklinePoints = sparklineMap.get(asset.symbol) ?? [];

            return (
              <motion.article
                key={asset.symbol}
                variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
                className="landing-lift-card rounded-[22px] border border-[#e5e7eb] bg-white p-3.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] sm:rounded-[26px] sm:p-5"
              >
                <div className="grid gap-3.5 sm:grid-cols-[1.1fr_0.9fr] sm:gap-4 sm:items-start">
                  <div>
                    <div className="flex items-start gap-3">
                      <AssetSymbolMark
                        symbol={asset.symbol}
                        name={asset.name}
                        category={asset.category}
                        flags={asset.flags}
                        stockLogo={asset.stockLogo}
                        commodityIcon={asset.commodityIcon}
                        size={42}
                        className="sm:mt-0.5"
                      />
                      <div className="min-w-0">
                        <h3 className="font-display text-[1.3rem] font-bold leading-tight text-[#0f1419] sm:text-[1.65rem]">
                          {asset.symbol}
                        </h3>
                        <p className="font-copy line-clamp-2 text-xs text-[#536471] sm:text-sm">
                          {asset.name}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 sm:mt-5">
                      <Sparkline points={sparklinePoints} positive={positive} />
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-copy text-[10px] font-bold uppercase tracking-[0.16em] text-[#536471]">
                          Current price
                        </div>
                        <div className="mt-1 font-display text-lg font-bold text-[#0f1419]">
                          {formatAssetPrice(asset.price)}
                        </div>
                      </div>
                      <span className="rounded-full border border-[#1c81f8] bg-transparent px-3 py-1.5 font-copy text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1c81f8]">
                        {asset.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <div className="font-copy text-[11px] font-bold uppercase tracking-[0.18em] text-[#536471]">
                        Current trend
                      </div>
                      <div className="mt-2.5 flex items-center gap-2 sm:mt-3">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-md border sm:h-7 sm:w-7 ${positive ? "border-[#1c81f8] bg-[#1c81f8]" : "border-[#e5e7eb] bg-[#f0f2f5]"}`}>
                          <TrendIcon className={`h-4 w-4 ${positive ? "text-white" : "text-[#536471]"}`} />
                        </span>
                        <span className="font-display text-[1.55rem] font-bold leading-none text-[#0f1419] sm:text-[2rem]">
                          {formatTrend(asset.change24h)}
                        </span>
                      </div>

                      <div className="mt-3 font-copy text-[11px] font-bold uppercase tracking-[0.18em] text-[#536471] sm:mt-4">
                        Profit up to
                      </div>
                      <div className="mt-1 font-display text-[1.7rem] font-bold leading-none text-[#0f1419] sm:text-[2rem]">
                        {asset.maxProfit}%
                      </div>
                    </div>

                    <Button
                      className="group mt-4 h-10 rounded-[10px] border border-[#1c81f8] bg-[#1c81f8] font-copy text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#ffffff] shadow-[0_4px_20px_rgba(28,129,248,0.25)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(28,129,248,0.4)] hover:brightness-110 sm:mt-6 sm:h-11 sm:text-sm"
                      asChild
                    >
                      <Link to="/register">Trade</Link>
                    </Button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 grid gap-4 sm:mt-10 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] sm:rounded-[28px] sm:p-6">
            <div className="font-copy text-[11px] font-bold uppercase tracking-[0.24em] text-[#536471]">
              {markets.actionCardTitle}
            </div>
            <p className="mt-3 max-w-2xl font-copy text-[15px] leading-7 text-[#536471] sm:text-lg sm:leading-8">
              {markets.actionCardText}
            </p>
          </div>

          <div className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] sm:rounded-[28px] sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-[14px] border border-[#1c81f8] bg-[#1c81f8] px-4 py-3.5 font-copy text-[11px] font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_16px_28px_rgba(28,129,248,0.24)] sm:px-5 sm:py-4 sm:text-sm"
              >
                {markets.upButtonLabel}
              </button>
              <button
                type="button"
                className="rounded-[14px] border border-[#1c81f8] bg-[#1c81f8] px-4 py-3.5 font-copy text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#ffffff] shadow-[0_8px_24px_rgba(28,129,248,0.25)] sm:px-5 sm:py-4 sm:text-sm"
              >
                {markets.downButtonLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhatWeOfferSection;
