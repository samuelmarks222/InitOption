import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronDown, Plus, ShieldCheck, TrendingDown } from "lucide-react";
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

const CHART_LAYOUT_OPTIONS: Array<{ mode: ChartLayoutMode; label: string; caption: string }> = [
  { mode: 1, label: "1 screen", caption: "Single chart" },
  { mode: 2, label: "2 screen", caption: "Dual layout" },
  { mode: 3, label: "3 screen", caption: "Triple layout" },
  { mode: 4, label: "4 screen", caption: "Quad layout" },
];

const isHeaderChartLayoutMode = (value: unknown): value is ChartLayoutMode =>
  value === 1 || value === 2 || value === 3 || value === 4;

const SplitScreenIcon = ({ active = false }: { active?: boolean }) => (
  <span className="grid h-[18px] w-[18px] grid-cols-2 gap-[3px]">
    {Array.from({ length: 4 }).map((_, index) => (
      <span
        key={index}
        className="rounded-[2px]"
        style={{ background: active ? "var(--trading-active-color)" : "var(--trading-muted-color)" }}
      />
    ))}
  </span>
);

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
  const { isStaff } = useStaffAccess();
  const { vip } = useVip();
  const { formatMoney } = useCurrency();
  const { platformName, initials, logoUrl } = useSiteBranding();
  const headerLogoUrl = logoUrl;
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
      if (isHeaderChartLayoutMode(mode)) {
        setChartLayoutMode(mode);
      }
    };

    window.addEventListener(TRADE_CHART_LAYOUT_MODE_CHANGED_EVENT, handleLayoutModeChanged as EventListener);
    return () => window.removeEventListener(TRADE_CHART_LAYOUT_MODE_CHANGED_EVENT, handleLayoutModeChanged as EventListener);
  }, []);

  useEffect(() => {
    if (!showChartLayoutMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!chartLayoutMenuRef.current?.contains(event.target as Node)) {
        setShowChartLayoutMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowChartLayoutMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showChartLayoutMenu]);

  const liveBalance = profile ? getStoredLiveBalance(profile) : balance;
  const profileDocuments: KycDocumentsLike = (profile?.kyc_documents ?? profile?.kycDocuments) ?? {};
  const kycStatus = normalizeKycStatus(profile?.kyc_status ?? profile?.kycStatus);
  const displayBalance =
    accountType === "demo" ? demoBalance : accountType === "tournament" ? balance : liveBalance;
  const profileAlias = typeof profile?.username === "string" ? profile.username : "";
  const profileDisplayName = profileAlias?.trim() || profile?.email?.split("@")[0]?.trim() || "My account";
  const profileInitial = profileDisplayName.charAt(0).toUpperCase();
  const accountTitle =
    accountType === "demo" ? t("tradingHeader.demoAccount") :
    accountType === "tournament" ? t("tradingHeader.tournamentAccount") :
    t("tradingHeader.liveAccount");
  const accountNameTextClass =
    accountType === "demo"
      ? "text-[#8f9bb3] font-bold"
      : accountType === "tournament"
        ? "text-[#4e89ff]"
        : "text-[#00C076]";
  const balanceTextClass =
    accountType === "demo"
      ? "text-white"
      : accountType === "tournament"
        ? "text-[#00C076]"
        : "text-white";

  const accountLabel =
    accountType === "demo" ? "DEMO" :
    accountType === "tournament" ? "TOUR" :
    "LIVE";
  const mobileAccountAmountClass =
    accountType === "demo"
      ? "text-white"
      : accountType === "tournament"
        ? "text-[#7eb6ff]"
        : "text-white";
  const headerSubtitle = t("tradingHeader.subtitle");
  const applyChartLayoutMode = (mode: ChartLayoutMode) => {
    setChartLayoutMode(mode);
    setShowChartLayoutMenu(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(TRADE_CHART_LAYOUT_SET_EVENT, { detail: { mode } }));
    }
  };

  return (
    <header
      className={`relative flex shrink-0 items-stretch justify-between ${showAccountDrop || showChartLayoutMenu ? "z-[90]" : "z-30"}`}
      style={{
        background: "var(--trading-header-bg)",
        borderBottom: "1px solid var(--trading-border-color)",
        height: "72px",
      }}
    >
      <div className="flex lg:hidden flex-1 items-center justify-between px-3 gap-2">
        <div className="rounded-[12px] border border-white/5 bg-[#151c28] shadow-[0_10px_24px_rgba(7,12,22,0.22)]">
          <NotificationBell mobile />
        </div>

        {isStaff && (
          <button
            onClick={() => navigate("/admin")}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] border border-white/5 bg-[#151c28] shadow-[0_10px_24px_rgba(7,12,22,0.22)] transition-colors hover:bg-white/[0.07]"
            title={t("tradingHeader.adminPanel")}
            aria-label={t("tradingHeader.adminPanel")}
          >
            <ShieldCheck className="h-[18px] w-[18px]" style={{ color: "var(--trading-active-color)" }} />
          </button>
        )}

        <button
          onClick={() => onOpenProfile()}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] border border-white/5 bg-[#151c28] shadow-[0_10px_24px_rgba(7,12,22,0.22)] transition-colors hover:bg-white/[0.07]"
        >
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={t("tradingHeader.avatar")} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2f80ed,#1e2330)] text-sm font-black text-white">
                {profileInitial}
              </div>
            )}
            <KycAvatarBadge status={kycStatus} documents={profileDocuments} size="sm" className="-bottom-0.5 -right-0.5" />
          </div>
        </button>

        <div className="relative flex items-center min-w-0 flex-1">
          <button
            id="tour-account-switch"
            onClick={() => setShowAccountDrop((value) => !value)}
            className="flex h-[40px] min-w-0 flex-1 items-center gap-0 overflow-hidden rounded-[12px] border border-white/6 bg-[#141b27] shadow-[0_10px_24px_rgba(7,12,22,0.22)] transition-colors hover:bg-white/[0.07]"
          >
            <div className="min-w-0 flex flex-1 items-center gap-2 px-3">
              <span
                className={`shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] ${accountNameTextClass}`}
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                {accountLabel}
              </span>
              <span className={`min-w-0 truncate font-display text-[15px] font-bold ${mobileAccountAmountClass}`}>
                {formatMoney(displayBalance)}
              </span>
            </div>
            <div className="flex h-full w-9 shrink-0 items-center justify-center border-l border-white/8 bg-white/[0.03]">
              <ChevronDown className="h-3.5 w-3.5 text-gray-300" />
            </div>
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

        <button
          onClick={() => navigate("/admin")}
          className="relative px-3 sm:px-4 h-[34px] rounded-lg text-[12px] sm:text-[13px] font-black text-white transition-all active:scale-95 shrink-0"
          style={{
            background: "var(--trading-control-bg)",
            border: "1px solid var(--trading-control-border)",
            color: "var(--trading-active-color)",
            boxShadow: "var(--trading-control-shadow)",
          }}
          title={t("tradingHeader.adminPanel")}
        >
          <ShieldCheck className="h-4 w-4 inline-block mr-1.5" />
          {t("tradingHeader.admin")}
        </button>

        <button
          id="tour-deposit-button"
          data-deposit-trigger="true"
          onClick={onOpenDeposit}
          className={`relative px-3 sm:px-5 h-[34px] rounded-lg text-[12px] sm:text-[13px] font-black text-white transition-all active:scale-95 shrink-0 ${
            highlightDepositButton ? "ring-2 ring-[#8ff6bb] ring-offset-2 ring-offset-[#1c1f2d] animate-pulse" : ""
          }`}
          style={{
            background: "var(--trading-up-color, var(--trading-success-color))",
            color: "var(--trading-success-contrast-color)",
            boxShadow: highlightDepositButton ? "var(--trading-success-focus-shadow)" : "var(--trading-success-shadow)",
          }}
        >
          {t("tradingHeader.depositButton")}
          {highlightDepositButton && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#18a038] shadow-[0_8px_18px_rgba(0,0,0,0.32)]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          )}
        </button>

      </div>

      <div className="hidden lg:flex flex-1 min-w-0 items-stretch justify-between gap-3">
        <div className="flex min-w-0 items-stretch">
          <Link
            to="/trade"
            className="flex h-full min-w-[260px] shrink items-center border-r px-4 xl:min-w-[430px] xl:px-6"
            style={{ borderColor: "var(--trading-border-strong-color)" }}
          >
            {headerLogoUrl ? (
              <div className="flex min-w-0 items-center gap-3 overflow-visible xl:gap-4">
                <div className="flex min-h-[50px] min-w-0 max-w-[240px] shrink items-center overflow-visible py-1 xl:min-h-[54px] xl:max-w-[300px] 2xl:max-w-[340px]">
                  <img
                    src={headerLogoUrl}
                    alt={platformName}
                    className="block max-h-[42px] w-auto max-w-full shrink-0 object-contain object-left brightness-110 contrast-125 saturate-110 xl:max-h-[46px]"
                    style={{ filter: "var(--trading-logo-filter)" }}
                  />
                </div>
                <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-white/14 xl:block" />
                <span className="hidden whitespace-nowrap font-copy text-[12px] uppercase tracking-[0.13em] text-slate-500 xl:block" style={{ fontWeight: 900 }}>
                  {t("tradingHeader.subtitle")}
                </span>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-[24px] shrink-0"
                  style={{
                    background: "linear-gradient(135deg, var(--trading-success-color), color-mix(in srgb, var(--trading-success-color) 72%, var(--trading-panel-bg)))",
                    boxShadow: "var(--trading-success-shadow)",
                  }}
                >
                  {initials}
                </div>
                <div className="flex min-w-0 items-center gap-3 xl:gap-4">
                  <span className="truncate text-white font-black text-[24px] tracking-[0.12em] uppercase">{platformName}</span>
                  <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-white/14 xl:block" />
                  <span className="hidden whitespace-nowrap text-gray-500 text-[11px] tracking-[0.22em] uppercase xl:block" style={{ fontWeight: 900 }}>
                    {t("tradingHeader.subtitle")}
                  </span>
                </div>
              </div>
            )}
          </Link>

          <div
            ref={chartLayoutMenuRef}
            className="relative flex shrink-0 items-center border-r px-3"
            style={{ borderColor: "var(--trading-border-strong-color)" }}
          >
            <button
              type="button"
              onClick={() => setShowChartLayoutMenu((current) => !current)}
              className={`flex h-[40px] w-[40px] items-center justify-center rounded-[10px] border shadow-[0_12px_24px_rgba(7,12,22,0.2)] transition-all ${
                showChartLayoutMenu
                  ? "border-[#5a84b8]/55 bg-[#1e3656]"
                  : "border-white/8 bg-[#121a27] hover:border-white/14 hover:bg-white/[0.06]"
              }`}
              style={{
                background: showChartLayoutMenu ? "var(--trading-tool-active-bg)" : "var(--trading-control-bg)",
                borderColor: showChartLayoutMenu ? "var(--trading-tool-active-border)" : "var(--trading-control-border)",
              }}
              title={t("tradingHeader.multiScreenLayout")}
              aria-label={t("tradingHeader.multiScreenLayout")}
            >
              <SplitScreenIcon active={showChartLayoutMenu || chartLayoutMode > 1} />
            </button>

            {showChartLayoutMenu && (
              <div
                className="absolute left-3 top-[calc(100%+10px)] z-[110] w-[220px] overflow-hidden rounded-[14px] border p-2 shadow-[0_24px_54px_rgba(0,0,0,0.48)] backdrop-blur-sm"
                style={{ background: "var(--trading-menu-bg)", borderColor: "var(--trading-menu-border)" }}
              >
                <div className="px-2 pb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {t("tradingHeader.multiScreen")}
                </div>
                <div className="grid gap-1.5">
                  {CHART_LAYOUT_OPTIONS.map((option) => {
                    const selected = chartLayoutMode === option.mode;
                    return (
                      <button
                        key={option.mode}
                        type="button"
                        onClick={() => applyChartLayoutMode(option.mode)}
                        className={`flex items-center justify-between rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
                          selected
                            ? "border-[#4ab783]/70 bg-[#1d3a31] text-[#ccf8e3]"
                            : "border-white/8 bg-[#1a2435]/85 text-slate-200 hover:bg-[#233249]"
                        }`}
                      >
                        <div>
                          <div className="text-[12px] font-black uppercase tracking-[0.06em]">{option.label}</div>
                          <div className="mt-0.5 text-[11px] font-semibold text-slate-400">{option.caption}</div>
                        </div>
                        <div className="flex h-8 w-12 items-center justify-center rounded-md border border-white/10 bg-[#0f1623]">
                          <div className={`grid h-5 w-9 gap-[1px] ${option.mode <= 2 ? "grid-cols-2 grid-rows-1" : "grid-cols-2 grid-rows-2"}`}>
                            {Array.from({ length: option.mode === 3 ? 4 : option.mode }).map((_, index) => (
                              <span
                                key={`${option.mode}-${index}`}
                                className={`rounded-[2px] ${
                                  option.mode === 3 && index === 1
                                    ? "bg-[#20344a]/70 opacity-55"
                                    : "bg-[#7cb8ff]/55"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 pr-2 xl:flex-nowrap">
          {isStaff && (
            <button
              onClick={() => navigate("/admin")}
              className="flex h-[46px] items-center gap-2 rounded-[14px] border px-3.5 text-[13px] font-bold text-white transition-all hover:border-white/10 hover:bg-white/[0.06]"
              style={{ background: "var(--trading-control-bg)", borderColor: "var(--trading-control-border)" }}
              title={t("tradingHeader.adminPanel")}
            >
              <ShieldCheck className="h-4 w-4" style={{ color: "var(--trading-active-color)" }} />
              {t("tradingHeader.admin")}
            </button>
          )}
          <div

            className="rounded-[14px] border shadow-[0_12px_30px_rgba(7,12,22,0.24)]"
            style={{ background: "var(--trading-control-bg)", borderColor: "var(--trading-control-border)" }}
          >
            <NotificationBell />
          </div>

          <div className="relative h-[46px] flex items-center">
            <button
              onClick={() => onOpenProfile()}
              className="group flex h-full items-center gap-3 rounded-[16px] border border-white/5 bg-[#151c28] px-3.5 shadow-[0_12px_30px_rgba(7,12,22,0.24)] transition-all hover:border-white/10 hover:bg-white/[0.06]"
              style={{ background: "var(--trading-control-bg)", borderColor: "var(--trading-control-border)" }}
            >
              <div className="relative shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={t("tradingHeader.avatar")} className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2f80ed,#1e2330)] text-[15px] font-black text-white ring-1 ring-white/10">
                    {profileInitial}
                  </div>
                )}
                <KycAvatarBadge status={kycStatus} documents={profileDocuments} />
              </div>

              <div className="min-w-0 text-left">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7f8ea8]">{t("tradingHeader.profile")}</div>
                <div className="max-w-[92px] truncate text-[13px] font-semibold text-white xl:max-w-[126px]">{profileDisplayName}</div>
              </div>

              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500 transition-colors group-hover:text-gray-300" />
            </button>
          </div>
          <div className="relative h-[46px] flex items-center">
            <button
              id="tour-account-switch"
              onClick={() => setShowAccountDrop((value) => !value)}
              className="group flex h-full items-center gap-3 rounded-[16px] border border-white/5 bg-[#151c28] px-3 shadow-[0_12px_30px_rgba(7,12,22,0.24)] transition-all hover:border-white/10 hover:bg-white/[0.06] xl:px-3.5"
              style={{ background: "var(--trading-control-bg)", borderColor: "var(--trading-control-border)" }}
            >
              <div className="min-w-0 text-left">
                <div className={`font-copy text-[10px] font-black uppercase tracking-[0.18em] ${accountNameTextClass}`}>{accountTitle}</div>
                <div className="flex items-center gap-2">
                  <span className={`font-display truncate text-[15px] font-bold ${balanceTextClass}`}>
                    {formatMoney(displayBalance)}
                  </span>
                  {accountType === "live" && <TrendingDown className="h-3.5 w-3.5 shrink-0 text-red-400" />}
                </div>
              </div>

              <div className="flex h-8 items-center gap-2 border-l border-white/6 pl-3">
                <VipBadge tierId={vip.currentTier.id} size={32} />
                <ChevronDown className="h-3.5 w-3.5 text-gray-500 transition-colors group-hover:text-gray-300" />
              </div>
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

          <button
            id="tour-deposit-button"
            data-deposit-trigger="true"
            onClick={onOpenDeposit}
            className={`relative flex h-[38px] items-center gap-1.5 rounded px-3 text-[13px] font-bold text-white xl:px-4 ${
              highlightDepositButton ? "ring-2 ring-[#8ff6bb] ring-offset-2 ring-offset-[#1c1f2d] animate-pulse" : ""
            }`}
            style={{
              background: "var(--trading-up-color, var(--trading-success-color))",
              color: "var(--trading-success-contrast-color)",
              boxShadow: highlightDepositButton ? "var(--trading-success-focus-shadow)" : "var(--trading-success-shadow)",
            }}
          >
            <Plus className="w-3.5 h-3.5" /> {t("tradingHeader.deposit")}
            {highlightDepositButton && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#18a038] shadow-[0_8px_18px_rgba(0,0,0,0.32)]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            )}
          </button>

          <button
            onClick={onOpenWithdrawal}
            className="flex h-[38px] items-center gap-1.5 rounded px-3 text-[13px] font-bold text-white xl:px-4"
            style={{ background: "var(--trading-control-bg)", border: "1px solid var(--trading-control-border)" }}
          >
            {t("tradingHeader.withdrawal")}
          </button>
        </div>
      </div>
    </header>
  );
};

export default TradingHeader;




