import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Bell, Star, ChevronLeft, ChevronRight } from "lucide-react";

interface AssetInfoPanelProps {
  asset: { symbol: string; price: number; flags?: string[] };
  onClose: () => void;
}



const ECONOMIC_EVENTS = [
  { time: "18:45", flag: "🇺🇸", name: "S&P Global Manufacturing PMI Final", current: "49.7", forecast: "48.8", previous: "48.5", impact: 3, isPositive: true },
  { time: "19:00", flag: "🇺🇸", name: "ISM Manufacturing New Orders", current: "50.4", forecast: "—", previous: "47.1", impact: 1, isPositive: true },
  { time: "19:00", flag: "🇺🇸", name: "Construction Spending MoM", current: "0.4%", forecast: "0.2%", previous: "0.1%", impact: 1, isPositive: true },
  { time: "19:00", flag: "🇺🇸", name: "ISM Manufacturing PMI", current: "48.4", forecast: "47.5", previous: "46.5", impact: 3, isPositive: true },
  { time: "19:00", flag: "🇺🇸", name: "ISM Manufacturing Prices", current: "50.3", forecast: "55.2", previous: "54.8", impact: 1, isPositive: false },
  { time: "21:00", flag: "🇺🇸", name: "JOLTS Job Openings", current: "8.10M", forecast: "7.74M", previous: "7.74M", impact: 2, isPositive: true },
  { time: "23:00", flag: "🇳🇿", name: "NZIER Business Confidence", current: "—", forecast: "—", previous: "17.0", impact: 2, isPositive: null },
];

const NEWS_ITEMS = [
  { time: "2 hours ago", headline: "NZD/USD strengthens as risk appetite improves", source: "Reuters" },
  { time: "4 hours ago", headline: "US Dollar under pressure amid mixed economic data", source: "Bloomberg" },
  { time: "6 hours ago", headline: "New Zealand trade balance beats expectations", source: "CNBC" },
  { time: "8 hours ago", headline: "Fed officials signal cautious approach to rate cuts", source: "FT" },
];

const AssetInfoPanel = ({ asset, onClose }: AssetInfoPanelProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(2);
  const changePercent = -0.27;
  const isPositiveChange = changePercent >= 0;

  const TABS = [t("assetInfoPanel.tabInformation"), t("assetInfoPanel.tabNews"), t("assetInfoPanel.tabEconomicEvents"), t("assetInfoPanel.tabTradingConditions")];

  const WEEKS = [
    { label: t("assetInfoPanel.previousWeek"), events: 88, isActive: false },
    { label: t("assetInfoPanel.thisWeek"), date: "2 Dec – 8 Dec", isActive: true },
    { label: t("assetInfoPanel.nextWeek"), events: 68, isActive: false },
  ];

  return (
    <div className="w-[320px] bg-[#1a1b20] border-r border-white/5 flex flex-col shrink-0 h-full overflow-hidden">
      {/* Asset Header */}
      <div
        className="p-4 border-b border-white/10 relative bg-cover bg-center"
        style={{ background: "linear-gradient(135deg, var(--trading-panel-bg) 0%, var(--trading-workspace-bg) 100%)" }}
      >
        {/* Flags */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex -space-x-2">
            {(asset.flags || ["🇳🇿", "🇺🇸"]).map((f, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-xl border-2 border-[#1a2035]" style={{ zIndex: 10 - i }}>
                {f}
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg">{asset.symbol}</span>
            </div>
            <span className="text-xs text-gray-400">{t("assetInfoPanel.closesTomorrow")}</span>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/20 border border-[#0fa053]/30">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-green-400 text-xs font-medium">{t("assetInfoPanel.openNow")}</span>
        </div>

        {/* Price Bar */}
        <div className="mt-3 flex items-center gap-6">
          <div>
            <div className="text-xs text-gray-400">{t("assetInfoPanel.priceLabel")}</div>
            <div className="text-2xl font-bold text-white">{asset.price.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              {t("assetInfoPanel.sessionChange")} <span className="text-[10px] text-gray-500 ml-1">ⓘ</span>
            </div>
            <div className={`text-2xl font-bold ${isPositiveChange ? "text-trading-green" : "text-red-400"}`}>
              {changePercent > 0 ? "+" : ""}{changePercent}%
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <Bell className="w-4 h-4 text-gray-300" />
            </button>
            <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <Star className="w-4 h-4 text-trading-orange fill-trading-orange" />
            </button>
            <button className="px-4 py-2 bg-trading-orange hover:bg-trading-orange/80 text-white text-sm font-bold rounded transition-colors">
              {t("assetInfoPanel.tradeNow")}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-[#1a1b20]">
        {TABS.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`flex-1 py-3 text-xs font-medium transition-colors border-b-2 ${
              activeTab === idx
                ? "text-foreground border-trading-orange"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {activeTab === 2 && (
          <div>
            {/* Week Selector */}
            <div className="flex items-stretch border-b border-white/5">
              <button className="px-3 text-muted-foreground hover:text-foreground flex items-center">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {WEEKS.map(w => (
                <button
                  key={w.label}
                  className={`flex-1 py-3 text-center text-sm transition-colors border-b-2 ${
                    w.isActive
                      ? "text-trading-orange border-trading-orange"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  }`}
                >
                  <div className="font-medium">{w.label}</div>
                  {w.events && <div className="text-xs text-muted-foreground">{w.events}{t("assetInfoPanel.eventsCount")}</div>}
                  {w.date && <div className="text-xs text-muted-foreground">{w.date}</div>}
                </button>
              ))}
              <button className="px-3 text-muted-foreground hover:text-foreground flex items-center">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Date Header */}
            <div className="px-4 py-3 bg-[#22242a] border-b border-white/5">
              <span className="font-semibold text-foreground text-base">2 December</span>
              <div className="flex mt-1 text-xs text-muted-foreground">
                <span className="flex-1"></span>
                <span className="w-20 text-right">{t("assetInfoPanel.currentlyHeader")}</span>
                <span className="w-20 text-right">{t("assetInfoPanel.forecastHeader")}</span>
                <span className="w-20 text-right">{t("assetInfoPanel.previousHeader")}</span>
              </div>
            </div>

            {/* Events */}
            {ECONOMIC_EVENTS.map((ev, i) => (
              <div key={i} className="px-4 py-3 border-b border-white/5 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{ev.time}</div>
                    <div className="flex gap-0.5 mt-1">
                      {Array.from({ length: ev.impact }).map((_, j) => (
                        <div key={j} className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      ))}
                    </div>
                  </div>
                  <span className="text-base">{ev.flag}</span>
                  <span className="text-sm text-foreground flex-1">{ev.name}</span>
                </div>
                <div className="flex mt-2 text-xs pl-12 gap-0">
                  <span className={`w-20 text-right font-medium ${ev.isPositive === true ? "text-trading-green" : ev.isPositive === false ? "text-red-400" : "text-foreground"}`}>
                    {ev.current}
                  </span>
                  <span className="w-20 text-right text-foreground">{ev.forecast}</span>
                  <span className="w-20 text-right text-muted-foreground">{ev.previous}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 1 && (
          <div className="p-4 space-y-4">
            {NEWS_ITEMS.map((item, i) => (
              <div key={i} className="border-b border-white/5 pb-4 last:border-0">
                <div className="text-xs text-muted-foreground mb-1">{item.time} · {item.source}</div>
                <div className="text-sm text-foreground leading-relaxed">{item.headline}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 0 && (
          <div className="p-4 space-y-4">
            <div className="trading-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider text-trading-orange">{t("assetInfoPanel.aboutAsset")} {asset.symbol}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {asset.symbol} is a major currency pair traded on global forex markets. The NZD (New Zealand Dollar) is the official currency of New Zealand, while the USD (US Dollar) is the world's primary reserve currency.
              </p>
            </div>
            <div className="trading-card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{t("assetInfoPanel.keyFacts")}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("assetInfoPanel.marketHours")}</span><span className="text-foreground">{t("assetInfoPanel.marketHoursValue")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("assetInfoPanel.minimumTrade")}</span><span className="text-foreground">{t("assetInfoPanel.minimumTradeValue")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("assetInfoPanel.maxPayout")}</span><span className="text-trading-green">{t("assetInfoPanel.maxPayoutValue")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("assetInfoPanel.volatility")}</span><span className="text-foreground">{t("assetInfoPanel.volatilityValue")}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 3 && (
          <div className="p-4 space-y-4">
            <div className="trading-card p-4 space-y-3">
              {[
                { label: t("assetInfoPanel.conditionInstrument"), value: asset.symbol },
                { label: t("assetInfoPanel.conditionType"), value: t("assetInfoPanel.conditionTypeValue") },
                { label: t("assetInfoPanel.conditionMaxProfit"), value: "85%", green: true },
                { label: t("assetInfoPanel.conditionMinInvestment"), value: "$1.00" },
                { label: t("assetInfoPanel.conditionMaxInvestment"), value: "$20,000" },
                { label: t("assetInfoPanel.conditionTradeDuration"), value: t("assetInfoPanel.conditionTradeDurationValue") },
                { label: t("assetInfoPanel.conditionSpread"), value: t("assetInfoPanel.conditionSpreadValue") },
                { label: t("assetInfoPanel.conditionLeverage"), value: t("assetInfoPanel.conditionLeverageValue") },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={item.green ? "text-trading-green font-semibold" : "text-foreground"}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetInfoPanel;

