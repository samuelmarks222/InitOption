import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronDown,
  Menu,
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
import { VipBadge } from "@/components/vip/VipBadge";
import { KycAvatarBadge } from "@/components/profile/KycAvatarBadge";
import { getStoredLiveBalance } from "@/lib/live-balance";
import { normalizeKycStatus, type KycDocumentsLike } from "@/lib/kyc";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import {
  type ChartLayoutMode,
  loadChartLayoutMode,
  TRADE_CHART_LAYOUT_MODE_CHANGED_EVENT,
  TRADE_CHART_LAYOUT_SET_EVENT,
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
  highlightDepositButton = false,
}: TradingHeaderProps) => {
  const navigate = useNavigate();
  const [showAccountDrop, setShowAccountDrop] = useState(false);
  const [showChartLayoutMenu, setShowChartLayoutMenu] = useState(false);
  const [chartLayoutMode, setChartLayoutMode] = useState<ChartLayoutMode>(() => loadChartLayoutMode());
  const chartLayoutMenuRef = useRef<HTMLDivElement | null>(null);
  const { profile } = useAuth();
  const { isAdmin } = useStaffAccess();
  const { vip } = useVip();
  const { formatMoney } = useCurrency();
  const { platformName, initials, logoUrl } = useSiteBranding();
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
    "text-[#00C98D]";

  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent("toggle_navigation_sidebar"));
  };

  return (
    <header
      className="relative flex h-[58px] shrink-0 items-center justify-between px-3 bg-[#0E141F] border-b border-[#1F293D] text-white z-30 select-none"
    >
      {/* Left: Mobile View Controls */}
      <div className="flex lg:hidden flex-1 items-center justify-between gap-2">
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#161F2E] text-gray-300 hover:text-white"
        >
          <Menu size={18} />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={platformName} className="h-6 w-auto object-contain" />
          ) : (
            <span className="font-black text-white text-base tracking-wider">{platformName.toUpperCase()}</span>
          )}
        </div>

        {/* Mobile Account Pill */}
        <div className="relative flex items-center">
          <button
            onClick={() => setShowAccountDrop((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-[#161F2E] px-2.5 text-xs font-bold text-white"
          >
            <Send size={13} className="text-[#00C98D]" />
            <span className="font-mono text-[#00C98D]">{formatMoney(displayBalance)}</span>
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
          className="flex h-9 items-center justify-center rounded-lg bg-[#00C98D] px-3 text-xs font-bold text-black hover:bg-[#00b37d]"
        >
          + Deposit
        </button>
      </div>

      {/* Desktop Header Layout */}
      <div className="hidden lg:flex w-full items-center justify-between gap-4">
        {/* Left Section: Menu + Logo + Subtitle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1F293D] bg-[#162030] text-gray-300 hover:bg-[#1E2B3E] hover:text-white transition-colors"
            title="Toggle Menu"
          >
            <Menu size={18} />
          </button>

          <Link to="/trade" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            {logoUrl ? (
              <img src={logoUrl} alt={platformName} className="h-7 w-auto object-contain max-w-[140px]" />
            ) : (
              <span className="font-black text-lg tracking-wider text-white uppercase">{platformName}</span>
            )}
            <span className="text-[#3A495E] font-bold text-xs">•</span>
            <span className="text-[11px] font-black tracking-widest text-[#5E6B7D] uppercase">
              WEB TRADING PLATFORM
            </span>
          </Link>
        </div>

        {/* Center Section: Promotional Bonus Banner Pill */}
        <div className="flex-1 flex justify-center items-center px-4">
          <button
            onClick={onOpenDeposit}
            className="group flex items-center gap-2.5 rounded-full bg-[#00C98D] px-4 py-1.5 text-xs font-extrabold text-black shadow-lg shadow-[#00C98D]/20 hover:bg-[#00b37d] transition-all transform hover:scale-[1.02] active:scale-95"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm">🚀</span>
            <span>Get a 50% bonus on your deposit!</span>
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px] font-black text-white">50%</span>
          </button>
        </div>

        {/* Right Section: Admin Badge + Notification + Account Selector + Deposit + Withdrawal */}
        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[#00C98D]/30 bg-[#00C98D]/10 px-3 text-xs font-bold text-[#00C98D] hover:bg-[#00C98D] hover:text-black transition-colors"
              title="Admin Panel"
            >
              <ShieldCheck size={14} />
              ADMIN
            </button>
          )}

          {/* Notification Bell */}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1F293D] bg-[#162030] hover:bg-[#1E2B3E] transition-colors">
            <NotificationBell />
          </div>

          {/* Account Selector Pill */}
          <div className="relative flex items-center">
            <button
              onClick={() => setShowAccountDrop((v) => !v)}
              className="flex h-9 items-center gap-3 rounded-lg border border-[#1F293D] bg-[#162030] px-3 hover:bg-[#1E2B3E] transition-colors"
            >
              <Send size={14} className="text-[#00C98D]" />
              <div className="text-left leading-none">
                <p className={`text-[9px] font-black uppercase tracking-wider ${accountBadgeColor}`}>
                  {accountTitle}
                </p>
                <p className="mt-0.5 font-mono text-xs font-black text-white">
                  {formatMoney(displayBalance)}
                </p>
              </div>
              <ChevronDown size={14} className="text-gray-400 ml-1" />
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
            onClick={onOpenDeposit}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#00C98D] px-4 text-xs font-black text-black shadow-md shadow-[#00C98D]/20 hover:bg-[#00b37d] transition-all transform active:scale-95"
          >
            <Plus size={14} className="stroke-[3]" /> Deposit
          </button>

          {/* Withdrawal Button */}
          <button
            onClick={onOpenWithdrawal}
            className="flex h-9 items-center rounded-lg border border-[#2B3548] bg-[#1E2736] px-4 text-xs font-bold text-white hover:bg-[#283447] hover:border-gray-500 transition-colors"
          >
            Withdrawal
          </button>
        </div>
      </div>
    </header>
  );
};

export default TradingHeader;





