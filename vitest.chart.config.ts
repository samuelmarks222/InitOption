import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "src/test/chartClockAndViewport.test.ts",
      "src/test/settlementConfirmation.test.tsx",
      "src/test/chartAnimationAndMode.test.tsx",
      "src/test/winningNotifications.test.tsx",
      "src/test/observedHistory.test.ts",
      "src/test/webSocketFeed.test.ts",
      "src/test/nativeChartEngine.test.ts",
      "src/test/nativeChartRenderer.test.ts",
      "src/test/realtimeCandleAggregator.test.ts",
      "src/test/priceEngineTimeframes.test.ts",
      "src/test/deterministicMarket.test.ts",
      "src/test/marketDataFeed.test.ts",
    ],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
