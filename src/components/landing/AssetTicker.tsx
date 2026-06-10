import React, { useEffect, useMemo, useCallback, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AssetSymbolMark from "@/components/trading/AssetSymbolMark";
import { ASSETS_LIBRARY, type MasterAsset } from "@/data/assetsLibrary";

const BINARY_CATEGORIES = ["CRYPTO", "COMMODITIES", "STOCKS"];

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const selectCarouselAssets = () => {
  const filtered = ASSETS_LIBRARY.filter((asset) => BINARY_CATEGORIES.includes(asset.category));
  const seed = new Date().toISOString().slice(0, 10);
  return filtered
    .slice()
    .sort((a, b) => hashString(`${seed}:${a.symbol}`) - hashString(`${seed}:${b.symbol}`))
    .slice(0, 12);
};

const formatDuration = (seconds: number) => `${seconds}s`;
const randomPayout = (symbol: string) => 65 + (hashString(symbol) % 31);
const randomDuration = (symbol: string) => {
  const choices = [30, 60, 120, 300];
  return choices[hashString(`${symbol}-duration`) % choices.length];
};
const isLive = (symbol: string) => hashString(`${symbol}-status`) % 2 === 0;
const directionUp = (symbol: string) => hashString(`${symbol}-dir`) % 2 === 0;
const availabilityLabel = (symbol: string) => (isLive(symbol) ? "Open" : "Closed");

const AssetTicker: React.FC = () => {
  const assets = useMemo(() => selectCarouselAssets(), []);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center", containScroll: "trimSnaps", draggable: true });
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
              <div key={asset.symbol} className="min-w-[18.5rem] flex-shrink-0 px-2 sm:min-w-[20rem]">
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

const TickerCard: React.FC<{ asset: MasterAsset }> = ({ asset }) => {
  const payout = randomPayout(asset.symbol);
  const duration = randomDuration(asset.symbol);
  const live = isLive(asset.symbol);
  const up = directionUp(asset.symbol);

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
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

      <div className="mt-4 grid gap-3 text-sm text-slate-700">
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
          <span className="text-xs uppercase text-slate-500">Payout</span>
          <span className="font-semibold text-slate-900">{payout}%</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
          <span className="text-xs uppercase text-slate-500">Duration</span>
          <span className="font-semibold text-slate-900">{formatDuration(duration)}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
          <span className="text-xs uppercase text-slate-500">ROI</span>
          <span className="font-semibold text-slate-900">{payout}%</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900/5 px-3 py-2 text-sm text-slate-700">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
            up ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"
          }`}>
            {up ? "↑" : "↓"}
          </span>
          <div>{up ? "Up" : "Down"}</div>
        </div>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Binary</div>
      </div>
    </div>
  );
};

export default AssetTicker;
