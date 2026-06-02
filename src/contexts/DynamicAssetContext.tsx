import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';
import type { CommodityIcon } from "@/lib/assets";
import {
  assetCategoryToRuntimeType,
  clampAssetPayout,
  getAssetBasePrice,
  getAssetCommodityIcon,
  getAssetDefaultPayout,
  getDynamicAssetPayoutProfile,
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
  available: boolean;         // false when in dead zone (N/A)
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
  const configuredPayout = clampAssetPayout(assetRow.payout_pct, defaultPayout);
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
  const change24h = getDeterministicChange24h({
    symbol: assetRow.symbol,
    basePrice,
    timestamp: timestampSec,
    category,
  });
  const { profit1m, profit5m, available } = getDynamicAssetPayoutProfile({
    symbol: assetRow.symbol,
    category,
    basePayout: configuredPayout,
    timestampSec,
    marketBiasPercent: change24h,
  });

  return {
    symbol: assetRow.symbol,
    type,
    name: assetRow.name || assetRow.symbol,
    price,
    baselinePrice,
    change24h,
    maxProfit: profit1m,
    profit5m,
    available,
    flags: getAssetFlags(assetRow.symbol, [assetRow.base_country, assetRow.quote_country]),
    stockLogo: getAssetStockLogo(assetRow.symbol, assetRow.stock_logo),
    commodityIcon: getAssetCommodityIcon(assetRow.symbol, assetRow.commodity_icon),
    volatility: getVolatilityForType(type),
  };
};

export const DynamicAssetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<DynamicAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const assetsRef = useRef<DynamicAsset[]>([]);
  const userId = user?.id ?? null;

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (!userId) {
      assetsRef.current = [];
      setAssets([]);
      setLoading(false);
      return;
    }

    const initAssets = async () => {
      setLoading(true);
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
        const nextAssets = assetRows
          .map((assetRow) => buildDynamicAsset(assetRow, nowSec))
          .sort((a, b) => b.maxProfit - a.maxProfit);
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
  }, [userId]);

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
