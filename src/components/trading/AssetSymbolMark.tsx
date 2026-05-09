import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { CommodityIcon } from "@/lib/assets";
import {
  getAssetCommodityIcon,
  getAssetCommodityLogo,
  getAssetFallbackLabel,
  getAssetFlags,
  getAssetQuoteFlagCode,
  getAssetStockLogo,
  getCryptoLogoUrl,
  getStockLogoSources,
  normalizeAssetCategory,
} from "@/lib/assets";
import { cn } from "@/lib/utils";
import CountryFlag from "@/components/ui/CountryFlag";

interface AssetSymbolMarkProps {
  symbol: string;
  name?: string | null;
  category?: string | null;
  flags?: Array<string | null | undefined>;
  stockLogo?: string | null;
  commodityIcon?: CommodityIcon | null;
  size?: number;
  className?: string;
  fallbackLabelLength?: number;
}

interface SingleAssetImageProps {
  sources: string[];
  alt: string;
  size: number;
  className?: string;
  fallbackLabel: string;
  fallbackBackground: string;
  background?: string;
  borderColor?: string;
  padding?: number;
  overlay?: ReactNode;
}

const SingleAssetImage = ({
  sources,
  alt,
  size,
  className,
  fallbackLabel,
  fallbackBackground,
  background = "#ffffff",
  borderColor = "rgba(255,255,255,0.1)",
  padding = 2,
  overlay,
}: SingleAssetImageProps) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [showFallback, setShowFallback] = useState(sources.length === 0);

  useEffect(() => {
    setSourceIndex(0);
    setShowFallback(sources.length === 0);
  }, [sources]);

  const activeSource = sources[sourceIndex] ?? null;
  const fallbackFontSize = Math.max(8, Math.round(size * 0.42));

  return (
    <div
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border", className)}
      style={{
        width: size,
        height: size,
        background,
        borderColor,
        boxShadow: "0 6px 14px rgba(0,0,0,0.22)",
      }}
    >
      {!showFallback && activeSource ? (
        <img
          src={activeSource}
          alt={alt}
          className="h-full w-full object-contain"
          style={{ padding }}
          onError={() => {
            if (sourceIndex < sources.length - 1) {
              setSourceIndex((current) => current + 1);
              return;
            }

            setShowFallback(true);
          }}
        />
      ) : null}

      <div
        className="absolute inset-0 items-center justify-center font-black uppercase text-white"
        style={{
          display: showFallback ? "flex" : "none",
          background: fallbackBackground,
          fontSize: fallbackFontSize,
          letterSpacing: "0.03em",
        }}
      >
        {fallbackLabel}
      </div>

      {overlay}
    </div>
  );
};

export const AssetSymbolMark = ({
  symbol,
  name,
  category,
  flags = [],
  stockLogo,
  commodityIcon,
  size = 22,
  className,
  fallbackLabelLength = 2,
}: AssetSymbolMarkProps) => {
  const resolvedCategory = normalizeAssetCategory(category, symbol);
  const resolvedFlags = getAssetFlags(symbol, flags);
  const quoteFlagCode = getAssetQuoteFlagCode(symbol, flags);
  const resolvedStockLogo = getAssetStockLogo(symbol, stockLogo);
  const resolvedCommodityIcon = getAssetCommodityIcon(symbol, commodityIcon);
  const commodityLogo = getAssetCommodityLogo(symbol, resolvedCommodityIcon);
  const stockLogoSources = useMemo(
    () => getStockLogoSources(symbol, resolvedStockLogo),
    [resolvedStockLogo, symbol],
  );
  const label = getAssetFallbackLabel(symbol, name, fallbackLabelLength);
  const flagBadgeSize = Math.max(10, Math.round(size * 0.46));
  const quoteFlagBadge =
    resolvedCategory !== "OTC" && quoteFlagCode ? (
      <span
        className="absolute overflow-hidden rounded-full border bg-white"
        style={{
          right: -Math.max(1, Math.round(size * 0.05)),
          bottom: -Math.max(1, Math.round(size * 0.05)),
          width: flagBadgeSize,
          height: flagBadgeSize,
          borderColor: "rgba(20,25,34,0.65)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.28)",
        }}
      >
        <CountryFlag code={quoteFlagCode} size={flagBadgeSize} />
      </span>
    ) : null;

  if (resolvedCategory === "OTC" && resolvedFlags.length >= 2) {
    const pairOffset = Math.max(8, Math.round(size * 0.42));
    const pairWidth = size + pairOffset;

    return (
      <div className={cn("relative shrink-0", className)} style={{ width: pairWidth, height: size }}>
        <div
          className="absolute top-0 overflow-hidden rounded-full border bg-white"
          style={{
            left: pairOffset,
            width: size,
            height: size,
            zIndex: 1,
            borderColor: "rgba(255,255,255,0.15)",
          }}
        >
          <CountryFlag code={resolvedFlags[1]} size={size} />
        </div>
        <div
          className="absolute left-0 top-0 overflow-hidden rounded-full border bg-white"
          style={{
            width: size,
            height: size,
            zIndex: 2,
            borderColor: "rgba(255,255,255,0.15)",
          }}
        >
          <CountryFlag code={resolvedFlags[0]} size={size} />
        </div>
      </div>
    );
  }

  if (resolvedCategory === "CRYPTO") {
    return (
      <SingleAssetImage
        sources={[getCryptoLogoUrl(symbol)]}
        alt={`${name ?? symbol} logo`}
        size={size}
        className={className}
        fallbackLabel={label}
        fallbackBackground="#f59e0b"
        overlay={quoteFlagBadge}
      />
    );
  }

  if (resolvedCategory === "STOCKS") {
    return (
      <SingleAssetImage
        sources={stockLogoSources}
        alt={`${name ?? symbol} logo`}
        size={size}
        className={className}
        fallbackLabel={getAssetFallbackLabel(symbol, name, 1)}
        fallbackBackground="#0b65c2"
        overlay={quoteFlagBadge}
      />
    );
  }

  if (resolvedCategory === "COMMODITIES") {
    return (
      <SingleAssetImage
        sources={commodityLogo ? [commodityLogo] : []}
        alt={`${name ?? symbol} icon`}
        size={size}
        className={className}
        fallbackLabel={label}
        fallbackBackground="linear-gradient(135deg, #9b5f2f 0%, #6f3f14 100%)"
        background="linear-gradient(135deg, #222935 0%, #141922 100%)"
        borderColor="rgba(255,255,255,0.12)"
        padding={0}
        overlay={quoteFlagBadge}
      />
    );
  }

  return (
    <SingleAssetImage
      sources={[]}
      alt={`${name ?? symbol} symbol`}
      size={size}
      className={className}
      fallbackLabel={label}
      fallbackBackground="#24304a"
      background="#24304a"
    />
  );
};

export default AssetSymbolMark;
