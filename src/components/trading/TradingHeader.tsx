import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Plus,
  ShieldCheck,
  Send,
} from "lucide-react";
import { AccountType, AccountDropdown } from "./AccountModals";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useVip } from "@/contexts/VipContext";
import { getStoredLiveBalance } from "@/lib/live-balance";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import {
  type ChartLayoutMode,
  loadChartLayoutMode,
  TRADE_CHART_LAYOUT_MODE_CHANGED_EVENT,
} from "./chartLayout";

export type ProfileTab = "personal" | "deposit" | "support" | "balance_history" | "trading_history" | "settings";

interface TradingHeaderProps {
  balance: number;
  demoBalance: number;
  accountType: AccountType;
  onSwitchAccount: (type: AccountType) => void;
  activeTabId?: string;
  onSelectTab?: (tabId: string) => void;
  openTabs: Array<{ symbol: string }>;
  onRemoveTab: (id: string) => void;
  onAddAssetClick: () => void;
  onOpenDeposit: () => void;
  onOpenWithdrawal: () => void;
  onOpenProfile: (tab?: ProfileTab) => void;
  onUpdateDemoBalance: (value: number) => void;
  onResetDemoBalance: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  highlightDepositButton?: boolean;
}

const TradingHeader = ({
  balance,
  demoBalance,
  accountType,
  onSwitchAccount,
  onOpenDeposit,
  onOpenWithdrawal,
  onOpenProfile,
  onUpdateDemoBalance,
  onResetDemoBalance,
}: TradingHeaderProps) => {
  const navigate = useNavigate();
  const [showAccountDrop, setShowAccountDrop] = useState(false);
  const [chartLayoutMode, setChartLayoutMode] = useState<ChartLayoutMode>(() => loadChartLayoutMode());
  const { profile } = useAuth();
  const { isAdmin } = useStaffAccess();
  const { formatMoney } = useCurrency();
  const { platformName, logoUrl } = useSiteBranding();
  const { t } = useTranslation();

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mobile_account_dropdown", { detail: { open: showAccountDrop } }));
    return () => {
      window.dispatchEvent(new CustomEvent("mobile_account_dropdown", { detail: { open: false } }));
    };
  }, [showAccountDrop]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleLayoutModeChanged = (event: Event) => {
      const mode = (event as CustomEvent<{ mode?: number }>).detail?.mode;
      if (mode === 1 || mode === 2 || mode === 3 || mode === 4) {
        setChartLayoutMode(mode);
      }
    };
    window.addEventListener(TRADE_CHART_LAYOUT_MODE_CHANGED_EVENT, handleLayoutModeChanged as EventListener);
    return () => window.removeEventListener(TRADE_CHART_LAYOUT_MODE_CHANGED_EVENT, handleLayoutModeChanged as EventListener);
  }, []);

  const liveBalance = profile ? getStoredLiveBalance(profile) : balance;
  const displayBalance = accountType === "demo" ? demoBalance : accountType === "tournament" ? balance : liveBalance;

  const accountTitle =
    accountType === "demo" ? "DEMO ACCOUNT" :
    accountType === "tournament" ? "TOURNAMENT" :
    "LIVE ACCOUNT";

  const accountBadgeColor =
    accountType === "demo" ? "text-amber-400" :
    accountType === "tournament" ? "text-blue-400" :
    "text-[#0fa055]";

  return (
    <header className="relative flex h-[62px] shrink-0 items-center justify-between px-4 bg-[var(--trading-header-bg,#1e2131)] border-b border-[var(--trading-border-color,rgba(143,164,210,0.16))] text-white z-30 select-none">

      {/* ── MOBILE layout (hidden on lg+) ── */}
      <div className="flex lg:hidden flex-1 items-center justify-between gap-2">
        {/* Brand */}
        <Link to="/trade" className="flex items-center">
          {logoUrl ? (
            <img src={logoUrl} alt={platformName} className="h-8 w-auto max-w-[160px] object-contain" />
          ) : (
            <span className="font-black text-white text-base tracking-wider uppercase">{platformName}</span>
          )}
        </Link>

        {/* Mobile Account Pill */}
        <div className="relative flex items-center">
          <button
            onClick={() => setShowAccountDrop((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-[#161F2E] px-2.5 text-xs font-bold text-white"
          >
            <Send size={13} className="text-[#0fa055]" />
            <span className="font-mono text-[#0fa055]">{formatMoney(displayBalance)}</span>
            <ChevronDown size={13} className="text-gray-400" />
          </button>
          {showAccountDrop && (
            <AccountDropdown
              accountType={accountType}
              balance={liveBalance}
              demoBalance={demoBalance}
              onSwitch={onSwitchAccount}
              onOpenDeposit={onOpenDeposit}
              onOpenWithdrawal={onOpenWithdrawal}
              onOpenProfile={onOpenProfile}
              onUpdateDemoBalance={onUpdateDemoBalance}
              onResetDemoBalance={onResetDemoBalance}
              onClose={() => setShowAccountDrop(false)}
            />
          )}
        </div>

        {/* Mobile Deposit Button */}
        <button
          onClick={onOpenDeposit}
          className="flex h-9 items-center justify-center rounded-lg bg-[#0fa055] px-3 text-xs font-bold text-white hover:bg-[#0d8a49]"
        >
          + Deposit
        </button>
      </div>

      {/* ── DESKTOP layout (hidden below lg) ── */}
      <div className="hidden lg:flex w-full items-center justify-between gap-4">

        {/* Left: Logo + Subtitle — broader area, bigger logo */}
        <Link
          to="/trade"
          className="flex shrink-0 items-center gap-3 hover:opacity-90 transition-opacity min-w-[220px]"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={platformName}
              className="h-9 w-auto object-contain"
              style={{ maxWidth: "180px" }}
            />
          ) : (
            <span className="font-black text-xl tracking-wider text-white uppercase">{platformName}</span>
          )}
          <span className="text-[#2A3A52] font-bold text-sm">•</span>
          <span className="text-[11px] font-black tracking-widest text-[#5E6B7D] uppercase whitespace-nowrap">
            WEB TRADING PLATFORM
          </span>
        </Link>

        {/* Center: Promo Bonus Banner */}
        <div className="flex-1 flex justify-center items-center">
          <button
            onClick={onOpenDeposit}
            className="group flex items-center gap-2.5 rounded-full bg-[#0fa055] px-5 py-2 text-xs font-extrabold text-white shadow-lg shadow-[#0fa055]/25 hover:bg-[#0d8a49] transition-all transform hover:scale-[1.02] active:scale-95"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-sm">🚀</span>
            <span>Get a 50% bonus on your deposit!</span>
            <span className="rounded-full bg-black/20 px-2.5 py-0.5 text-[11px] font-black text-white">50%</span>
          </button>
        </div>

        {/* Right: Admin + Bell + Account + Deposit + Withdrawal */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[#0fa055]/30 bg-[#0fa055]/10 px-3 text-xs font-bold text-[#0fa055] hover:bg-[#3D4759] hover:border-[#526078] hover:text-white transition-colors"
              title="Admin Panel"
            >
              <ShieldCheck size={14} />
              ADMIN
            </button>
          )}

          {/* Notification Bell */}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1F293D] bg-[#162030] hover:bg-[#3D4759] hover:border-[#526078] transition-colors">
            <NotificationBell />
          </div>

          {/* Account Selector */}
          <div className="relative flex items-center">
            <button
              id="tour-account-switch"
              onClick={() => setShowAccountDrop((v) => !v)}
              className="flex h-9 items-center gap-2.5 rounded-lg border border-[#1F293D] bg-[#162030] px-3.5 hover:bg-[#3D4759] hover:border-[#526078] transition-colors"
            >
              <Send size={14} className="text-[#0fa055] shrink-0" />
              <div className="text-left leading-none">
                <p className={`text-[9px] font-black uppercase tracking-wider ${accountBadgeColor}`}>
                  {accountTitle}
                </p>
                <p className="mt-0.5 font-mono text-[13px] font-black text-white">
                  {formatMoney(displayBalance)}
                </p>
              </div>
              <ChevronDown size={14} className="text-gray-400 ml-0.5" />
            </button>

            {showAccountDrop && (
              <AccountDropdown
                accountType={accountType}
                balance={liveBalance}
                demoBalance={demoBalance}
                onSwitch={onSwitchAccount}
                onOpenDeposit={onOpenDeposit}
                onOpenWithdrawal={onOpenWithdrawal}
                onOpenProfile={onOpenProfile}
                onUpdateDemoBalance={onUpdateDemoBalance}
                onResetDemoBalance={onResetDemoBalance}
                onClose={() => setShowAccountDrop(false)}
              />
            )}
          </div>

          {/* Deposit Button */}
          <button
            id="tour-deposit-button"
            data-deposit-trigger="true"
            onClick={onOpenDeposit}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#0fa055] px-4 text-[13px] font-black text-white shadow-md shadow-[#0fa055]/20 hover:bg-[#0d8a49] transition-all active:scale-95"
          >
            <Plus size={14} strokeWidth={3} /> {t("tradingHeader.deposit")}
          </button>

          {/* Withdrawal Button */}
          <button
            onClick={onOpenWithdrawal}
            className="flex h-9 items-center rounded-lg border border-[#2B3548] bg-[#1E2736] px-4 text-[13px] font-bold text-white hover:bg-[#3D4759] hover:border-[#526078] transition-colors"
          >
            {t("tradingHeader.withdrawal")}
          </button>
        </div>
      </div>
    </header>
  );
};

export default TradingHeader;
