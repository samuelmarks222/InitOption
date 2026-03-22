import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

// Helper for normal distribution random variable
const randomNormal = () => {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
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

      const initialAssets: DynamicAsset[] = (data ?? []).map((assetRow: any) => {
        const category = normalizeAssetCategory(assetRow.category, assetRow.symbol);
        const type = assetCategoryToRuntimeType(category);
        const basePrice = getAssetBasePrice(assetRow.symbol, category);
        const defaultPayout = getAssetDefaultPayout(category);
        const maxProfit = clampAssetPayout(assetRow.payout_pct, defaultPayout);

        return {
          symbol: assetRow.symbol,
          type,
          name: assetRow.name || assetRow.symbol,
          price: basePrice,
          baselinePrice: basePrice,
          change24h: (Math.random() * 4) - 2,
          maxProfit,
          profit5m: clampAssetPayout(maxProfit + 2, maxProfit),
          flags: getAssetFlags(assetRow.symbol, [assetRow.base_country, assetRow.quote_country]),
          stockLogo: getAssetStockLogo(assetRow.symbol, assetRow.stock_logo),
          commodityIcon: getAssetCommodityIcon(assetRow.symbol, assetRow.commodity_icon),
          volatility:
            type === 'Crypto'
              ? 0.0005
              : type === 'Commodities'
                ? 0.00035
                : type === 'Forex'
                  ? 0.00005
                  : 0.0002,
        };
      });

      assetsRef.current = initialAssets;
      setAssets([...initialAssets]);
      setLoading(false);

      intervalId = setInterval(() => {
        assetsRef.current = assetsRef.current.map(asset => {
          const dt = 1;
          const drift = 0;
          const shock = asset.volatility * Math.sqrt(dt) * randomNormal();
          const newPrice = asset.price * (1 + shock + drift * dt);
          const newChange = ((newPrice - asset.baselinePrice) / asset.baselinePrice) * 100;

          let newMaxProfit = asset.maxProfit;
          let newProfit5m = asset.profit5m;
          if (Math.random() < 0.05) {
            newMaxProfit = clampAssetPayout(asset.maxProfit + (Math.random() > 0.5 ? 1 : -1), asset.maxProfit);
            newProfit5m = clampAssetPayout(newMaxProfit + 2, newMaxProfit);
          }

          return {
            ...asset,
            price: newPrice,
            change24h: newChange,
            maxProfit: newMaxProfit,
            profit5m: newProfit5m,
          };
        });

        setAssets([...assetsRef.current]);
      }, 1000);
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
