import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface CountryFlagProps {
  code?: string | null;
  size?: number;
  className?: string;
  title?: string;
}

const FLAG_CODE_OVERRIDES: Record<string, string> = {
  UK: "GB",
};

const FLAG_SOURCE_OVERRIDES: Record<string, string[]> = {
  EU: ["/asset-logos/flags/eu.svg"],
};

const normalizeFlagCode = (code?: string | null) => {
  const value = String(code ?? "").trim().toUpperCase();
  if (!value) return null;

  return FLAG_CODE_OVERRIDES[value] ?? value;
};

const getFlagImageSources = (code: string | null) => {
  if (!code || !/^[A-Z]{2}$/.test(code)) return [];

  return Array.from(
    new Set([
      ...(FLAG_SOURCE_OVERRIDES[code] ?? []),
      `https://flagcdn.com/${code.toLowerCase()}.svg`,
      `https://flagsapi.com/${code}/flat/64.png`,
    ]),
  );
};

export const CountryFlag = ({ code, size = 18, className, title }: CountryFlagProps) => {
  const normalizedCode = normalizeFlagCode(code);
  const sources = useMemo(() => getFlagImageSources(normalizedCode), [normalizedCode]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [showFallback, setShowFallback] = useState(sources.length === 0);

  useEffect(() => {
    setSourceIndex(0);
    setShowFallback(sources.length === 0);
  }, [sources]);

  const activeSource = sources[sourceIndex] ?? null;

  return (
    <span
      role="img"
      aria-label={normalizedCode ? `${normalizedCode} flag` : "Unknown flag"}
      title={title ?? normalizedCode ?? undefined}
      className={cn("inline-flex shrink-0 select-none items-center justify-center overflow-hidden leading-none", className)}
      style={{
        width: size,
        height: size,
      }}
    >
      {!showFallback && activeSource ? (
        <img
          src={activeSource}
          alt=""
          className="h-full w-full object-cover"
          decoding="async"
          draggable={false}
          onError={() => {
            if (sourceIndex < sources.length - 1) {
              setSourceIndex((current) => current + 1);
              return;
            }

            setShowFallback(true);
          }}
        />
      ) : (
        <span className="text-[0.52em] font-bold uppercase tracking-[0.08em] text-slate-500">
          {normalizedCode?.slice(0, 2) ?? "?"}
        </span>
      )}
    </span>
  );
};

export default CountryFlag;
