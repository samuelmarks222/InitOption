import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NavigationSidebar, WorkspaceModule } from "@/components/navigation/NavigationSidebar";
import { DynamicWorkspace } from "@/components/workspace/DynamicWorkspace";
import { TournamentDetailOverlay } from "@/components/workspace/TournamentDetailOverlay";
import TradingHeader from "@/components/trading/TradingHeader";
import TradingChart from "@/components/trading/TradingChart";
import TradingPanel from "@/components/trading/TradingPanel";
import AssetInfo from "@/components/trading/AssetInfo";
import { ProfileTourProvider } from "@/contexts/ProfileTourContext";
import { GuidedTour } from "@/components/tour/GuidedTour";
import TradingFooter from "@/components/trading/TradingFooter";
import { AssetSelectorModal } from "@/components/trading/AssetSelectorModal";
import { DepositGuideReminder } from "@/components/trading/DepositGuideReminder";
import IndicatorsPanel from "@/components/trading/indicators/IndicatorsPanel";
import { DrawingsPanel } from "@/components/trading/drawings/DrawingsPanel";
import { ActiveIndicator } from "@/components/trading/indicators/types";
import { INDICATOR_REGISTRY } from "@/components/trading/indicators/config";
import { useAuth } from "@/contexts/AuthContext";
import { useTrading, type ActiveTrade, type TradeHistoryEntry } from "@/hooks/useTrading";
import { useDynamicAssets } from "@/contexts/DynamicAssetContext";
import { AccountType, DepositModal, RealAccountWelcomeModal, WithdrawalModal } from "@/components/trading/AccountModals";
import { ProfileDrawer, type ProfileTab } from "@/components/profile/ProfileDrawer";
import { TournamentsGridOverlay } from "@/components/workspace/TournamentsGridOverlay";
import { AccountGridOverlay } from "@/components/workspace/AccountGridOverlay";
import { AnalyticsGridOverlay } from "@/components/workspace/AnalyticsGridOverlay";
import { HelpCenterOverlay } from "@/components/workspace/HelpCenterOverlay";
import { WorkspaceMarket } from "@/components/workspace/WorkspaceMarket";
import { Image, HelpCircle, User, Trophy, MoreHorizontal, BarChart2, X } from "lucide-react";
import { MobileMoreMenu, MobileLeaderboardOverlay } from "@/components/workspace/MobileMoreMenu";
import {
  DEFAULT_DEMO_BALANCE,
  hasSeenNewUserPrompt,
  isNewUserProfile,
  markNewUserPromptSeen,
  readDemoBalanceStorage,
  writeDemoBalanceStorage,
} from "@/lib/onboarding";
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
import { getEffectiveLiveBalance } from "@/lib/live-balance";

type DepositGuideReason = "deposit_required" | "insufficient_balance";

// ─── Extracted to top-level to prevent remount on every Trade re-render ───
interface MobileModuleOverlayProps {
  mobileOverlay: string | null;
  setMobileOverlay: (v: string | null) => void;
  setSelectedTournament: (id: string | null) => void;
}

const buildTradeTabAsset = (assetRow: any) => {
  const category = normalizeAssetCategory(assetRow.category, assetRow.symbol);
  const basePrice = getAssetBasePrice(assetRow.symbol, category);
  const maxProfit = clampAssetPayout(assetRow.payout_pct, getAssetDefaultPayout(category));

  return {
    symbol: assetRow.symbol,
    type: assetCategoryToRuntimeType(category),
    name: assetRow.name || assetRow.symbol,
    basePrice,
    icon: "star",
    flags: getAssetFlags(assetRow.symbol, [assetRow.baseCountry, assetRow.quoteCountry, assetRow.base_country, assetRow.quote_country]),
    stockLogo: getAssetStockLogo(assetRow.symbol, assetRow.stockLogo ?? assetRow.stock_logo),
    commodityIcon: getAssetCommodityIcon(assetRow.symbol, assetRow.commodityIcon ?? assetRow.commodity_icon),
    maxProfit,
    change5min: "0.00%",
    category: category === "STOCKS" ? "Stocks" : "Options",
    isTradersChoice: false,
    price: basePrice,
    change: 0,
  };
};

const MobileModuleOverlay = ({ mobileOverlay, setMobileOverlay, setSelectedTournament }: MobileModuleOverlayProps) => {
  if (!mobileOverlay) return null;
  return (
    <div className="fixed top-0 left-0 right-0 bottom-[56px] z-[200] bg-[#0a0d14] flex flex-col">
      {mobileOverlay === "market_overview" && (
        <div className="flex flex-col h-full bg-[#0d1117]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-3">
              <BarChart2 className="w-5 h-5 text-blue-400" />
              <span className="text-white font-bold text-[18px]">Market</span>
            </div>
            <button onClick={() => setMobileOverlay(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <WorkspaceMarket />
          </div>
        </div>
      )}
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
            <TournamentsGridOverlay onOpenDetails={setSelectedTournament} />
          </div>
        </div>
      )}
      {mobileOverlay === "leaderboard" && <MobileLeaderboardOverlay onClose={() => setMobileOverlay(null)} />}
      {mobileOverlay === "analytics_detail" && <AnalyticsGridOverlay onClose={() => setMobileOverlay("more")} />}
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
  const { activeTrades, tradeHistory, openTrade, setCurrentPrice, setTournamentParticipantId } = useTrading();
  const navigate = useNavigate();
  const latestChartPriceRef = useRef(0);
  const latestMarkerTimeRef = useRef<number | undefined>(undefined);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );

  const [openTabs, setOpenTabs] = useState<any[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [selectedAssetSaved, setSelectedAssetSaved] = useState<any>(null);
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
    async function initAssets() {
      const { data } = await supabase.from('assets_config').select('*').eq('status', 'active').order('symbol');
      if (data && data.length > 0) {
        const savedTabsRaw = localStorage.getItem("trading_open_tabs");
        const savedActiveId = localStorage.getItem("trading_active_tab");
        let initialTabs: any[] = [];
        let initialActive: any = null;

        if (savedTabsRaw) {
          try {
            const parsed = JSON.parse(savedTabsRaw);
            initialTabs = parsed
              .map((tab: any) => data.find((dbA) => dbA.symbol === tab.symbol))
              .filter(Boolean)
              .map((assetRow: any) => buildTradeTabAsset(assetRow));
            if (savedActiveId) initialActive = initialTabs.find((t: any) => t.symbol === savedActiveId);
          } catch(e) {}
        }

        if (initialTabs.length === 0) {
          initialTabs = [buildTradeTabAsset(data[0])];
        }
        if (!initialActive && initialTabs.length > 0) initialActive = initialTabs[0];
        setOpenTabs(initialTabs);
        setSelectedAssetSaved(initialActive);
        setActiveTabId(initialActive.symbol);
      }
    }
    initAssets();
  }, []);

  useEffect(() => { if (openTabs.length > 0) localStorage.setItem("trading_open_tabs", JSON.stringify(openTabs)); }, [openTabs]);
  useEffect(() => { if (activeTabId) localStorage.setItem("trading_active_tab", activeTabId); }, [activeTabId]);

  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showIndicatorsPanel, setShowIndicatorsPanel] = useState(false);
  const [showDrawingsPanel, setShowDrawingsPanel] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicator[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<ProfileTab>("personal");
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositGuideReason, setDepositGuideReason] = useState<DepositGuideReason | null>(null);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showRealAccountWelcome, setShowRealAccountWelcome] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceModule>(null);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [tournamentSandboxBalance, setTournamentSandboxBalance] = useState(0);
  const [accountType, setAccountType] = useState<AccountType>("live");
  const [demoBalance, setDemoBalance] = useState(DEFAULT_DEMO_BALANCE);
  const [demoActiveTrades, setDemoActiveTrades] = useState<ActiveTrade[]>([]);
  const [demoTradeHistory, setDemoTradeHistory] = useState<TradeHistoryEntry[]>([]);
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
    setDemoTradeHistory(readJsonStorage<TradeHistoryEntry[]>(getDemoTradeHistoryStorageKey(user.id), []));
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

    localStorage.setItem(getDemoTradeHistoryStorageKey(user.id), JSON.stringify(demoTradeHistory));
  }, [demoTradeHistory, user?.id]);

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
        if (creditedAmount > 0) {
          setDemoBalance((current) => current + creditedAmount);
        }
        setDemoTradeHistory((current) => [...settledTrades.reverse(), ...current].slice(0, 50));
      }
    }, 100);

    return () => window.clearInterval(timerId);
  }, [demoActiveTrades.length, user?.id]);

  useEffect(() => {
    if (!user?.id || !isNewUser || hasSeenNewUserPrompt(user.id) || showRealAccountWelcome) {
      return;
    }

    if (selectedTournament || showDeposit || showWithdrawal || showAssetSelector || mobileOverlay || isProfileOpen) {
      return;
    }

    setShowRealAccountWelcome(true);
  }, [
    isNewUser,
    isProfileOpen,
    mobileOverlay,
    selectedTournament,
    showAssetSelector,
    showDeposit,
    showRealAccountWelcome,
    showWithdrawal,
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
    if (showDeposit || accountType !== "live") {
      setDepositGuideReason(null);
    }
  }, [accountType, showDeposit]);

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

  const handleSelectAsset = (asset: any) => {
    const globalAsset: any = {
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

  const handleChartPriceUpdate = (price: number, markerTime?: number) => {
    latestChartPriceRef.current = price;
    latestMarkerTimeRef.current = markerTime;
    if (selectedAsset?.symbol) {
      setLiveChartPrices((prev) => ({ ...prev, [selectedAsset.symbol]: price }));
    }
    setCurrentPrice(price, markerTime);
  };

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
  ) => {
    if (amount <= 0 || amount > demoBalance) {
      return false;
    }

    const openedAt = new Date().toISOString();
    const currentEntryPrice = latestChartPriceRef.current > 0 ? latestChartPriceRef.current : entryPrice;

    setDemoBalance((current) => current - amount);
    setDemoActiveTrades((current) => [
      {
        id: `demo_${crypto.randomUUID()}`,
        asset_symbol: assetSymbol,
        direction,
        amount,
        entry_price: currentEntryPrice,
        marker_time: latestMarkerTimeRef.current ?? Math.floor(new Date(openedAt).getTime() / 1000),
        expiry_seconds: expirySeconds,
        payout_rate: payoutRate,
        opened_at: openedAt,
        timeLeft: expirySeconds,
        tournament_participant_id: null,
      },
      ...current,
    ]);

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
    if (!reg) return;
    const defaults: Record<string, any> = {};
    reg.params.forEach(p => defaults[p.id] = p.default);
    setActiveIndicators(prev => [...prev, { instanceId: crypto.randomUUID(), configId, name: reg.name, pane: reg.pane, params: defaults, visible: true }]);
  };

  const handleUpdateIndicator = (instanceId: string, updates: Partial<ActiveIndicator>) =>
    setActiveIndicators(prev => prev.map(ind => ind.instanceId === instanceId ? { ...ind, ...updates } : ind));

  const handleRemoveIndicator = (instanceId: string) =>
    setActiveIndicators(prev => prev.filter(ind => ind.instanceId !== instanceId));

  const liveActiveTrades = useMemo(
    () => activeTrades.filter((trade) => !trade.tournament_participant_id),
    [activeTrades],
  );
  const tournamentActiveTrades = useMemo(
    () => activeTrades.filter((trade) => !!trade.tournament_participant_id),
    [activeTrades],
  );
  const visibleActiveTrades = accountType === "demo" ? demoActiveTrades : accountType === "tournament" ? tournamentActiveTrades : liveActiveTrades;
  const visibleTradeHistory = accountType === "demo" ? demoTradeHistory : tradeHistory;

  if (!selectedAsset) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-8 h-8 border-4 border-[#0b65c2] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-medium">Booting Trading Engine...</p>
      </div>
    );
  }

  const isFullScreen = ["tournaments","account","more","help"].includes(activeWorkspace || "");
  const currentBalance = accountType === "tournament" ? tournamentSandboxBalance : balance;
  const tourEnabled =
    isDesktopViewport &&
    !mobileOverlay &&
    !selectedTournament &&
    !showAssetSelector &&
    !showIndicatorsPanel &&
    !showDrawingsPanel &&
    !isProfileOpen &&
    !showDeposit &&
    !showWithdrawal &&
    !showRealAccountWelcome &&
    !["account", "tournaments", "more", "help"].includes(activeWorkspace || "");

  return (
    <ProfileTourProvider>
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        <GuidedTour enabled={tourEnabled} />
        <TradingHeader balance={currentBalance} demoBalance={demoBalance} accountType={accountType}
          onSwitchAccount={setAccountType} activeTabId={activeTabId} onSelectTab={handleSelectTab}
          openTabs={openTabs} onRemoveTab={handleRemoveTab} onAddAssetClick={() => setShowAssetSelector(true)}
          onOpenDeposit={() => {
            setDepositGuideReason(null);
            setShowDeposit(true);
          }}
          onOpenWithdrawal={() => setShowWithdrawal(true)}
          onOpenProfile={handleOpenProfile}
          onUpdateDemoBalance={handleDemoBalanceUpdate}
          onResetDemoBalance={() => handleDemoBalanceUpdate(DEFAULT_DEMO_BALANCE)}
          onOpenSettings={() => navigate("/settings")} onOpenHistory={() => {}}
          highlightDepositButton={Boolean(depositGuideReason)} />

        <div className="flex-1 flex overflow-hidden min-h-0 bg-[#1c1f2d]">
          {/* Left sidebar — desktop only */}
          {isDesktopViewport && (
          <div className="shrink-0">
            <NavigationSidebar activeWorkspace={activeWorkspace} onSelectWorkspace={setActiveWorkspace} />
          </div>
          )}

          {activeWorkspace && !isFullScreen && (
            <DynamicWorkspace activeWorkspace={activeWorkspace} onClose={() => setActiveWorkspace(null)} onOpenTournament={setSelectedTournament} />
          )}

          {/* Desktop full-screen workspace overlays */}
          {activeWorkspace === "tournaments" ? (
            <div className="flex-1 w-full h-full relative z-30 bg-[#0a0d14]"><TournamentsGridOverlay onOpenDetails={setSelectedTournament} /></div>
          ) : activeWorkspace === "account" ? (
            <div className="flex-1 w-full h-full relative z-30 bg-[#0a0d14]"><AccountGridOverlay onClose={() => setActiveWorkspace(null)} /></div>
          ) : activeWorkspace === "more" ? (
            <div className="flex-1 w-full h-full relative z-30 bg-[#0a0d14]"><AnalyticsGridOverlay onClose={() => setActiveWorkspace(null)} /></div>
          ) : activeWorkspace === "help" ? (
            <div className="flex-1 w-full h-full relative z-30 bg-[#0a0d14]"><HelpCenterOverlay onClose={() => setActiveWorkspace(null)} /></div>
          ) : (
            <>
              {/* ── DESKTOP & TABLET: side-by-side chart + panel ── */}
              {isDesktopViewport ? (
              <div className="flex flex-1 overflow-hidden min-h-0">
                <div id="tour-chart" className="flex-1 flex flex-col relative min-w-0 bg-[#1c1f2d]">
                  <div>
                    <AssetInfo asset={selectedAsset} onSelectAsset={() => {}} onOpenSelector={() => setShowAssetSelector(true)}
                      openTabs={openTabs} activeTabId={activeTabId} onSelectTab={handleSelectTab}
                      onRemoveTab={handleRemoveTab} onAddAssetClick={() => setShowAssetSelector(true)}
                      activeTrades={visibleActiveTrades} livePrices={liveChartPrices} />
                  </div>
                  <TradingChart asset={selectedAsset} onPriceUpdate={handleChartPriceUpdate} activeIndicators={activeIndicators} activeTrades={visibleActiveTrades}
                    onToggleIndicatorsPanel={() => { setShowIndicatorsPanel(v => !v); setShowDrawingsPanel(false); }}
                    onToggleDrawingsPanel={() => { setShowDrawingsPanel(v => !v); setShowIndicatorsPanel(false); }}
                    onRemoveIndicator={handleRemoveIndicator} />
                  {showIndicatorsPanel && (
                    <IndicatorsPanel activeIndicators={activeIndicators} onAddIndicator={handleAddIndicator}
                      onUpdateIndicator={handleUpdateIndicator} onRemoveIndicator={handleRemoveIndicator}
                      onClose={() => setShowIndicatorsPanel(false)} />
                  )}
                  {showDrawingsPanel && (
                    <div className="absolute top-0 left-[60px] bottom-0 z-50">
                      <DrawingsPanel onClose={() => setShowDrawingsPanel(false)} />
                    </div>
                  )}
                </div>
                <div id="tour-trade-panel" className="flex flex-col shrink-0 z-20 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                  <TradingPanel asset={selectedAsset} balance={currentBalance} demoBalance={demoBalance}
                    accountType={accountType} onDemoBalanceChange={setDemoBalance} onTrade={openTrade} onDemoTrade={handleOpenDemoTrade}
                    activeTradesOverride={visibleActiveTrades} tradeHistoryOverride={visibleTradeHistory}
                    onOpenAssetSelector={() => setShowAssetSelector(true)} />
                </div>
              </div>
              ) : (
              <div className="flex-1 flex flex-col overflow-hidden bg-[#1c1f2d]">
                {/* ── MOBILE: Chart + Trading Panel combined in a fixed flex layout ── */}
                {/* Chart block — dynamically fills remaining vertical space */}
                <div className="flex-1 min-h-0 relative flex flex-col pb-[250px] sm:pb-[262px]">
                  {/* Total portfolio bar matches reference immediately below tabs */}
                  <div className="flex items-center justify-between px-4 shrink-0" style={{ height: "28px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#1c1f2d" }}>
                    <span style={{ fontSize: "11px", color: "#7f8b99" }}>Total portfolio</span>
                    <button style={{ fontSize: "11px", color: "#7f8b99" }}>Hide positions ▾</button>
                  </div>

                  <div className="flex-1 relative w-full flex flex-col min-h-0">
                    <TradingChart asset={selectedAsset} onPriceUpdate={handleChartPriceUpdate} activeIndicators={activeIndicators} activeTrades={visibleActiveTrades}
                      onToggleIndicatorsPanel={() => { setShowIndicatorsPanel(v => !v); setShowDrawingsPanel(false); }}
                      onToggleDrawingsPanel={() => { setShowDrawingsPanel(v => !v); setShowIndicatorsPanel(false); }}
                      onRemoveIndicator={handleRemoveIndicator}
                      onToggleMobileHistory={() => setShowMobileHistory(true)} />

                    {/* Mobile Indicator and Drawing Panels */}
                    {showIndicatorsPanel && (
                      <div className="absolute top-0 left-0 right-0 bottom-0 z-50 bg-[#1c1f2d]">
                        <IndicatorsPanel activeIndicators={activeIndicators} onAddIndicator={handleAddIndicator}
                          onUpdateIndicator={handleUpdateIndicator} onRemoveIndicator={handleRemoveIndicator}
                          onClose={() => setShowIndicatorsPanel(false)} />
                      </div>
                    )}
                    {showDrawingsPanel && (
                      <div className="absolute top-0 left-0 right-0 bottom-0 z-50 bg-[#1c1f2d]">
                        <DrawingsPanel onClose={() => setShowDrawingsPanel(false)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Trading Panel directly below chart — NO paddingBottom here to remove big space */}
                <div className="fixed left-0 right-0 bottom-[56px] z-40 px-2 sm:px-3">
                  <div className="mx-auto w-full max-w-[430px]">
                    <TradingPanel 
                       asset={selectedAsset} 
                       balance={currentBalance} 
                       accountType={accountType}
                       demoBalance={demoBalance}
                       onDemoBalanceChange={setDemoBalance}
                       onTrade={openTrade}
                       onDemoTrade={handleOpenDemoTrade}
                       activeTradesOverride={visibleActiveTrades}
                       tradeHistoryOverride={visibleTradeHistory}
                       onOpenAssetSelector={() => setShowAssetSelector(true)}
                       mobileHistoryOpen={showMobileHistory}
                       onCloseMobileHistory={() => setShowMobileHistory(false)}
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
        <div className="fixed bottom-0 left-0 right-0 lg:hidden flex items-center justify-around bg-[#11161d] border-t border-white/10 z-[300]" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)", height: "56px" }}>
          {/* Gallery / Chart Icon */}
          <button
            onClick={() => { setMobileOverlay(null); setActiveWorkspace(null); }}
            className="flex flex-col items-center gap-1 px-4 py-3 text-gray-400 hover:text-white transition-colors"
          >
            <Image className="w-5 h-5" />
          </button>

          {/* Help */}
          <button
            onClick={() => setMobileOverlay("help")}
            className="flex flex-col items-center gap-1 px-4 py-3 text-gray-400 hover:text-white transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Profile / Account */}
          <button
            onClick={() => setMobileOverlay("account")}
            className="flex flex-col items-center gap-1 px-4 py-3 text-gray-400 hover:text-white transition-colors"
          >
            <User className="w-5 h-5" />
          </button>

          {/* Tournaments */}
          <button
            onClick={() => setMobileOverlay("tournaments")}
            className="relative flex flex-col items-center gap-1 px-4 py-3 text-gray-400 hover:text-white transition-colors"
          >
            <Trophy className="w-5 h-5" />
            {activeTrades.length > 0 && (
              <span className="absolute top-2 right-2.5 min-w-[16px] h-4 px-0.5 bg-blue-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {activeTrades.length}
              </span>
            )}
          </button>

          {/* More */}
          <button
            onClick={() => setMobileOverlay("more")}
            className="flex flex-col items-center gap-1 px-4 py-3 text-gray-400 hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop footer */}
        <div className="hidden lg:block"><TradingFooter /></div>

        {/* Mobile module overlays — stable top-level component, preserves tab state */}
        <MobileModuleOverlay
          mobileOverlay={mobileOverlay}
          setMobileOverlay={setMobileOverlay}
          setSelectedTournament={setSelectedTournament}
        />

        {showRealAccountWelcome && (
          <RealAccountWelcomeModal
            onClose={closeNewUserWelcome}
            onDeposit={() => {
              closeNewUserWelcome();
              setAccountType("live");
              setShowDeposit(true);
            }}
            onWithdraw={() => {
              closeNewUserWelcome();
              setAccountType("live");
              setShowWithdrawal(true);
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
          onDeposit={() => {
            setDepositGuideReason(null);
            setShowDeposit(true);
          }}
        />
        <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} balance={balance} initialTab={profileInitialTab} />
        <TournamentDetailOverlay tournamentId={selectedTournament} onClose={() => setSelectedTournament(null)}
          onOpenDeposit={() => setShowDeposit(true)} onEnterTournament={handleEnterTournament} />
        {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
        {showWithdrawal && <WithdrawalModal balance={balance} onClose={() => setShowWithdrawal(false)} />}
        {showAssetSelector && <AssetSelectorModal onSelect={handleSelectAsset} onClose={() => setShowAssetSelector(false)} />}
      </div>
    </ProfileTourProvider>
  );
};

export default Trade;
