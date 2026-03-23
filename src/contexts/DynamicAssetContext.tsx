import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { CommodityIcon } from "@/lib/assets";
import {
  assetCategoryToRuntimeType,
  clampAssetPayout,
  getAssetBasePrice,
  getAssetCommodityIcon,
  getAssetDefaultPayout,
  getAssetFlags,
  getAssetStockLogo,
  normalizeAssetCategory,
} from "@/lib/assets";
import { getDeterministicChange24h, getDeterministicPriceAt } from "@/lib/deterministicMarket";

export interface DynamicAsset {
  symbol: string;
  type: "Forex" | "Crypto" | "Stock" | "Commodities";
  name: string;
  price: number;
  change24h: number;          // As a percentage number (e.g. 4.2 for 4.2%)
  maxProfit: number;          // e.g. 85 for 85%
  profit5m: number;           // e.g. 87 for 87%
  flags: string[];
  stockLogo?: string | null;
  commodityIcon?: CommodityIcon;
  baselinePrice: number;      // To calculate change against
  volatility: number;         // Used for GBM
}

interface DynamicAssetContextType {
  assets: DynamicAsset[];
  loading: boolean;
  getAsset: (symbol: string) => DynamicAsset | undefined;
}

const DynamicAssetContext = createContext<DynamicAssetContextType>({
  assets: [],
  loading: true,
  getAsset: () => undefined,
});

type AssetConfigRow = Tables<"assets_config">;

const getVolatilityForType = (type: DynamicAsset["type"]) => {
  if (type === "Crypto") return 0.0005;
  if (type === "Commodities") return 0.00035;
  if (type === "Stock") return 0.0002;
  return 0.00005;
};

const buildDynamicAsset = (assetRow: AssetConfigRow, timestampSec: number): DynamicAsset => {
  const category = normalizeAssetCategory(assetRow.category, assetRow.symbol);
  const type = assetCategoryToRuntimeType(category);
  const basePrice = getAssetBasePrice(assetRow.symbol, category);
  const defaultPayout = getAssetDefaultPayout(category);
  const maxProfit = clampAssetPayout(assetRow.payout_pct, defaultPayout);
  const price = getDeterministicPriceAt({
    symbol: assetRow.symbol,
    basePrice,
    timestamp: timestampSec,
    category,
  });
  const baselinePrice = getDeterministicPriceAt({
    symbol: assetRow.symbol,
    basePrice,
    timestamp: timestampSec - 24 * 60 * 60,
    category,
  });

  return {
    symbol: assetRow.symbol,
    type,
    name: assetRow.name || assetRow.symbol,
    price,
    baselinePrice,
    change24h: getDeterministicChange24h({
      symbol: assetRow.symbol,
      basePrice,
      timestamp: timestampSec,
      category,
    }),
    maxProfit,
    profit5m: clampAssetPayout(maxProfit + 2, maxProfit),
    flags: getAssetFlags(assetRow.symbol, [assetRow.base_country, assetRow.quote_country]),
    stockLogo: getAssetStockLogo(assetRow.symbol, assetRow.stock_logo),
    commodityIcon: getAssetCommodityIcon(assetRow.symbol, assetRow.commodity_icon),
    volatility: getVolatilityForType(type),
  };
};

export const DynamicAssetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<DynamicAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const assetsRef = useRef<DynamicAsset[]>([]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const initAssets = async () => {
      const { data, error } = await supabase
        .from('assets_config')
        .select('*')
        .eq('status', 'active')
        .order('category')
        .order('name');

      if (error) {
        console.error("Error loading active assets:", error);
        assetsRef.current = [];
        setAssets([]);
        setLoading(false);
        return;
      }

      const assetRows = (data ?? []) as AssetConfigRow[];
      const syncAssets = () => {
        const nowSec = Date.now() / 1000;
        const nextAssets = assetRows.map((assetRow) => buildDynamicAsset(assetRow, nowSec));
        assetsRef.current = nextAssets;
        setAssets(nextAssets);
      };

      syncAssets();
      setLoading(false);

      intervalId = setInterval(syncAssets, 1000);
    };

    initAssets();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const getAsset = (symbol: string) => {
    return assets.find(a => a.symbol === symbol);
  };

  return (
    <DynamicAssetContext.Provider value={{ assets, loading, getAsset }}>
      {children}
    </DynamicAssetContext.Provider>
  );
};

export const useDynamicAssets = () => useContext(DynamicAssetContext);
