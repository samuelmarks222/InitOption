import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronDown, Plus, TrendingDown } from "lucide-react";
import { AccountType, AccountDropdown } from "./AccountModals";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useVip } from "@/contexts/VipContext";
import { VipBadge } from "@/components/vip/VipBadge";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { ProfileTab } from "@/components/profile/ProfileDrawer";
import { KycAvatarBadge } from "@/components/profile/KycAvatarBadge";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { normalizeKycStatus } from "@/lib/kyc";
import { useSiteBranding } from "@/hooks/useSiteBranding";

interface TradingHeaderProps {
  balance: number;
  demoBalance: number;
  accountType: AccountType;
  onSwitchAccount: (type: AccountType) => void;
  activeTabId?: string;
  onSelectTab?: (tabId: string) => void;
  openTabs: any[];
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
  const [showAccountDrop, setShowAccountDrop] = useState(false);
  const { profile } = useAuth();
  const { vip } = useVip();
  const { formatMoney } = useCurrency();
  const { logoUrl, platformName, initials } = useSiteBranding();

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mobile_account_dropdown", { detail: { open: showAccountDrop } }));
    return () => {
      window.dispatchEvent(new CustomEvent("mobile_account_dropdown", { detail: { open: false } }));
    };
  }, [showAccountDrop]);

  const liveBalance = profile ? getEffectiveLiveBalance(profile) : balance;
  const profileDocuments = ((profile as any)?.kyc_documents ?? (profile as any)?.kycDocuments) ?? {};
  const kycStatus = normalizeKycStatus((profile as any)?.kyc_status ?? (profile as any)?.kycStatus);
  const displayBalance =
    accountType === "demo" ? demoBalance : accountType === "tournament" ? balance : liveBalance;
  const profileAlias = typeof (profile as { username?: string } | null)?.username === "string"
    ? (profile as { username?: string }).username
    : "";
  const profileDisplayName = profileAlias?.trim() || profile?.email?.split("@")[0]?.trim() || "My account";
  const profileInitial = profileDisplayName.charAt(0).toUpperCase();
  const accountTitle =
    accountType === "demo" ? "Demo account" :
    accountType === "tournament" ? "Tournament account" :
    "Live account";
  const accountNameTextClass =
    accountType === "demo"
      ? "text-[#ff9f00]"
      : accountType === "tournament"
        ? "text-[#4e89ff]"
        : "text-[#00C076]";
  const balanceTextClass =
    accountType === "demo"
      ? "text-blue-400"
      : accountType === "tournament"
        ? "text-[#00C076]"
        : "text-white";

  const accountLabel =
    accountType === "demo" ? "DEMO" :
    accountType === "tournament" ? "TOUR" :
    "LIVE";

  return (
    <header
      className="flex items-stretch justify-between shrink-0 relative z-30"
      style={{
        background: "#1c1f2d",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        height: "72px",
      }}
    >
      <div className="flex lg:hidden flex-1 items-center justify-between px-3 gap-2">
        <div className="rounded-[12px] border border-white/5 bg-[#151c28] shadow-[0_10px_24px_rgba(7,12,22,0.22)]">
          <NotificationBell mobile />
        </div>

        <button
          onClick={() => onOpenProfile()}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] border border-white/5 bg-[#151c28] shadow-[0_10px_24px_rgba(7,12,22,0.22)] transition-colors hover:bg-white/[0.07]"
        >
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8244d6,#b95cf1)] text-sm font-black text-white">
                {profileInitial}
              </div>
            )}
            <KycAvatarBadge status={kycStatus} documents={profileDocuments} size="sm" className="-bottom-0.5 -right-0.5" />
          </div>
        </button>

        <div className="relative flex items-center min-w-0 flex-1">
          <button
            onClick={() => setShowAccountDrop((value) => !value)}
            className="flex h-[40px] min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-white/5 bg-[#151c28] px-3 shadow-[0_10px_24px_rgba(7,12,22,0.22)] transition-colors hover:bg-white/[0.07]"
          >
            <div className="min-w-0 flex-1">
              <div className={`text-[9px] font-black uppercase tracking-[0.18em] ${accountNameTextClass}`}>{accountLabel}</div>
              <div className={`truncate text-[14px] font-black ${balanceTextClass}`}>{formatMoney(displayBalance)}</div>
            </div>
            <VipBadge tierId={vip.currentTier.id} size={18} />
            <ChevronDown className="h-3 w-3 text-gray-400" />
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
          data-deposit-trigger="true"
          onClick={onOpenDeposit}
          className={`relative px-3 sm:px-5 h-[34px] rounded-lg text-[12px] sm:text-[13px] font-black text-white transition-all active:scale-95 shrink-0 ${
            highlightDepositButton ? "ring-2 ring-[#8ff6bb] ring-offset-2 ring-offset-[#1c1f2d] animate-pulse" : ""
          }`}
          style={{ background: "#18a038", boxShadow: highlightDepositButton ? "0 0 0 1px rgba(143,246,187,0.35), 0 10px 24px rgba(24,160,56,0.42)" : "0 2px 8px rgba(24,160,56,0.4)" }}
        >
          Deposit
          {highlightDepositButton && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#18a038] shadow-[0_8px_18px_rgba(0,0,0,0.32)]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          )}
        </button>
      </div>

      <div className="hidden lg:flex flex-1 min-w-0 items-stretch justify-between gap-3">
        <Link
          to="/"
          className="flex h-full min-w-[220px] shrink items-center gap-4 border-r px-4 xl:min-w-[320px] xl:px-6"
          style={{ borderColor: "hsl(228 15% 14%)" }}
        >
          {logoUrl ? (
            <div className="flex items-center h-full w-full max-w-[320px]">
              <img src={logoUrl} alt={platformName} className="h-full max-h-[64px] w-full object-contain object-left" />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-[24px] shrink-0"
                style={{ background: "linear-gradient(135deg, #0f9d58, #34a853)", boxShadow: "0 0 14px rgba(52,168,83,0.45)" }}
              >
                {initials}
              </div>
              <div className="flex flex-col leading-none gap-1">
                <span className="text-white font-black text-[24px] tracking-[0.12em] uppercase">{platformName}</span>
                <span className="text-gray-500 text-[11px] tracking-[0.22em] uppercase font-medium">Web Trading Platform</span>
              </div>
            </div>
          )}
        </Link>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 pr-2 xl:flex-nowrap">
          <div className="rounded-[14px] border border-white/5 bg-[#151c28] shadow-[0_12px_30px_rgba(7,12,22,0.24)]">
            <NotificationBell />
          </div>

          <div className="relative h-[46px] flex items-center">
            <button
              onClick={() => onOpenProfile()}
              className="group flex h-full items-center gap-3 rounded-[16px] border border-white/5 bg-[#151c28] px-3.5 shadow-[0_12px_30px_rgba(7,12,22,0.24)] transition-all hover:border-white/10 hover:bg-white/[0.06]"
            >
              <div className="relative shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8244d6,#b95cf1)] text-[15px] font-black text-white ring-1 ring-white/10">
                    {profileInitial}
                  </div>
                )}
                <KycAvatarBadge status={kycStatus} documents={profileDocuments} />
              </div>

              <div className="min-w-0 text-left">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7f8ea8]">Profile</div>
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
            >
              <div className="min-w-0 text-left">
                <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${accountNameTextClass}`}>{accountTitle}</div>
                <div className="flex items-center gap-2">
                  <span className={`truncate text-[15px] font-black ${balanceTextClass}`}>
                    {formatMoney(displayBalance)}
                  </span>
                  {accountType === "live" && <TrendingDown className="h-3.5 w-3.5 shrink-0 text-red-400" />}
                </div>
              </div>

              <div className="flex h-8 items-center gap-2 border-l border-white/6 pl-3">
                <VipBadge tierId={vip.currentTier.id} size={22} />
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
            style={{ background: "#18a038", boxShadow: highlightDepositButton ? "0 0 0 1px rgba(143,246,187,0.35), 0 10px 24px rgba(24,160,56,0.34)" : "0 2px 5px rgba(24,160,56,0.2)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Deposit
            {highlightDepositButton && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#18a038] shadow-[0_8px_18px_rgba(0,0,0,0.32)]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            )}
          </button>

          <button
            onClick={onOpenWithdrawal}
            className="flex h-[38px] items-center gap-1.5 rounded px-3 text-[13px] font-bold text-white xl:px-4"
            style={{ background: "hsl(228 16% 22%)", border: "1px solid hsl(228 15% 30%)" }}
          >
            Withdrawal
          </button>
        </div>
      </div>
    </header>
  );
};

export default TradingHeader;
