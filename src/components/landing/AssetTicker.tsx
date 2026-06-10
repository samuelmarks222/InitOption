import React, { useMemo } from "react";
import AssetSymbolMark from "@/components/trading/AssetSymbolMark";
import { ASSETS_LIBRARY, type MasterAsset } from "@/data/assetsLibrary";

const ROWS = 5;
const ITEM_GAP_PX = 18;

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const pickMixedAssets = () => {
  // mix categories: CRYPTO, COMMODITIES, STOCKS
  const pool = ASSETS_LIBRARY.filter((a) => ["CRYPTO", "COMMODITIES", "STOCKS"].includes(a.category));
  // deterministic shuffle
  const seed = new Date().toISOString().slice(0, 10);
  const sorted = [...pool].sort((l, r) => hashString(`${seed}:${l.symbol}`) - hashString(`${seed}:${r.symbol}`));
  return sorted;
};

const randomPayoutFor = (symbol: string) => {
  const h = hashString(symbol);
  const pct = 65 + (h % 31); // 65 - 95%
  return pct;
};

const randomDurationFor = (symbol: string) => {
  const h = hashString(symbol + ":d");
  const choices = [30, 60, 120, 300];
  return choices[h % choices.length];
};

const AssetTicker: React.FC = () => {
  const assets = useMemo(() => pickMixedAssets(), []);

  // split into rows with wrap; ensure enough items by repeating
  const repeated = Array.from({ length: Math.ceil((ROWS * 8) / assets.length) + 1 }).flatMap(() => assets);

  const rows = Array.from({ length: ROWS }).map((_, rowIndex) => {
    const start = rowIndex * 8;
    const items = repeated.slice(start, start + 12);
    return items;
  });

  return (
    <div className="mt-6 w-full overflow-hidden">
      <style>{`
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          gap: ${ITEM_GAP_PX}px;
          align-items: center;
        }
      `}</style>

      <div className="space-y-3">
        {rows.map((rowItems, ri) => {
          const duration = 18 + ri * 4; // different speed per row
          return (
            <div key={ri} className="relative h-24 w-full overflow-hidden">
              <div
                className="absolute left-0 top-0 flex h-full items-center"
                style={{ width: "200%", animation: `tickerScroll ${duration}s linear infinite` }}
              >
                <div className="ticker-track" style={{ paddingLeft: 8 }}>
                  {rowItems.map((asset, idx) => (
                    <TickerCard key={`${asset.symbol}-${idx}`} asset={asset} />
                  ))}
                </div>

                <div className="ticker-track" style={{ paddingLeft: 8 }} aria-hidden>
                  {rowItems.map((asset, idx) => (
                    <TickerCard key={`dup-${asset.symbol}-${idx}`} asset={asset} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TickerCard: React.FC<{ asset: MasterAsset }> = ({ asset }) => {
  const payout = randomPayoutFor(asset.symbol);
  const duration = randomDurationFor(asset.symbol);
  const open = (hashString(asset.symbol) % 2) === 0;
  const directionUp = (hashString(asset.symbol + ":dir") % 2) === 0;

  return (
    <div className="flex h-20 w-48 min-w-[190px] flex-col items-start justify-between rounded-lg bg-white/95 px-3 py-2 shadow-md">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <AssetSymbolMark symbol={asset.symbol} name={asset.name} category={asset.category} size={36} />
          <div>
            <div className="text-sm font-semibold text-slate-800">{asset.symbol}</div>
            <div className="text-xs text-slate-500">{asset.name}</div>
          </div>
        </div>
        <div className="text-sm font-bold text-slate-800">{payout}%</div>
      </div>

      <div className="flex w-full items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <div className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${directionUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
            {directionUp ? "▲" : "▼"}
          </div>
          <div>{duration}s</div>
          <div>{open ? "Live" : "Closed"}</div>
        </div>
        <div className="text-xs font-medium text-slate-800">ROI {payout}%</div>
      </div>
    </div>
  );
};

export default AssetTicker;
