import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TradingChart from "@/components/trading/TradingChart";

const feeds = vi.hoisted(() => [] as Array<{options: any; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>}>);
vi.mock("@/components/trading/engine/marketDataFeed", () => ({
  createMarketDataFeed: (options: any) => {
    const feed = { options, connect: vi.fn(), disconnect: vi.fn() };
    feeds.push(feed);
    return feed;
  },
}));
vi.mock("@/contexts/DrawingContext", () => ({ useDrawings: () => ({ activeTool: null, setActiveTool: vi.fn(), setDrawings: vi.fn() }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/trading/PairInfoModal", () => ({ PairInfoModal: () => null }));

const asset = {symbol:"EUR/USD", price:1.1, basePrice:1.1, type:"forex"};
const indicator = {instanceId:"a", configId:"sma", name:"SMA", pane:"overlay" as const, params:{}, visible:true};
const props = () => ({ asset, activeIndicators: [indicator], onPriceUpdate: vi.fn(), onToggleIndicatorsPanel: vi.fn(), onToggleDrawingsPanel: vi.fn(), onUpdateIndicator: vi.fn(), onRemoveIndicator: vi.fn(), onOpenIndicatorSettings: vi.fn() });

beforeEach(() => { feeds.length = 0; });
describe("chart rebuild shell", () => {
  it("retains indicator and drawing entry points without rendering a chart", () => {
    const p = props();
    render(<TradingChart {...p} />);
    expect(screen.getByRole("status")).toHaveTextContent("chart system is being rebuilt");
    fireEvent.click(screen.getByTitle("chartToolbar.graphicalTools"));
    fireEvent.click(screen.getByTitle("chartToolbar.indicators"));
    expect(p.onToggleDrawingsPanel).toHaveBeenCalledOnce();
    expect(p.onToggleIndicatorsPanel).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", {name: "Hide SMA"}));
    expect(p.onUpdateIndicator).toHaveBeenCalledWith("a", {visible:false});
    fireEvent.click(screen.getByRole("button", {name: "Delete SMA"}));
    expect(p.onRemoveIndicator).toHaveBeenCalledWith("a");
    expect(screen.getByRole("button", {name:"tradingChart.zoomIn"})).toBeDisabled();
    fireEvent.click(screen.getByRole("button", {name:"chartToolbar.openChartSettings"}));
    expect(screen.getByText("tradingChart.displaySettings")).toBeInTheDocument();
    expect(screen.getByText("tradingChart.chartTypeCandles")).toBeInTheDocument();
  });
  it("keeps a live price subscription independent of rendering and cleans up on asset change", () => {
    const p = props();
    const view = render(<TradingChart {...p} />);
    expect(feeds[0].connect).toHaveBeenCalledOnce();
    feeds[0].options.callbacks.onTick({symbol:"EUR/USD", price:1.25, timestamp:125, source:"internal-otc"});
    expect(p.onPriceUpdate).toHaveBeenCalledWith(1.25,125,5);
    view.rerender(<TradingChart {...p} asset={{...asset, price:1.25}} />);
    expect(feeds).toHaveLength(1);
    view.rerender(<TradingChart {...p} asset={{...asset, symbol:"GBP/USD"}} />);
    expect(feeds[0].disconnect).toHaveBeenCalledOnce();
    feeds[0].options.callbacks.onTick({symbol:"EUR/USD", price:9, timestamp:126});
    expect(p.onPriceUpdate).toHaveBeenCalledTimes(1);
    expect(feeds[1].options.subscription.symbol).toBe("GBP/USD");
    view.unmount();
    expect(feeds[1].disconnect).toHaveBeenCalledOnce();
  });
  it("keeps mobile indicator and drawing controls accessible", () => {
    const p = props();
    render(<TradingChart {...p} />);
    fireEvent.click(screen.getByRole("button", {name:"Chart tools"}));
    fireEvent.click(screen.getByRole("button", {name:"Drawing tools"}));
    expect(p.onToggleDrawingsPanel).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", {name:"Chart tools"}));
    fireEvent.click(screen.getByRole("button", {name:"Indicators"}));
    expect(p.onToggleIndicatorsPanel).toHaveBeenCalledOnce();
  });
});
