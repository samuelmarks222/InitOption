import React, { useEffect, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import AssetSymbolMark from "@/components/trading/AssetSymbolMark";
import { type MasterAsset } from "@/data/assetsLibrary";

const formatDuration = (seconds: number) => `${seconds}s`;
const randomPayout = (symbol: string) => 65 + (symbol.length % 31);
const isLive = (symbol: string) => symbol.length % 2 === 0;
const directionUp = (symbol: string) => symbol.charCodeAt(0) % 2 === 0;
const availabilityLabel = (symbol: string) => (isLive(symbol) ? "Open" : "Closed");

type LandingAsset = {
  symbol: string;
  name: string;
  category: string;
  ask: string;
  bid: string;
  spread: number;
  price: number;
  change24h: number;
  maxProfit: number;
  stockLogo?: string | null;
  commodityIcon?: MasterAsset["commodity_icon"];
};

// no-op placeholder until the landing section passes asset props
const selectCarouselAssets = () => [] as LandingAsset[];

const AssetTicker: React.FC<{ assets: LandingAsset[] }> = ({ assets }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    containScroll: "trimSnaps",
    draggable: true,
    slidesToScroll: 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    const interval = window.setInterval(() => {
      emblaApi.scrollNext();
    }, 4200);
    return () => window.clearInterval(interval);
  }, [emblaApi]);

  return (
    <div className="mt-6 w-full overflow-hidden">
      <div className="mx-auto max-w-full">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex items-stretch">
            {assets.map((asset) => (
              <div key={asset.symbol} className="min-w-[100%] sm:min-w-[50%] md:min-w-[33.333%] lg:min-w-[20%] flex-shrink-0 px-2 sm:px-3 lg:px-4">
                <TickerCard asset={asset} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => emblaApi?.scrollTo(index)}
              className={`h-2.5 w-2.5 rounded-full transition ${
                index === selectedIndex ? "bg-[hsl(var(--landing-primary))]" : "bg-slate-500/30"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const TickerCard: React.FC<{ asset: LandingAsset }> = ({ asset }) => {
  const payout = randomPayout(asset.symbol);
  const live = isLive(asset.symbol);
  const up = directionUp(asset.symbol);

  return (
    <div className="flex min-h-[240px] flex-col justify-between rounded-[24px] border border-white/10 bg-white/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AssetSymbolMark symbol={asset.symbol} name={asset.name} category={asset.category} size={34} />
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-900">{asset.symbol}</div>
              <div className="text-xs text-slate-500">{asset.name}</div>
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
            live ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
          }`}>
            {availabilityLabel(asset.symbol)}
          </span>
        </div>

        <div className="mt-5 grid gap-3 text-sm text-slate-700">
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span className="text-xs uppercase text-slate-500">Ask</span>
            <span className="font-semibold text-slate-900">{asset.ask}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span className="text-xs uppercase text-slate-500">Bid</span>
            <span className="font-semibold text-slate-900">{asset.bid}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span className="text-xs uppercase text-slate-500">Spread</span>
            <span className="font-semibold text-slate-900">{asset.spread}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <div className="flex items-center justify-between rounded-2xl bg-slate-900/5 px-4 py-3 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">{payout}%</span>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Binary</span>
        </div>
        <Button
          className="w-full rounded-[14px] border border-[hsl(var(--landing-primary))] bg-[hsl(var(--landing-primary))] px-3 py-4 text-sm font-semibold uppercase tracking-[0.08em] text-black shadow-[0_10px_30px_rgba(28,215,147,0.16)] transition hover:brightness-105"
          asChild
        >
          <Link to="/trade">Trade</Link>
        </Button>
      </div>
    </div>
  );
};

export default AssetTicker;
