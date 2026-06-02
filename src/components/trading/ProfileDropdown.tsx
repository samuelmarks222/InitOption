import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Camera, User, DollarSign, HelpCircle, Clock, History, Settings, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthProfile } from "@/types/profile";

interface ProfileDropdownProps {
  balance: number;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

const MENU_ITEMS = [
  { icon: Camera, label: "profileDropdown.uploadPhoto", action: "photo" },
  { icon: User, label: "profileDropdown.personalData", action: "personal" },
  { icon: DollarSign, label: "profileDropdown.depositFunds", action: "deposit" },
  { icon: HelpCircle, label: "profileDropdown.contactSupport", action: "support" },
  { icon: Clock, label: "profileDropdown.balanceHistory", action: "balance" },
  { icon: History, label: "profileDropdown.tradingHistory", action: "history" },
  { icon: Settings, label: "profileDropdown.settings", action: "settings" },
  { icon: LogOut, label: "profileDropdown.logOut", action: "logout" },
];

const ProfileDropdown = ({ balance, onClose, onOpenSettings, onOpenHistory }: ProfileDropdownProps) => {
  const { t } = useTranslation();
  const { signOut, profile, user } = useAuth();
  const navigate = useNavigate();
  const profileData: AuthProfile | null = profile;

  const completionChecks = [
    Boolean(profileData?.username?.trim()),
    Boolean(user?.email),
    Boolean(profileData?.firstName?.trim()),
    Boolean(profileData?.lastName?.trim()),
    Boolean(profileData?.phone?.trim()),
    Boolean(profileData?.nationality?.trim()),
    Boolean(profileData?.address?.trim()),
    Boolean(profileData?.kyc_documents?.front?.url || profileData?.kycDocuments?.front?.url),
    Boolean(profileData?.kyc_documents?.back?.url || profileData?.kycDocuments?.back?.url),
  ];

  const completionPercent = Math.max(
    11,
    Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100),
  );
  const displayName = profileData?.username?.trim() || user?.email || "My account";
  const countryLabel = profileData?.nationality?.trim() || t("profileDropdown.countryNotSet");
  const registeredAt = profileData?.created_at
    ? new Date(profileData.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : t("profileDropdown.dateNotAvailable");
  const accountId = (profile?.id ?? user?.id ?? "").replace(/-/g, "").slice(0, 8).toUpperCase() || "--------";

  const handleAction = async (action: string) => {
    switch (action) {
      case "deposit":
        navigate("/deposit");
        onClose();
        break;
      case "settings":
        onOpenSettings();
        onClose();
        break;
      case "history":
        onOpenHistory();
        onClose();
        break;
      case "logout":
        await signOut();
        navigate("/login");
        break;
      default:
        onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-1 w-[320px] overflow-hidden rounded-lg border border-white/10 bg-[#1a1b20] shadow-2xl">
        <div className="border-b border-white/5 bg-gradient-to-br from-[#22242a] to-[#1a1b20] p-5">
          <div className="mb-4 flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="#2a2d35" strokeWidth="4" />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke="#ff6200"
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 24 * completionPercent / 100} ${2 * Math.PI * 24 * (1 - completionPercent / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">{completionPercent}%</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{displayName}</div>
              <div className="mt-2 flex items-center gap-2">
                <ChevronDown className="h-4 w-4 text-trading-orange" />
                <span className="text-lg font-bold text-trading-orange">${balance.toFixed(2)}</span>
                <ChevronDown className="h-4 w-4 text-trading-orange" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-[#2a2d35] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-trading-orange/30 bg-trading-orange/10 text-xs font-bold text-trading-orange">
              {completionPercent}%
            </div>
            <div>
              <div className="text-sm text-foreground">{t("profileDropdown.tourPrompt1")}</div>
              <div className="text-sm font-semibold text-foreground">{t("profileDropdown.tourPrompt2")}</div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("profileDropdown.countryLabel")}</span>
            <span className="text-sm text-foreground">{countryLabel}</span>
          </div>
          <div className="mt-2 flex gap-8 text-xs">
            <div>
                <div className="text-muted-foreground">{t("profileDropdown.dateRegistered")}</div>
              <div className="mt-0.5 text-foreground">{registeredAt}</div>
            </div>
            <div>
                <div className="text-muted-foreground">{t("profileDropdown.userId")}</div>
              <div className="mt-0.5 text-foreground">{accountId}</div>
            </div>
          </div>
        </div>

        <div>
          {MENU_ITEMS.map((item) => (
            <button
              key={item.action}
              onClick={() => handleAction(item.action)}
              className={`w-full border-b border-white/5 px-5 py-3 text-sm transition-colors last:border-0 ${
                item.action === "logout"
                  ? "flex items-center gap-3 text-red-400 hover:bg-red-400/10"
                  : "flex items-center gap-3 text-foreground hover:bg-white/5"
              }`}
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              {t(item.label)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default ProfileDropdown;
