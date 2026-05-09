import type { ReactNode } from "react";
import { DrawingProvider } from "@/contexts/DrawingContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SocialTradingProvider } from "@/contexts/SocialTradingContext";
import { VipProvider } from "@/contexts/VipContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { TradingProvider } from "@/hooks/useTrading";
import { DynamicAssetProvider } from "@/contexts/DynamicAssetContext";

const TradingRouteProviders = ({ children }: { children: ReactNode }) => (
  <CurrencyProvider>
    <DrawingProvider>
      <VipProvider>
        <NotificationProvider>
          <SocialTradingProvider>
            <DynamicAssetProvider>
              <TradingProvider>{children}</TradingProvider>
            </DynamicAssetProvider>
          </SocialTradingProvider>
        </NotificationProvider>
      </VipProvider>
    </DrawingProvider>
  </CurrencyProvider>
);

export default TradingRouteProviders;
