import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetSelectorModal } from "@/components/trading/AssetSelectorModal";

let dynamicAssetsMock = [
  {
    symbol: "CAD/JPY",
    type: "Forex" as const,
    name: "Canadian Dollar / Japanese Yen",
    price: 102.14,
    change24h: 1.15,
    maxProfit: 85,
    profit5m: 82,
    flags: ["CA", "JP"],
    baselinePrice: 101.0,
    volatility: 0.0001,
  },
  {
    symbol: "NZD/USD",
    type: "Forex" as const,
    name: "New Zealand Dollar / US Dollar",
    price: 0.61,
    change24h: -0.44,
    maxProfit: 84,
    profit5m: 81,
    flags: ["NZ", "US"],
    baselinePrice: 0.62,
    volatility: 0.0001,
  },
];

vi.mock("@/contexts/DynamicAssetContext", () => ({
  useDynamicAssets: () => ({
    assets: dynamicAssetsMock,
  }),
}));

vi.mock("@/hooks/useTrading", () => ({
  useTrading: () => ({
    activeTrades: [],
  }),
}));

vi.mock("@/components/trading/AssetSymbolMark", () => ({
  default: ({ symbol }: { symbol: string }) => <div>{symbol}</div>,
}));

describe("AssetSelectorModal", () => {
  beforeEach(() => {
    const storage = (() => {
      let values: Record<string, string> = {};

      return {
        getItem: (key: string) => values[key] ?? null,
        setItem: (key: string, value: string) => {
          values[key] = value;
        },
        removeItem: (key: string) => {
          delete values[key];
        },
        clear: () => {
          values = {};
        },
      };
    })();

    Object.defineProperty(window, "localStorage", {
      value: storage,
      configurable: true,
    });

    window.localStorage.clear();
    dynamicAssetsMock = [
      {
        symbol: "CAD/JPY",
        type: "Forex" as const,
        name: "Canadian Dollar / Japanese Yen",
        price: 102.14,
        change24h: 1.15,
        maxProfit: 85,
        profit5m: 82,
        flags: ["CA", "JP"],
        baselinePrice: 101.0,
        volatility: 0.0001,
      },
      {
        symbol: "NZD/USD",
        type: "Forex" as const,
        name: "New Zealand Dollar / US Dollar",
        price: 0.61,
        change24h: -0.44,
        maxProfit: 84,
        profit5m: 81,
        flags: ["NZ", "US"],
        baselinePrice: 0.62,
        volatility: 0.0001,
      },
    ];
  });

  it("switches into the favorites view as soon as an asset is starred", async () => {
    render(<AssetSelectorModal onClose={() => undefined} onSelect={() => undefined} />);

    expect(screen.getAllByText("CAD/JPY").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NZD/USD").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByLabelText("Add CAD/JPY to favorites")[0]);

    await waitFor(() => {
      expect(screen.getByLabelText("Show all assets")).toBeInTheDocument();
    });

    expect(JSON.parse(window.localStorage.getItem("trading_watchlist") ?? "[]")).toEqual(["CAD/JPY"]);
    expect(screen.getAllByText("CAD/JPY").length).toBeGreaterThan(0);
    expect(screen.queryByText("NZD/USD")).not.toBeInTheDocument();
  });
});
