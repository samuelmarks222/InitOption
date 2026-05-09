import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
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
