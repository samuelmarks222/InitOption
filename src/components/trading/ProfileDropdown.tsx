import { useState } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "react-i18next";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

interface Props {
  email?: string;
  accountId?: string;
  balance?: number;
  demoBalance?: number;
  currency?: string;
  onClose: () => void;
  onDeposit?: () => void;
  onWithdrawal?: () => void;
  onPayments?: () => void;
  onTrades?: () => void;
  onReferrals?: () => void;
  onMyAccount?: () => void;
  onLogout?: () => void;
}

const ProfileDropdown = ({
  email = "harleywilson802@gmail.com",
  accountId = "84560898",
  balance = 0.17,
  demoBalance = 9871.66,
  currency = "USD",
  onClose,
  onDeposit,
  onWithdrawal,
  onPayments,
  onTrades,
  onReferrals,
  onMyAccount,
  onLogout,
}: Props) => {
  const [selected, setSelected] = useState<"live" | "demo">("demo");
  const { formatMoney } = useCurrency();
  const { t } = useTranslation();
  const { isAdmin } = useStaffAccess();
  const navigate = useNavigate();

  return (
    <>
      <div className="fixed inset-0 z-[110]" onClick={onClose} />
      <div
        className="fixed left-2 right-2 top-[58px] z-[120] mx-auto w-auto max-w-[540px] overflow-hidden rounded-xl border border-[#2b3149] shadow-2xl lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-3 lg:w-[540px]"
      >
        <div className="flex flex-row">
          {/* ── Left Column: Account Details ── */}
          <div className="flex-1 bg-[#1c2030] p-4 flex flex-col gap-3">
            {/* Tier Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                <span className="text-[11px] font-bold text-white tracking-wide">{t("profileDropdown.tierStandardLabel")}</span>
                <span className="text-[11px] text-gray-400">{t("profileDropdown.tierProfitLabel")}</span>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate("/admin");
                  }}
                  className="flex items-center gap-1 rounded bg-[#0fa055]/20 border border-[#0fa055]/40 px-2 py-0.5 text-[10px] font-black text-[#0fa055] hover:bg-[#0fa055] hover:text-white transition"
                >
                  <ShieldCheck size={12} />
                  ADMIN PANEL
                </button>
              )}
            </div>

            {/* Email + ID */}
            <div>
              <div className="text-[13px] font-bold text-white truncate">{email}</div>
              <div className="text-[11px] text-gray-500">{t("profileDropdown.idLabel")} {accountId}</div>
            </div>

            {/* Currency */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400">{t("profileDropdown.currencyLabel")}</span>
                <span className="text-[11px] font-bold text-white">{currency}</span>
              </div>
              <button
                type="button"
                className="rounded bg-[#3b82f6] px-2.5 py-1 text-[9px] font-black text-white tracking-widest hover:bg-blue-600 transition"
              >
                {t("profileDropdown.changeButton")}
              </button>
            </div>

            {/* Live Account */}
            <div className="flex items-start justify-between rounded-lg border border-white/5 p-2.5">
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelected("live")}
                  className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition ${
                    selected === "live" ? "border-[#3b82f6]" : "border-gray-500"
                  }`}
                >
                  {selected === "live" && <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />}
                </button>
                <div>
                  <div className="text-[12px] font-bold text-white">{t("profileDropdown.liveAccount")}</div>
                  <div className="mt-0.5 text-[13px] font-bold text-emerald-400">{formatMoney(balance)}</div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className="text-[10px] text-gray-500">{t("profileDropdown.dailyLimitNotSet")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/5" />

            {/* Demo Account */}
            <div className="flex items-start justify-between rounded-lg border border-white/5 p-2.5">
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelected("demo")}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#3b82f6] flex items-center justify-center"
                >
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </button>
                <div>
                  <div className="text-[12px] font-bold text-white">{t("profileDropdown.demoAccount")}</div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-emerald-400">{formatMoney(demoBalance)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Quick Actions ── */}
          <div className="w-[140px] bg-[#000000] p-4 flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              {[
                { label: t("profileDropdown.deposit"), onClick: onDeposit },
                { label: t("profileDropdown.withdrawal"), onClick: onWithdrawal },
                { label: t("profileDropdown.payments"), onClick: onPayments },
                { label: t("profileDropdown.trades"), onClick: onTrades },
                { label: t("profileDropdown.referrals"), onClick: onReferrals },
                { label: t("profileDropdown.myAccount"), onClick: onMyAccount },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className="text-left text-[11px] font-medium tracking-wide text-gray-400 hover:text-white transition"
                >
                  {item.label}
                </button>
              ))}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate("/admin");
                  }}
                  className="text-left text-[11px] font-bold tracking-wide text-[#0fa055] hover:text-emerald-400 transition"
                >
                  ⚡ Admin Panel
                </button>
              )}
            </div>

            <div className="border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 text-[11px] font-bold text-[#f97316] hover:text-orange-400 transition"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                {t("profileDropdown.logout")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileDropdown;
