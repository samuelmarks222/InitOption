import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { type Tables } from "@/integrations/supabase/types";
import { NavigationSidebar, WorkspaceModule } from "@/components/navigation/NavigationSidebar";
import { DynamicWorkspace } from "@/components/workspace/DynamicWorkspace";
import { TournamentDetailOverlay } from "@/components/workspace/TournamentDetailOverlay";
import TradingHeader from "@/components/trading/TradingHeader";
import TradingChart, { type ChartSettlementAnnouncement } from "@/components/trading/TradingChart";
import TradingPanel from "@/components/trading/TradingPanel";
import {
  type ChartLayoutMode,
  CHART_LAYOUT_STORAGE_KEY,
  isChartLayoutMode,
  loadChartLayoutMode,
  TRADE_CHART_LAYOUT_MODE_CHANGED_EVENT,
  TRADE_CHART_LAYOUT_SET_EVENT,
} from "@/components/trading/chartLayout";
import AssetInfo from "@/components/trading/AssetInfo";
import { ProfileTourProvider } from "@/contexts/ProfileTourContext";
import { GuidedTour } from "@/components/tour/GuidedTour";
import { AssetSelectorModal, type AssetSelectorAsset } from "@/components/trading/AssetSelectorModal";
import { DepositGuideReminder } from "@/components/trading/DepositGuideReminder";
import IndicatorsPanel from "@/components/trading/indicators/IndicatorsPanel";
import { DrawingsPanel } from "@/components/trading/drawings/DrawingsPanel";
import { ActiveIndicator } from "@/components/trading/indicators/types";
import { INDICATOR_REGISTRY, STANDARD_INDICATOR_IDS } from "@/components/trading/indicators/config";
import { buildIndicatorDefaultParams } from "@/components/trading/indicators/fillColors";
import { useAuth } from "@/contexts/AuthContext";
import { useTrading, type ActiveTrade, type TradeHistoryEntry } from "@/hooks/useTrading";
import { useDynamicAssets, type DynamicAsset } from "@/contexts/DynamicAssetContext";
import { AccountType, RealAccountWelcomeModal } from "@/components/trading/AccountModals";
import { ProfileDrawer, type ProfileTab } from "@/components/profile/ProfileDrawer";
import { TournamentsGridOverlay } from "@/components/workspace/TournamentsGridOverlay";
import { AccountGridOverlay } from "@/components/workspace/AccountGridOverlay";
import { AnalyticsGridOverlay } from "@/components/workspace/AnalyticsGridOverlay";
import { WorkspaceReferral } from "@/components/workspace/WorkspaceReferral";
import type { AnalyticsSignalAsset } from "@/components/workspace/analytics/AnalyticsSignals";
import { HelpCenterOverlay } from "@/components/workspace/HelpCenterOverlay";
import { Image, HelpCircle, User, Trophy, MoreHorizontal, X } from "lucide-react";
import { MobileMoreMenu, MobileLeaderboardOverlay } from "@/components/workspace/MobileMoreMenu";
import {
  DEFAULT_DEMO_BALANCE,
  hasSeenNewUserPrompt,
  isNewUserProfile,
  markNewUserPromptSeen,
  readDemoBalanceStorage,
  writeDemoBalanceStorage,
} from "@/lib/onboarding";
import { playTradeCloseSound, playTradeOpenSound } from "@/lib/tradeSounds";
import {
  assetCategoryToRuntimeType,
  type CommodityIcon,
  getAssetBasePrice,
  getAssetCommodityIcon,
  getDynamicAssetPayoutProfile,
  getAssetFlags,
  getAssetStockLogo,
  normalizeAssetCategory,
  type RuntimeAssetType,
} from "@/lib/assets";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { filterRetainedTradeHistory } from "@/lib/tradeHistoryRetention";
import { getCandleStartTime, resolveFreshTradeMarkerTime } from "@/lib/tradeMarkerTime";

type DepositGuideReason = "deposit_required" | "insufficient_balance";

type TradeAssetConfigRow = Tables<"assets_config"> & {
  baseCountry?: string | null;
  quoteCountry?: string | null;
  base_country?: string | null;
  quote_country?: string | null;
  stockLogo?: string | null;
  stock_logo?: string | null;
  commodityIcon?: CommodityIcon | null;
  commodity_icon?: CommodityIcon | null;
};

type TradeTabAsset = {
  symbol: string;
  type: RuntimeAssetType;
  name: string;
  basePrice: number;
  icon: string;
  flags: string[];
  stockLogo?: string | null;
  commodityIcon?: CommodityIcon;
  maxProfit: number;
  change5min: string;
  category: "Options" | "Stocks";
  isTradersChoice: boolean;
  price: number;
  change: number;
};

// ─── Extracted to top-level to prevent remount on every Trade re-render ───
interface MobileModuleOverlayProps {
  mobileOverlay: string | null;
  setMobileOverlay: (v: string | null) => void;
  setSelectedTournament: (id: string | null) => void;
  analyticsSignalAsset?: AnalyticsSignalAsset;
}

const DEFAULT_TRADE_ASSET_ROW = {
  symbol: "EUR/USD",
  name: "EUR/USD",
  category: "OTC",
  payout_pct: 85,
  status: "active",
  base_country: "EU",
  quote_country: "US",
} as TradeAssetConfigRow;

const TRADE_ASSET_BOOT_TIMEOUT_MS = 4500;

const buildTradeTabAsset = (assetRow: TradeAssetConfigRow): TradeTabAsset => {
  const category = normalizeAssetCategory(assetRow.category, assetRow.symbol);
  const basePrice = getAssetBasePrice(assetRow.symbol, category);
  const { profit1m } = getDynamicAssetPayoutProfile({
    symbol: assetRow.symbol,
    category,
    basePayout: Number(assetRow.payout_pct),
    timestampSec: Date.now() / 1000,
  });

  return {
    symbol: assetRow.symbol,
    type: assetCategoryToRuntimeType(category),
    name: assetRow.name || assetRow.symbol,
    basePrice,
    icon: "star",
    flags: getAssetFlags(assetRow.symbol, [assetRow.baseCountry, assetRow.quoteCountry, assetRow.base_country, assetRow.quote_country]),
    stockLogo: getAssetStockLogo(assetRow.symbol, assetRow.stockLogo ?? assetRow.stock_logo),
    commodityIcon: getAssetCommodityIcon(assetRow.symbol, assetRow.commodityIcon ?? assetRow.commodity_icon),
    maxProfit: profit1m,
    change5min: "0.00%",
    category: category === "STOCKS" ? "Stocks" : "Options",
    isTradersChoice: false,
    price: basePrice,
    change: 0,
  };
};

const getDesktopChartGridClass = (mode: ChartLayoutMode) => {
  if (mode === 1) return "grid-cols-1";
  if (mode === 2) return "grid-cols-2";
  return "grid-cols-2 grid-rows-2";
};

const LOADING_CANDLESTICKS = [
  { bodyHeight: 20, wickHeight: 44, color: "up" },
  { bodyHeight: 16, wickHeight: 56, color: "down" },
  { bodyHeight: 28, wickHeight: 64, color: "up" },
  { bodyHeight: 18, wickHeight: 52, color: "down" },
  { bodyHeight: 24, wickHeight: 60, color: "up" },
];

const ACTIVE_INDICATORS_STORAGE_KEY = "trading_active_indicators_v1";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const loadStoredActiveIndicators = (): ActiveIndicator[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(ACTIVE_INDICATORS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry) => {
      if (!isPlainObject(entry) || typeof entry.configId !== "string") {
        return [];
      }

      const config = INDICATOR_REGISTRY.find((item) => item.id === entry.configId);
      if (!config || !STANDARD_INDICATOR_IDS.has(config.id)) {
        return [];
      }

      const defaults = buildIndicatorDefaultParams(config);
      const savedParams = isPlainObject(entry.params) ? entry.params : {};

      return [{
        instanceId:
          typeof entry.instanceId === "string" && entry.instanceId.trim().length > 0
            ? entry.instanceId
            : crypto.randomUUID(),
        configId: config.id,
        name:
          typeof entry.name === "string" && entry.name.trim().length > 0
            ? entry.name
            : config.name,
        pane: entry.pane === "overlay" || entry.pane === "separate" ? entry.pane : config.pane,
        params: { ...defaults, ...savedParams },
        visible: typeof entry.visible === "boolean" ? entry.visible : true,
      }];
    });
  } catch {
    return [];
  }
};

const CandlestickLoadingScreen = () => (
  <div className="flex h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_center,#20283a_0%,#171d2d_48%,#111827_100%)] px-6 text-white">
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/[0.08] bg-[#151c2a] shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:h-44 sm:w-44">
        <div className="absolute inset-0 rounded-full border-[3px] border-[#243046] border-t-[#58a6ff] animate-spin" />
        <div className="absolute inset-[12px] rounded-full border border-white/[0.05]" />
        <div className="relative flex h-[76px] items-end gap-2">
          {LOADING_CANDLESTICKS.map((candle, index) => {
            const isUp = candle.color === "up";
            return (
              <div
                key={`loader-candle-${index}`}
                className="relative w-3 animate-pulse"
                style={{
                  height: `${candle.wickHeight}px`,
                  animationDelay: `${index * 140}ms`,
                  animationDuration: "1.2s",
                }}
              >
                <div
                  className={`absolute left-1/2 w-[2px] -translate-x-1/2 rounded-full ${
                    isUp ? "bg-[#12b76a]/80" : "bg-[#ef5a4c]/80"
                  }`}
                  style={{
                    height: `${candle.wickHeight}px`,
                    bottom: 0,
                  }}
                />
                <div
                  className={`absolute left-1/2 w-full -translate-x-1/2 rounded-[3px] ${
                    isUp
                      ? "bg-[linear-gradient(180deg,#1fdd82_0%,#0ea45f_100%)] shadow-[0_0_12px_rgba(18,183,106,0.18)]"
                      : "bg-[linear-gradient(180deg,#ff7669_0%,#e14b3d_100%)] shadow-[0_0_12px_rgba(239,90,76,0.16)]"
                  }`}
                  style={{
                    height: `${candle.bodyHeight}px`,
                    bottom: `${Math.max(4, Math.round((candle.wickHeight - candle.bodyHeight) / 2))}px`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-full border border-white/[0.08] bg-[#131a28]/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b6c3de]">
        Loading candlestick chart...
      </div>
    </div>
  </div>
);

const MobileModuleOverlay = ({
  mobileOverlay,
  setMobileOverlay,
  setSelectedTournament,
  analyticsSignalAsset,
}: MobileModuleOverlayProps) => {
  if (!mobileOverlay) return null;
  return (
    <div className="fixed top-0 left-0 right-0 bottom-[56px] z-[200] bg-[#0a0d14] flex flex-col">
      {mobileOverlay === "account" && <AccountGridOverlay onClose={() => setMobileOverlay(null)} />}
      {mobileOverlay === "tournaments" && (
        <div className="flex flex-col h-full bg-[#0a0d14]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0 bg-[#111518]">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-bold text-[18px]">Tournaments</span>
            </div>
            <button onClick={() => setMobileOverlay(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 relative">
            <TournamentsGridOverlay
              onOpenDetails={(id) => {
                setMobileOverlay(null);
                setSelectedTournament(id);
              }}
            />
          </div>
        </div>
      )}
      {mobileOverlay === "leaderboard" && <MobileLeaderboardOverlay onClose={() => setMobileOverlay(null)} />}
      {mobileOverlay === "analytics_detail" && (
        <AnalyticsGridOverlay activeAsset={analyticsSignalAsset} onClose={() => setMobileOverlay("more")} />
      )}
      {mobileOverlay === "help" && <HelpCenterOverlay onClose={() => setMobileOverlay(null)} />}
      {/* balance/trading history: open account overlay pre-set to that tab */}
      {mobileOverlay === "balance_history" && (
        <AccountGridOverlay initialTab="balance_history" onClose={() => setMobileOverlay(null)} />
      )}
      {mobileOverlay === "trading_history" && (
        <AccountGridOverlay initialTab="trading_history" onClose={() => setMobileOverlay(null)} />
      )}
      {mobileOverlay === "more" && (
        <MobileMoreMenu
          onClose={() => setMobileOverlay(null)}
          onOpenOverlay={(section) => {
            if (section === "analytics") setMobileOverlay("analytics_detail");
            else setMobileOverlay(section);
          }}
        />
      )}
    </div>
  );
};

const getDemoActiveTradesStorageKey = (userId: string) => `demo_active_trades:${userId}`;
const getDemoTradeHistoryStorageKey = (userId: string) => `demo_trade_history:${userId}`;

const readJsonStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const Trade = () => {
  const { profile, user } = useAuth();
  const {
    activeTrades,
    tradeHistory,
    openTrade,
    setCurrentPrice,
    latestSettlement,
    clearLatestSettlement,
    tournamentParticipantId,
    setTournamentParticipantId,
  } = useTrading();
  const navigate = useNavigate();
  const latestChartPriceRef = useRef(0);
  const latestChartMarkerTimeRef = useRef<number | null>(null);
  const latestChartMarkerTimesBySymbolRef = useRef<Record<string, number>>({});
  const latestChartMarkerLogicalBySymbolRef = useRef<Record<string, number>>({});
  const latestChartTimeframesBySymbolRef = useRef<Record<string, number>>({});
  const settlementHideTimersRef = useRef<Record<string, number>>({});
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );
  const [chartLayoutMode, setChartLayoutMode] = useState<ChartLayoutMode>(() => loadChartLayoutMode());

  const [openTabs, setOpenTabs] = useState<TradeTabAsset[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [selectedAssetSaved, setSelectedAssetSaved] = useState<TradeTabAsset | null>(null);
  const [liveChartPrices, setLiveChartPrices] = useState<Record<string, number>>({});
  const { getAsset } = useDynamicAssets();

  const dynamicSelectedAsset = getAsset(activeTabId);
  const selectedAsset = dynamicSelectedAsset ? {
    ...selectedAssetSaved,
    type: dynamicSelectedAsset.type,
    name: dynamicSelectedAsset.name,
    flags: dynamicSelectedAsset.flags,
    stockLogo: dynamicSelectedAsset.stockLogo,
    commodityIcon: dynamicSelectedAsset.commodityIcon,
    price: dynamicSelectedAsset.price,
    change: dynamicSelectedAsset.change24h,
    maxProfit: dynamicSelectedAsset.maxProfit,
  } : selectedAssetSaved;

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    const fallbackAsset = buildTradeTabAsset(DEFAULT_TRADE_ASSET_ROW);

    const resolveActiveAssetRows = async () => {
      const query = supabase
        .from("assets_config")
        .select("*")
        .eq("status", "active")
        .order("symbol")
        .then(({ data, error }) => {
          if (error) throw error;
          return ((data ?? []) as TradeAssetConfigRow[]).filter((assetRow) => String(assetRow.symbol ?? "").trim());
        });

      const timeout = new Promise<TradeAssetConfigRow[]>((resolve) => {
        timeoutId = window.setTimeout(() => resolve([DEFAULT_TRADE_ASSET_ROW]), TRADE_ASSET_BOOT_TIMEOUT_MS);
      });

      return Promise.race([query, timeout]);
    };

    const applyInitialAssets = (assetRows: TradeAssetConfigRow[]) => {
      const availableRows = assetRows.length ? assetRows : [DEFAULT_TRADE_ASSET_ROW];
      const savedTabsRaw = localStorage.getItem("trading_open_tabs");
      const savedActiveId = localStorage.getItem("trading_active_tab");
      let initialTabs: TradeTabAsset[] = [];
      let initialActive: TradeTabAsset | null = null;

      if (savedTabsRaw) {
        try {
          const parsed = JSON.parse(savedTabsRaw) as Array<{ symbol?: string }>;
          initialTabs = parsed
            .map((tab) => availableRows.find((dbA) => dbA.symbol === tab.symbol))
            .filter(Boolean)
            .map((assetRow) => buildTradeTabAsset(assetRow as TradeAssetConfigRow));
          if (savedActiveId) initialActive = initialTabs.find((tab) => tab.symbol === savedActiveId) ?? null;
        } catch {}
      }

      if (initialTabs.length === 0) {
        initialTabs = [buildTradeTabAsset(availableRows[0] ?? DEFAULT_TRADE_ASSET_ROW)];
      }
      if (!initialActive && initialTabs.length > 0) initialActive = initialTabs[0];

      const resolvedActive = initialActive ?? fallbackAsset;
      setOpenTabs(initialTabs.length ? initialTabs : [fallbackAsset]);
      setSelectedAssetSaved(resolvedActive);
      setActiveTabId(resolvedActive.symbol);
    };

    async function initAssets() {
      try {
        const assetRows = await resolveActiveAssetRows();
        if (!cancelled) {
          applyInitialAssets(assetRows);
        }
      } catch (error) {
        console.warn("Failed to load active assets. Using fallback trade desk asset.", error);
        if (!cancelled) {
          applyInitialAssets([DEFAULT_TRADE_ASSET_ROW]);
        }
      } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
      }
    }

    void initAssets();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => { if (openTabs.length > 0) localStorage.setItem("trading_open_tabs", JSON.stringify(openTabs)); }, [openTabs]);
  useEffect(() => { if (activeTabId) localStorage.setItem("trading_active_tab", activeTabId); }, [activeTabId]);

  useEffect(() => {
    latestChartMarkerTimeRef.current = activeTabId
      ? latestChartMarkerTimesBySymbolRef.current[activeTabId] ?? null
      : null;
  }, [activeTabId]);

  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showIndicatorsPanel, setShowIndicatorsPanel] = useState(false);
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);
  const [showDrawingsPanel, setShowDrawingsPanel] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicator[]>(() => loadStoredActiveIndicators());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<ProfileTab>("personal");
  const [depositGuideReason, setDepositGuideReason] = useState<DepositGuideReason | null>(null);
  const [showRealAccountWelcome, setShowRealAccountWelcome] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceModule>(null);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [tournamentSandboxBalance, setTournamentSandboxBalance] = useState(0);
  const [accountType, setAccountType] = useState<AccountType>("live");
  const [demoBalance, setDemoBalance] = useState(DEFAULT_DEMO_BALANCE);
  const [demoActiveTrades, setDemoActiveTrades] = useState<ActiveTrade[]>([]);
  const [demoTradeHistory, setDemoTradeHistory] = useState<TradeHistoryEntry[]>([]);
  const [chartSettlementAnnouncements, setChartSettlementAnnouncements] = useState<Record<string, ChartSettlementAnnouncement | null>>({});
  const [mobileOverlay, setMobileOverlayRaw] = useState<string | null>(null);
  const setMobileOverlay = (v: string | null) => setMobileOverlayRaw(v);

  const balance = getEffectiveLiveBalance(profile);
  const isNewUser = useMemo(() => isNewUserProfile(profile), [profile]);

  useEffect(() => {
    if (!user?.id) {
      setDemoBalance(DEFAULT_DEMO_BALANCE);
      setDemoActiveTrades([]);
      setDemoTradeHistory([]);
      return;
    }

    setDemoBalance(readDemoBalanceStorage(user.id));
    setDemoActiveTrades(
      readJsonStorage<ActiveTrade[]>(getDemoActiveTradesStorageKey(user.id), []).map((trade) => {
        const elapsedSeconds = (Date.now() - new Date(trade.opened_at).getTime()) / 1000;
        return {
          ...trade,
          timeLeft: Math.max(0, trade.expiry_seconds - elapsedSeconds),
        };
      }),
    );
    setDemoTradeHistory(
      filterRetainedTradeHistory(
        readJsonStorage<TradeHistoryEntry[]>(getDemoTradeHistoryStorageKey(user.id), []),
      ).slice(0, 50),
    );
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    writeDemoBalanceStorage(user.id, demoBalance);
  }, [demoBalance, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    localStorage.setItem(getDemoActiveTradesStorageKey(user.id), JSON.stringify(demoActiveTrades));
  }, [demoActiveTrades, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    localStorage.setItem(
      getDemoTradeHistoryStorageKey(user.id),
      JSON.stringify(filterRetainedTradeHistory(demoTradeHistory).slice(0, 50)),
    );
  }, [demoTradeHistory, user?.id]);

  useEffect(() => {
    if (demoTradeHistory.length === 0) return;

    const pruneDemoTradeHistory = () => {
      setDemoTradeHistory((current) => {
        const next = filterRetainedTradeHistory(current).slice(0, 50);
        return next.length === current.length ? current : next;
      });
    };

    pruneDemoTradeHistory();

    const timerId = window.setInterval(pruneDemoTradeHistory, 60 * 1000);
    return () => window.clearInterval(timerId);
  }, [demoTradeHistory.length]);

  const showChartSettlementAnnouncement = useCallback((announcement: ChartSettlementAnnouncement) => {
    setChartSettlementAnnouncements((current) => ({
      ...current,
      [announcement.assetSymbol]: announcement,
    }));

    const existingTimer = settlementHideTimersRef.current[announcement.assetSymbol];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    settlementHideTimersRef.current[announcement.assetSymbol] = window.setTimeout(() => {
      setChartSettlementAnnouncements((current) => {
        if (current[announcement.assetSymbol]?.id !== announcement.id) {
          return current;
        }

        const nextState = { ...current };
        delete nextState[announcement.assetSymbol];
        return nextState;
      });

      delete settlementHideTimersRef.current[announcement.assetSymbol];
    }, 3400);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(settlementHideTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  useEffect(() => {
    if (!latestSettlement) {
      return;
    }

    showChartSettlementAnnouncement({
      id: latestSettlement.id,
      assetSymbol: latestSettlement.asset_symbol,
      direction: latestSettlement.direction,
      amount: latestSettlement.amount,
      expirySeconds: latestSettlement.expiry_seconds,
      profit: latestSettlement.profit,
      status: latestSettlement.status,
    });
    clearLatestSettlement();
  }, [clearLatestSettlement, latestSettlement, showChartSettlementAnnouncement]);

  useEffect(() => {
    if (demoActiveTrades.length === 0) return;

    const timerId = window.setInterval(() => {
      const now = Date.now();
      const settledTrades: TradeHistoryEntry[] = [];
      let creditedAmount = 0;
      const canResolveDemoTrades = latestChartPriceRef.current > 0;

      setDemoActiveTrades((currentTrades) =>
        currentTrades.reduce<ActiveTrade[]>((nextTrades, trade) => {
          const elapsedSeconds = (now - new Date(trade.opened_at).getTime()) / 1000;
          const timeLeft = Math.max(0, trade.expiry_seconds - elapsedSeconds);

          if (timeLeft > 0) {
            nextTrades.push({ ...trade, timeLeft });
            return nextTrades;
          }

          if (!canResolveDemoTrades) {
            nextTrades.push({ ...trade, timeLeft: 0 });
            return nextTrades;
          }

          const exitPrice = latestChartPriceRef.current > 0 ? latestChartPriceRef.current : trade.entry_price;
          const won =
            (trade.direction === "higher" && exitPrice > trade.entry_price) ||
            (trade.direction === "lower" && exitPrice < trade.entry_price);
          const profit = won ? trade.amount * trade.payout_rate : -trade.amount;

          if (won) {
            creditedAmount += trade.amount + trade.amount * trade.payout_rate;
          }

          settledTrades.push({
            id: trade.id,
            user_id: user?.id ?? "demo",
            asset_symbol: trade.asset_symbol,
            direction: trade.direction,
            amount: trade.amount,
            entry_price: trade.entry_price,
            exit_price: exitPrice,
            expiry_seconds: trade.expiry_seconds,
            payout_rate: trade.payout_rate,
            profit,
            status: won ? "won" : "lost",
            opened_at: trade.opened_at,
            closed_at: new Date().toISOString(),
          });

          return nextTrades;
        }, []),
      );

      if (settledTrades.length > 0) {
        const latestSettledTrade = settledTrades[settledTrades.length - 1];
        void playTradeCloseSound();
        if (creditedAmount > 0) {
          setDemoBalance((current) => current + creditedAmount);
        }
        setDemoTradeHistory((current) =>
          filterRetainedTradeHistory([...settledTrades.reverse(), ...current]).slice(0, 50),
        );
        showChartSettlementAnnouncement({
          id: latestSettledTrade.id,
          assetSymbol: latestSettledTrade.asset_symbol,
          direction: latestSettledTrade.direction,
          amount: latestSettledTrade.amount,
          expirySeconds: latestSettledTrade.expiry_seconds,
          profit: latestSettledTrade.profit ?? 0,
          status: latestSettledTrade.status === "won" ? "won" : "lost",
        });
      }
    }, 100);

    return () => window.clearInterval(timerId);
  }, [demoActiveTrades.length, showChartSettlementAnnouncement, user?.id]);

  useEffect(() => {
    if (!user?.id || !isNewUser || hasSeenNewUserPrompt(user.id) || showRealAccountWelcome) {
      return;
    }

    if (selectedTournament || showAssetSelector || mobileOverlay || isProfileOpen) {
      return;
    }

    setShowRealAccountWelcome(true);
  }, [
    isNewUser,
    isProfileOpen,
    mobileOverlay,
    selectedTournament,
    showAssetSelector,
    showRealAccountWelcome,
    user?.id,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleViewportChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktopViewport(event.matches);
    };

    handleViewportChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () => mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(CHART_LAYOUT_STORAGE_KEY, String(chartLayoutMode));
    window.dispatchEvent(
      new CustomEvent(TRADE_CHART_LAYOUT_MODE_CHANGED_EVENT, { detail: { mode: chartLayoutMode } }),
    );
  }, [chartLayoutMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleChartLayoutSet = (event: Event) => {
      const mode = (event as CustomEvent<{ mode?: number }>).detail?.mode;
      if (isChartLayoutMode(mode)) {
        setChartLayoutMode(mode);
      }
    };

    window.addEventListener(TRADE_CHART_LAYOUT_SET_EVENT, handleChartLayoutSet as EventListener);
    return () =>
      window.removeEventListener(TRADE_CHART_LAYOUT_SET_EVENT, handleChartLayoutSet as EventListener);
  }, []);

  useEffect(() => {
    const handleDepositGuideRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{ reason?: DepositGuideReason }>;
      const reason = customEvent.detail?.reason;
      if (reason === "deposit_required" || reason === "insufficient_balance") {
        setDepositGuideReason(reason);
      }
    };

    window.addEventListener("trade_deposit_guide_requested", handleDepositGuideRequest as EventListener);
    return () => window.removeEventListener("trade_deposit_guide_requested", handleDepositGuideRequest as EventListener);
  }, []);

  useEffect(() => {
    if (accountType !== "live") {
      setDepositGuideReason(null);
    }
  }, [accountType]);

  useEffect(() => {
    if (accountType !== "tournament" && tournamentParticipantId) {
      setTournamentParticipantId(null);
    }
  }, [accountType, setTournamentParticipantId, tournamentParticipantId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(ACTIVE_INDICATORS_STORAGE_KEY, JSON.stringify(activeIndicators));
  }, [activeIndicators]);

  const handleSelectTab = (tabSymbol: string) => {
    setActiveTabId(tabSymbol);
    const existing = openTabs.find(t => t.symbol === tabSymbol);
    if (existing) setSelectedAssetSaved(existing);
  };

  const handleRemoveTab = (tabSymbol: string) => {
    setOpenTabs(prev => {
      const remaining = prev.filter(t => t.symbol !== tabSymbol);
      if (remaining.length === 0) return prev;
      if (activeTabId === tabSymbol) {
        const next = remaining[remaining.length - 1];
        setActiveTabId(next.symbol);
        setSelectedAssetSaved(next);
      }
      return remaining;
    });
  };

  const handleSelectAsset = (asset: AssetSelectorAsset) => {
    const globalAsset: TradeTabAsset = {
      ...buildTradeTabAsset({
        symbol: asset.symbol,
        name: asset.name,
        category: asset.category,
        payout_pct: asset.profit1m,
        baseCountry: asset.baseCountry,
        quoteCountry: asset.quoteCountry,
        stockLogo: asset.stockLogo,
        commodityIcon: asset.commodityIcon,
      }),
      change5min: `${asset.change24h.toFixed(2)}%`,
      price: asset.price,
      change: asset.change24h,
    };
    setOpenTabs(prev => !prev.find(t => t.symbol === globalAsset.symbol) ? [...prev, globalAsset] : prev);
    setSelectedAssetSaved(globalAsset);
    setActiveTabId(globalAsset.symbol);
    setShowAssetSelector(false);
    setMobileOverlay(null);
  };

  const handleEnterTournament = async (tournamentId: string) => {
    if (!profile) return;
    const { data: pRow } = await supabase.from('tournament_participants').select('id, current_balance')
      .eq('tournament_id', tournamentId).eq('user_id', profile.id).single();
    if (pRow) { setTournamentParticipantId(pRow.id); setTournamentSandboxBalance(pRow.current_balance); }
    setAccountType("tournament");
    setSelectedTournament(null);
    setActiveWorkspace(null);
    setMobileOverlay(null);
  };

  const handleOpenProfile = (tab: ProfileTab = "personal") => {
    setProfileInitialTab(tab);
    setIsProfileOpen(true);
  };

  const handleSwitchAccount = (nextType: AccountType) => {
    if (nextType === "tournament" && !tournamentParticipantId) {
      if (isDesktopViewport) {
        setActiveWorkspace("tournaments");
      } else {
        setMobileOverlay("tournaments");
      }
      return;
    }

    setAccountType(nextType);
  };

  const handleChartPriceUpdate = (
    symbol: string,
    price: number,
    markerTime?: number,
    timeframeSeconds?: number,
    markerLogical?: number,
  ) => {
    setLiveChartPrices((prev) => (prev[symbol] === price ? prev : { ...prev, [symbol]: price }));

    if (typeof timeframeSeconds === "number" && Number.isFinite(timeframeSeconds)) {
      latestChartTimeframesBySymbolRef.current[symbol] = timeframeSeconds;
    }

    if (typeof markerLogical === "number" && Number.isFinite(markerLogical)) {
      latestChartMarkerLogicalBySymbolRef.current[symbol] = markerLogical;
    }

    if (symbol !== activeTabId) return;

    latestChartPriceRef.current = price;
    if (typeof markerTime === "number" && Number.isFinite(markerTime)) {
      latestChartMarkerTimeRef.current = markerTime;
      latestChartMarkerTimesBySymbolRef.current[symbol] = markerTime;
    }
    setCurrentPrice(price, markerTime);
  };

  const handleLiveTradeFromChart = useMemo(
    () => async (
      assetSymbol: string,
      direction: "higher" | "lower",
      amount: number,
      entryPrice: number,
      expirySeconds: number,
      payoutRate?: number,
    ) => {
      const timeframeSeconds = latestChartTimeframesBySymbolRef.current[assetSymbol] ?? 60;
      const clickTimestampSec = Math.floor(Date.now() / 1000);
      const candleStartSec = getCandleStartTime(clickTimestampSec, timeframeSeconds);
      const liveChartMarkerTime =
        latestChartMarkerTimesBySymbolRef.current[assetSymbol] ?? latestChartMarkerTimeRef.current;
      const markerTimeOverride =
        timeframeSeconds > 0
          ? candleStartSec
          : liveChartMarkerTime ?? clickTimestampSec;

      return openTrade(
        assetSymbol,
        direction,
        amount,
        entryPrice,
        expirySeconds,
        payoutRate,
        markerTimeOverride,
        undefined,
        timeframeSeconds,
      );
    },
    [openTrade],
  );

  useEffect(() => {
    if (!selectedAsset) return;

    const currentAssetPrice = liveChartPrices[selectedAsset.symbol] ?? selectedAsset.price;
    if (typeof currentAssetPrice === "number" && Number.isFinite(currentAssetPrice)) {
      latestChartPriceRef.current = currentAssetPrice;
      setCurrentPrice(currentAssetPrice);
    }
  }, [activeTabId, liveChartPrices, selectedAsset, setCurrentPrice]);

  const handleDemoBalanceUpdate = (value: number) => {
    const nextValue = Number(value);
    setDemoBalance(Number.isFinite(nextValue) && nextValue > 0 ? nextValue : DEFAULT_DEMO_BALANCE);
  };

  const handleOpenDemoTrade = async (
    assetSymbol: string,
    direction: "higher" | "lower",
    amount: number,
    entryPrice: number,
    expirySeconds: number,
    payoutRate: number = 0.86,
    markerTimeOverride?: number | null,
    markerLogicalOverride?: number | null,
  ) => {
    if (amount <= 0 || amount > demoBalance) {
      return false;
    }

    const openedAt = new Date().toISOString();
    const currentEntryPrice = latestChartPriceRef.current > 0 ? latestChartPriceRef.current : entryPrice;
    const timeframeSeconds = latestChartTimeframesBySymbolRef.current[assetSymbol] ?? 60;
    const clickTimestampSec = Math.floor(Date.now() / 1000);
    const candleStartSec = getCandleStartTime(clickTimestampSec, timeframeSeconds);
    const activeMarkerTime =
      latestChartMarkerTimesBySymbolRef.current[assetSymbol] ?? latestChartMarkerTimeRef.current;
    const markerTime = resolveFreshTradeMarkerTime(
      markerTimeOverride === undefined
        ? timeframeSeconds > 0
          ? candleStartSec
          : activeMarkerTime ?? clickTimestampSec
        : markerTimeOverride,
      openedAt,
      Math.max(10, Math.floor(timeframeSeconds)),
    );

    setDemoBalance((current) => current - amount);
    setDemoActiveTrades((current) => [
      {
        id: `demo_${crypto.randomUUID()}`,
        asset_symbol: assetSymbol,
        direction,
        amount,
        entry_price: currentEntryPrice,
        marker_time: markerTime,
        expiry_seconds: expirySeconds,
        payout_rate: payoutRate,
        opened_at: openedAt,
        timeLeft: expirySeconds,
        tournament_participant_id: null,
      },
      ...current,
    ]);

    void playTradeOpenSound();

    return true;
  };

  const closeNewUserWelcome = () => {
    if (user?.id) {
      markNewUserPromptSeen(user.id);
    }
    setShowRealAccountWelcome(false);
  };

  const handleAddIndicator = (configId: string) => {
    const reg = INDICATOR_REGISTRY.find(c => c.id === configId);
    if (!reg || !STANDARD_INDICATOR_IDS.has(configId)) return;
    const defaults = buildIndicatorDefaultParams(reg);
    setActiveIndicators(prev => [...prev, { instanceId: crypto.randomUUID(), configId, name: reg.name, pane: reg.pane, params: defaults, visible: true }]);
    setEditingIndicatorId(null);
    setShowIndicatorsPanel(false);
  };

  const handleUpdateIndicator = (instanceId: string, updates: Partial<ActiveIndicator>) =>
    setActiveIndicators(prev => prev.map(ind => ind.instanceId === instanceId ? { ...ind, ...updates } : ind));

  const handleRemoveIndicator = (instanceId: string) =>
    setActiveIndicators(prev => prev.filter(ind => ind.instanceId !== instanceId));

  const handleCloseIndicatorsPanel = useCallback(() => {
    setShowIndicatorsPanel(false);
    setEditingIndicatorId(null);
  }, []);

  const handleToggleIndicatorsPanel = useCallback(() => {
    setShowIndicatorsPanel((current) => {
      const next = !current;
      if (!next) {
        setEditingIndicatorId(null);
      }
      return next;
    });
    setShowDrawingsPanel(false);
  }, []);

  const handleToggleDrawingsPanel = useCallback(() => {
    setShowDrawingsPanel((current) => !current);
    setShowIndicatorsPanel(false);
    setEditingIndicatorId(null);
  }, []);

  const handleOpenIndicatorSettings = useCallback((instanceId: string) => {
    setEditingIndicatorId(instanceId);
    setShowIndicatorsPanel(true);
    setShowDrawingsPanel(false);
  }, []);

  const standardActiveIndicators = useMemo(
    () => activeIndicators.filter((indicator) => STANDARD_INDICATOR_IDS.has(indicator.configId)),
    [activeIndicators],
  );

  const liveActiveTrades = useMemo(
    () => activeTrades.filter((trade) => !trade.tournament_participant_id),
    [activeTrades],
  );
  const tournamentActiveTrades = useMemo(
    () =>
      tournamentParticipantId
        ? activeTrades.filter((trade) => trade.tournament_participant_id === tournamentParticipantId)
        : [],
    [activeTrades, tournamentParticipantId],
  );
  const liveTradeHistory = useMemo(
    () => tradeHistory.filter((trade) => !trade.tournament_participant_id),
    [tradeHistory],
  );
  const tournamentTradeHistory = useMemo(
    () =>
      tournamentParticipantId
        ? tradeHistory.filter((trade) => trade.tournament_participant_id === tournamentParticipantId)
        : [],
    [tradeHistory, tournamentParticipantId],
  );
  const visibleActiveTrades = accountType === "demo" ? demoActiveTrades : accountType === "tournament" ? tournamentActiveTrades : liveActiveTrades;
  const visibleTradeHistory =
    accountType === "demo"
      ? demoTradeHistory
      : accountType === "tournament"
        ? tournamentTradeHistory
        : liveTradeHistory;
  const orderedChartTabs = useMemo(() => {
    const activeTab = openTabs.find((tab) => tab.symbol === activeTabId);
    const inactiveTabs = openTabs.filter((tab) => tab.symbol !== activeTabId);
    return activeTab ? [activeTab, ...inactiveTabs] : openTabs;
  }, [activeTabId, openTabs]);
  const desktopChartAssets = useMemo(
    () =>
      orderedChartTabs.slice(0, chartLayoutMode).map((tab) => {
        const dynamicTab = getAsset(tab.symbol);
        const livePrice = liveChartPrices[tab.symbol];

        if (!dynamicTab) {
          return {
            ...tab,
            price: livePrice ?? tab.price,
          };
        }

        return {
          ...tab,
          type: dynamicTab.type,
          name: dynamicTab.name,
          flags: dynamicTab.flags,
          stockLogo: dynamicTab.stockLogo,
          commodityIcon: dynamicTab.commodityIcon,
          price: livePrice ?? dynamicTab.price,
          change: dynamicTab.change24h,
          maxProfit: dynamicTab.maxProfit,
        };
      }),
    [chartLayoutMode, getAsset, liveChartPrices, orderedChartTabs],
  );
  const emptyDesktopChartSlots = Math.max(0, chartLayoutMode - desktopChartAssets.length);
  const analyticsSignalAsset = useMemo<AnalyticsSignalAsset | undefined>(() => {
    if (!selectedAsset) return undefined;

    return {
      symbol: selectedAsset.symbol,
      name: selectedAsset.name,
      basePrice: selectedAsset.basePrice,
      price: liveChartPrices[selectedAsset.symbol] ?? selectedAsset.price,
      category: selectedAsset.category,
      maxProfit: selectedAsset.maxProfit,
    };
  }, [
    liveChartPrices,
    selectedAsset?.basePrice,
    selectedAsset?.category,
    selectedAsset?.maxProfit,
    selectedAsset?.name,
    selectedAsset?.price,
    selectedAsset?.symbol,
  ]);

  useEffect(() => {
    if (accountType !== "tournament" || !tournamentParticipantId) {
      return;
    }

    let cancelled = false;

    const loadTournamentBalance = async () => {
      const { data } = await supabase
        .from("tournament_participants")
        .select("current_balance")
        .eq("id", tournamentParticipantId)
        .maybeSingle();

      if (!cancelled && data) {
        setTournamentSandboxBalance(data.current_balance);
      }
    };

    void loadTournamentBalance();

    return () => {
      cancelled = true;
    };
  }, [
    accountType,
    tournamentActiveTrades.length,
    tournamentParticipantId,
    tournamentTradeHistory.length,
  ]);

  if (!selectedAsset) {
    return <CandlestickLoadingScreen />;
  }

  const openDepositPage = () => {
    setDepositGuideReason(null);
    setAccountType("live");
    navigate("/deposit");
  };

  const openWithdrawPage = () => {
    setAccountType("live");
    navigate("/withdraw");
  };

  const isFullScreen = ["account", "more", "join"].includes(activeWorkspace || "");
  const currentBalance = accountType === "tournament" ? tournamentSandboxBalance : balance;
  const tourEnabled =
    !mobileOverlay &&
    !selectedTournament &&
    !showAssetSelector &&
    !showIndicatorsPanel &&
    !showDrawingsPanel &&
    !isProfileOpen &&
    !showMobileHistory &&
    !showRealAccountWelcome &&
    !["account", "tournaments", "more", "join", "help"].includes(activeWorkspace || "");

  const isChartNavActive =
    !mobileOverlay &&
    !selectedTournament &&
    !isProfileOpen &&
    !showAssetSelector;
  const isHelpNavActive = mobileOverlay === "help";
  const isAccountNavActive = mobileOverlay === "account" || mobileOverlay === "balance_history" || mobileOverlay === "trading_history";
  const isTournamentsNavActive = mobileOverlay === "tournaments" || Boolean(selectedTournament);
  const isMoreNavActive = ["more", "analytics_detail", "leaderboard"].includes(mobileOverlay ?? "");
  const getMobileNavButtonClass = (isActive: boolean) =>
    `group relative flex h-full flex-1 items-center justify-center rounded-[14px] transition-all ${
      isActive ? "bg-white/[0.05]" : "bg-transparent"
    }`;
  const getMobileNavIconClass = (isActive: boolean) =>
    `flex h-9 w-9 items-center justify-center rounded-[12px] border transition-all ${
      isActive
        ? "border-[#63a5ff]/45 bg-[linear-gradient(180deg,rgba(37,86,153,0.98)_0%,rgba(20,49,88,0.98)_100%)] text-white shadow-[0_8px_18px_rgba(24,78,149,0.36)]"
        : "border-white/[0.08] bg-white/[0.045] text-[#c5cfdf] group-hover:border-white/[0.16] group-hover:bg-white/[0.08] group-hover:text-white"
    }`;

  return (
    <ProfileTourProvider>
      <div className="trading-terminal h-[100dvh] flex flex-col overflow-hidden" style={{ background: "var(--trading-workspace-bg)" }}>
        <GuidedTour enabled={tourEnabled} />
          <TradingHeader balance={currentBalance} demoBalance={demoBalance} accountType={accountType}
          onSwitchAccount={handleSwitchAccount} activeTabId={activeTabId} onSelectTab={handleSelectTab}
          openTabs={openTabs} onRemoveTab={handleRemoveTab} onAddAssetClick={() => setShowAssetSelector(true)}
          onOpenDeposit={openDepositPage}
          onOpenWithdrawal={openWithdrawPage}
          onOpenProfile={handleOpenProfile}
          onUpdateDemoBalance={handleDemoBalanceUpdate}
          onResetDemoBalance={() => handleDemoBalanceUpdate(DEFAULT_DEMO_BALANCE)}
          onOpenSettings={() => handleOpenProfile("settings")} onOpenHistory={() => {}}
          highlightDepositButton={Boolean(depositGuideReason)} />

        <div className="flex-1 flex overflow-hidden min-h-0" style={{ background: "var(--trading-workspace-bg)" }}>
          {/* Left sidebar — desktop only */}
          {isDesktopViewport && (
          <div className="shrink-0">
            <NavigationSidebar activeWorkspace={activeWorkspace} onSelectWorkspace={setActiveWorkspace} />
          </div>
          )}

          {activeWorkspace && !isFullScreen && (
            <DynamicWorkspace
              activeWorkspace={activeWorkspace}
              onClose={() => setActiveWorkspace(null)}
              onOpenTournament={setSelectedTournament}
              onSelectWorkspace={setActiveWorkspace}
            />
          )}

          {/* Desktop full-screen workspace overlays */}
          {activeWorkspace === "account" ? (
            <div className="flex-1 w-full h-full relative z-30" style={{ background: "var(--trading-workspace-panel-bg)" }}><AccountGridOverlay onClose={() => setActiveWorkspace(null)} /></div>
          ) : activeWorkspace === "more" ? (
            <div className="flex-1 w-full h-full relative z-30" style={{ background: "var(--trading-workspace-panel-bg)" }}>
              <AnalyticsGridOverlay activeAsset={analyticsSignalAsset} onClose={() => setActiveWorkspace(null)} />
            </div>
          ) : activeWorkspace === "join" ? (
            <div className="flex-1 w-full h-full relative z-30" style={{ background: "var(--trading-workspace-bg)" }}>
              <WorkspaceReferral onSelectWorkspace={setActiveWorkspace} />
            </div>
          ) : (
            <>
              {/* ── DESKTOP & TABLET: side-by-side chart + panel ── */}
              {isDesktopViewport ? (
              <div className="flex flex-1 overflow-hidden min-h-0">
                <div id="tour-chart" className="flex-1 flex flex-col relative min-w-0" style={{ background: "var(--trading-workspace-bg)" }}>
                  <div>
                    <AssetInfo asset={selectedAsset} onSelectAsset={() => {}} onOpenSelector={() => setShowAssetSelector(true)}
                      openTabs={openTabs} activeTabId={activeTabId} onSelectTab={handleSelectTab}
                      onRemoveTab={handleRemoveTab} onAddAssetClick={() => setShowAssetSelector(true)}
                      activeTrades={visibleActiveTrades} livePrices={liveChartPrices} />
                  </div>
                  <div
                    className={`grid flex-1 min-h-0 gap-[1px] ${getDesktopChartGridClass(chartLayoutMode)}`}
                    style={{ background: "var(--trading-chart-divider-bg)" }}
                  >
                    {desktopChartAssets.map((chartAsset, index) => {
                      const isPrimaryPane = index === 0;
                      const isActivePane = chartAsset.symbol === activeTabId;

                      return (
                        <div
                          key={chartAsset.symbol}
                          className={`relative flex min-h-0 flex-col overflow-hidden ${
                            chartLayoutMode > 1 ? "border border-transparent" : ""
                          } ${isActivePane && chartLayoutMode > 1 ? "border-[#4f86c8]/55 shadow-[inset_0_0_0_1px_rgba(104,166,255,0.18)]" : ""}`}
                          style={{ background: "var(--trading-chart-pane-bg)" }}
                        >
                          {chartLayoutMode > 1 && (
                            <button
                              type="button"
                              onClick={() => handleSelectTab(chartAsset.symbol)}
                              className={`absolute left-3 top-3 z-[80] inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] shadow-[0_10px_20px_rgba(0,0,0,0.28)] transition-colors ${
                                isPrimaryPane
                                  ? "border-[#5b84b7]/55 bg-[#153356]/92 text-[#d7ebff]"
                                  : "border-white/10 bg-[#101827]/92 text-slate-200 hover:bg-[#172133]"
                              }`}
                            >
                              <span className="max-w-[92px] truncate">{chartAsset.symbol}</span>
                              <span className={`text-[10px] ${isPrimaryPane ? "text-[#a8c4ea]" : "text-slate-400"}`}>FOCUS</span>
                            </button>
                          )}

                          <TradingChart
                            asset={chartAsset}
                            onPriceUpdate={(price, markerTime, timeframeSeconds, markerLogical) =>
                              handleChartPriceUpdate(
                                chartAsset.symbol,
                                price,
                                markerTime,
                                timeframeSeconds,
                                markerLogical,
                              )
                            }
                            activeIndicators={isPrimaryPane ? standardActiveIndicators : []}
                            activeTrades={visibleActiveTrades}
                            onToggleIndicatorsPanel={handleToggleIndicatorsPanel}
                            onToggleDrawingsPanel={handleToggleDrawingsPanel}
                            onRemoveIndicator={isPrimaryPane ? handleRemoveIndicator : undefined}
                            onUpdateIndicator={isPrimaryPane ? handleUpdateIndicator : undefined}
                            onOpenIndicatorSettings={isPrimaryPane ? handleOpenIndicatorSettings : undefined}
                            overlayUiSuppressed={showIndicatorsPanel || showDrawingsPanel}
                            compactPane={!isPrimaryPane}
                            miniOverlay={chartLayoutMode > 1 && isPrimaryPane}
                            settlementAnnouncement={chartSettlementAnnouncements[chartAsset.symbol] ?? null}
                          />
                        </div>
                      );
                    })}

                    {Array.from({ length: emptyDesktopChartSlots }).map((_, index) => (
                      <button
                        key={`empty-pane-${index}`}
                        type="button"
                        onClick={() => setShowAssetSelector(true)}
                        className="group flex min-h-0 flex-col items-center justify-center gap-3 border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(13,20,31,0.96)_0%,rgba(9,15,24,0.98)_100%)] text-slate-400 transition-colors hover:border-[#4f86c8]/50 hover:text-slate-200"
                      >
                        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[20px] text-white/85">
                          +
                        </span>
                        <div className="space-y-1 text-center">
                          <div className="text-[12px] font-black uppercase tracking-[0.12em] text-slate-200">
                            Add asset
                          </div>
                          <div className="text-[11px] font-medium text-slate-500">
                            Open another pair for split view
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {showIndicatorsPanel && (
                    <IndicatorsPanel activeIndicators={standardActiveIndicators} onAddIndicator={handleAddIndicator}
                      onUpdateIndicator={handleUpdateIndicator} onRemoveIndicator={handleRemoveIndicator}
                      editingIndicatorId={editingIndicatorId}
                      onEditingIndicatorChange={setEditingIndicatorId}
                      onClose={handleCloseIndicatorsPanel} />
                  )}
                  {showDrawingsPanel && (
                    <div className="absolute top-0 left-[60px] bottom-0 z-[95]">
                      <DrawingsPanel onClose={() => setShowDrawingsPanel(false)} />
                    </div>
                  )}
                </div>
                <div id="tour-trade-panel" className="flex flex-col shrink-0 z-20 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                  <TradingPanel asset={selectedAsset} balance={currentBalance} demoBalance={demoBalance}
                    accountType={accountType} onDemoBalanceChange={setDemoBalance} onTrade={handleLiveTradeFromChart} onDemoTrade={handleOpenDemoTrade}
                    activeTradesOverride={visibleActiveTrades} tradeHistoryOverride={visibleTradeHistory}
                    onOpenAssetSelector={() => setShowAssetSelector(true)}
                    onOpenMobileHistory={() => setShowMobileHistory(true)} />
                </div>
              </div>
              ) : (
              <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--trading-workspace-bg)" }}>
                {/* ── MOBILE: Chart + Trading Panel combined in a fixed flex layout ── */}
                {/* Chart block — dynamically fills remaining vertical space */}
                <div id="tour-chart" className="flex-1 min-h-0 relative flex flex-col pb-[250px] sm:pb-[262px]">
                  {/* Total portfolio bar matches reference immediately below tabs */}
                  <div className="flex items-center justify-between px-4 shrink-0" style={{ height: "28px", borderBottom: "1px solid var(--trading-border-color)", background: "var(--trading-workspace-bg)" }}>
                    <span style={{ fontSize: "11px", color: "#7f8b99" }}>
                      {accountType === "tournament" ? "Tournament positions" : "Total portfolio"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMobileHistory((current) => !current)}
                      style={{ fontSize: "11px", color: visibleActiveTrades.length > 0 ? "#8ab4ff" : "#7f8b99" }}
                    >
                      {visibleActiveTrades.length > 0
                        ? `${visibleActiveTrades.length} open ${showMobileHistory ? "▴" : "▾"}`
                        : "No positions"}
                    </button>
                  </div>

                  <div className="flex-1 relative w-full flex flex-col min-h-0">
                    <TradingChart asset={selectedAsset} onPriceUpdate={(price, markerTime, timeframeSeconds, markerLogical) => handleChartPriceUpdate(selectedAsset.symbol, price, markerTime, timeframeSeconds, markerLogical)} activeIndicators={standardActiveIndicators} activeTrades={visibleActiveTrades}
                      onToggleIndicatorsPanel={handleToggleIndicatorsPanel}
                      onToggleDrawingsPanel={handleToggleDrawingsPanel}
                      onUpdateIndicator={handleUpdateIndicator}
                      onRemoveIndicator={handleRemoveIndicator}
                      onOpenIndicatorSettings={handleOpenIndicatorSettings}
                      overlayUiSuppressed={showIndicatorsPanel || showDrawingsPanel}
                      onToggleMobileHistory={() => setShowMobileHistory(true)}
                      mobileHistoryOpen={showMobileHistory}
                      settlementAnnouncement={chartSettlementAnnouncements[selectedAsset.symbol] ?? null} />

                    {/* Mobile Indicator and Drawing Panels */}
                    {showIndicatorsPanel && (
                      <div className="absolute top-0 left-0 right-0 bottom-0 z-50" style={{ background: "var(--trading-workspace-bg)" }}>
                        <IndicatorsPanel activeIndicators={standardActiveIndicators} onAddIndicator={handleAddIndicator}
                          onUpdateIndicator={handleUpdateIndicator} onRemoveIndicator={handleRemoveIndicator}
                          editingIndicatorId={editingIndicatorId}
                          onEditingIndicatorChange={setEditingIndicatorId}
                          onClose={handleCloseIndicatorsPanel} />
                      </div>
                    )}
                    {showDrawingsPanel && (
                      <div className="absolute top-0 left-0 right-0 bottom-0 z-50" style={{ background: "var(--trading-workspace-bg)" }}>
                        <DrawingsPanel onClose={() => setShowDrawingsPanel(false)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Trading Panel directly below chart — NO paddingBottom here to remove big space */}
                <div id="tour-trade-panel" className={`fixed left-0 right-0 bottom-[56px] px-2 sm:px-3 ${showMobileHistory ? "z-[120]" : "z-40"}`}>
                  <div className="mx-auto w-full max-w-[430px]">
                    <TradingPanel 
                       asset={selectedAsset} 
                       balance={currentBalance} 
                       accountType={accountType}
                       demoBalance={demoBalance}
                       onDemoBalanceChange={setDemoBalance}
                       onTrade={handleLiveTradeFromChart}
                       onDemoTrade={handleOpenDemoTrade}
                       activeTradesOverride={visibleActiveTrades}
                       tradeHistoryOverride={visibleTradeHistory}
                       onOpenAssetSelector={() => setShowAssetSelector(true)}
                       mobileHistoryOpen={showMobileHistory}
                       onCloseMobileHistory={() => setShowMobileHistory(false)}
                       onOpenMobileHistory={() => setShowMobileHistory(true)}
                       mobileDocked
                    />
                  </div>
                </div>
              </div>
              )}
            </>
          )}
        </div>

        {/* ── MOBILE 5-icon Bottom Navigation — ALWAYS VISIBLE ── */}
        <div
          className="fixed bottom-0 left-0 right-0 z-[300] lg:hidden border-t border-[#243247] bg-[linear-gradient(180deg,rgba(24,31,45,0.96)_0%,rgba(10,14,22,0.99)_100%)] shadow-[0_-16px_32px_rgba(0,0,0,0.42)] backdrop-blur-xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)", height: "56px" }}
        >
          <div className="mx-auto flex h-full max-w-[430px] items-center gap-1 px-2">
            <button
              type="button"
              aria-label="Open chart"
              onClick={() => { setMobileOverlay(null); setActiveWorkspace(null); }}
              className={getMobileNavButtonClass(isChartNavActive)}
            >
              <span className={getMobileNavIconClass(isChartNavActive)}>
                <Image className="h-5 w-5" strokeWidth={2.5} />
              </span>
            </button>

            <button
              type="button"
              aria-label="Open help"
              onClick={() => setMobileOverlay("help")}
              className={getMobileNavButtonClass(isHelpNavActive)}
            >
              <span className={getMobileNavIconClass(isHelpNavActive)}>
                <HelpCircle className="h-5 w-5" strokeWidth={2.5} />
              </span>
            </button>

            <button
              type="button"
              aria-label="Open account"
              id="tour-account"
              onClick={() => setMobileOverlay("account")}
              className={getMobileNavButtonClass(isAccountNavActive)}
            >
              <span className={getMobileNavIconClass(isAccountNavActive)}>
                <User className="h-5 w-5" strokeWidth={2.5} />
              </span>
            </button>

            <button
              type="button"
              aria-label="Open tournaments"
              id="tour-tournaments"
              onClick={() => setMobileOverlay("tournaments")}
              className={getMobileNavButtonClass(isTournamentsNavActive)}
            >
              <span className={`relative ${getMobileNavIconClass(isTournamentsNavActive)}`}>
                <Trophy className="h-5 w-5" strokeWidth={2.5} />
                {activeTrades.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border border-[#0f1725] bg-[#57a3ff] px-1 text-[9px] font-black text-white shadow-[0_4px_10px_rgba(53,135,255,0.45)]">
                    {activeTrades.length}
                  </span>
                )}
              </span>
            </button>

            <button
              type="button"
              aria-label="Open more menu"
              onClick={() => setMobileOverlay("more")}
              className={getMobileNavButtonClass(isMoreNavActive)}
            >
              <span className={getMobileNavIconClass(isMoreNavActive)}>
                <MoreHorizontal className="h-5 w-5" strokeWidth={2.6} />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile module overlays — stable top-level component, preserves tab state */}
        <MobileModuleOverlay
          mobileOverlay={mobileOverlay}
          setMobileOverlay={setMobileOverlay}
          setSelectedTournament={setSelectedTournament}
          analyticsSignalAsset={analyticsSignalAsset}
        />

        {showRealAccountWelcome && (
          <RealAccountWelcomeModal
            onClose={closeNewUserWelcome}
            onDeposit={() => {
              closeNewUserWelcome();
              openDepositPage();
            }}
            onWithdraw={() => {
              closeNewUserWelcome();
              openWithdrawPage();
            }}
            onUseDemo={() => {
              closeNewUserWelcome();
              setAccountType("demo");
            }}
          />
        )}
        <DepositGuideReminder
          open={Boolean(depositGuideReason)}
          reason={depositGuideReason}
          onClose={() => setDepositGuideReason(null)}
          onDeposit={openDepositPage}
        />
        <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} balance={balance} initialTab={profileInitialTab} />
        <TournamentDetailOverlay tournamentId={selectedTournament} onClose={() => setSelectedTournament(null)}
          onOpenDeposit={openDepositPage} onEnterTournament={handleEnterTournament} />
        {showAssetSelector && <AssetSelectorModal onSelect={handleSelectAsset} onClose={() => setShowAssetSelector(false)} />}
      </div>
    </ProfileTourProvider>
  );
};

export default Trade;
