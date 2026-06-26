import { useEffect, useState } from "react";
import { BadgeDollarSign, History, LogOut, MessageCircle, Settings, User, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileTour } from "@/contexts/ProfileTourContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useVip } from "@/contexts/VipContext";
import { VipBadge } from "@/components/vip/VipBadge";
import { KycAvatarBadge } from "./KycAvatarBadge";
import { ProfilePersonalData } from "./ProfilePersonalData";
import { ProfileDeposit } from "./ProfileDeposit";
import { ProfileSupport } from "./ProfileSupport";
import { ProfileBalanceHistory } from "./ProfileBalanceHistory";
import { ProfileTradingHistory } from "./ProfileTradingHistory";
import { ProfileSettings } from "./ProfileSettings";
import { normalizeKycStatus } from "@/lib/kyc";

export type ProfileTab = "personal" | "deposit" | "support" | "balance_history" | "trading_history" | "settings";

type PersonalGuideTarget = {
  field: string;
  label: string;
};

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  initialTab?: ProfileTab;
}

const TAB_ITEMS: Array<{ id: ProfileTab; label: string; icon: typeof User }> = [
  { id: "personal", label: "My account", icon: User },
  { id: "balance_history", label: "Transactions", icon: BadgeDollarSign },
  { id: "trading_history", label: "Trades", icon: History },
  { id: "deposit", label: "Deposit", icon: BadgeDollarSign },
  { id: "support", label: "Support", icon: MessageCircle },
  { id: "settings", label: "Settings", icon: Settings },
];

export const ProfileDrawer = ({ isOpen, onClose, balance, initialTab = "personal" }: ProfileDrawerProps) => {
  const { emailVerified, profile, signOut, user } = useAuth();
  const { markStepCompleted } = useProfileTour();
  const { formatMoney } = useCurrency();
  const { vip } = useVip();
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [personalGuideTarget, setPersonalGuideTarget] = useState<PersonalGuideTarget | null>(null);

  const p = profile as any;
  const profileDocuments = (p?.kyc_documents ?? p?.kycDocuments) ?? {};
  const kycStatus = normalizeKycStatus(p?.kyc_status ?? p?.kycStatus);
  const accountId = (profile?.id ?? "--------").replace(/-/g, "").slice(0, 8).toUpperCase();
  const registeredAt = p?.created_at
    ? new Date(p.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not available";

  const getNextPersonalGuideTarget = (): PersonalGuideTarget | null => {
    const checks = [
      { field: "username", label: "Add your nickname", completed: Boolean(String(p?.username || "").trim()) },
      { field: "firstName", label: "Add your first name", completed: Boolean(String(p?.firstName || "").trim()) },
      { field: "lastName", label: "Add your last name", completed: Boolean(String(p?.lastName || "").trim()) },
      { field: "dob", label: "Add your date of birth", completed: Boolean(String(p?.dob || "").trim()) },
      { field: "nationality", label: "Select your country", completed: Boolean(String(p?.nationality || "").trim()) },
      { field: "phone", label: "Add your phone number", completed: Boolean(String(p?.phone || "").trim()) },
      { field: "address", label: "Add your address", completed: Boolean(String(p?.address || "").trim()) },
      { field: "idType", label: "Select your ID type", completed: Boolean(String(p?.idType || "").trim()) },
      { field: "idNumber", label: "Add your ID number", completed: Boolean(String(p?.idNumber || "").trim()) },
      {
        field: "frontDocument",
        label: "Upload the front of your ID",
        completed: Boolean(p?.kyc_documents?.front?.url || p?.kycDocuments?.front?.url),
      },
      {
        field: "backDocument",
        label: "Upload the back of your ID",
        completed: Boolean(p?.kyc_documents?.back?.url || p?.kycDocuments?.back?.url),
      },
    ];

    const next = checks.find((item) => !item.completed);
    return next ? { field: next.field, label: next.label } : null;
  };

  useEffect(() => {
    const completedIds = [
      emailVerified && "email",
      !!p?.phone && "phone",
      !!(p?.firstName && p?.lastName && p?.nationality && p?.address && p?.dob) && "personal",
      !!(
        p?.idType &&
        p?.idNumber &&
        (p?.kyc_documents?.front?.url || p?.kycDocuments?.front?.url) &&
        (p?.kyc_documents?.back?.url || p?.kycDocuments?.back?.url)
      ) && "kyc",
      balance > 0 && "deposit",
      (p?.total_trades ?? 0) > 0 && "trade",
    ].filter(Boolean) as string[];

    completedIds.forEach((id) => markStepCompleted(id));
  }, [balance, emailVerified, markStepCompleted, profile]);

  useEffect(() => {
    if (!isOpen) return;

    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === "personal") {
      setPersonalGuideTarget(getNextPersonalGuideTarget());
      return;
    }

    setPersonalGuideTarget(null);
  }, [activeTab, isOpen, profile]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 flex w-full justify-end">
        <div
          className="flex h-full w-full max-w-[1520px] flex-col shadow-[0_32px_120px_rgba(0,0,0,0.55)] md:w-[88%]"
          style={{ background: "var(--trading-workspace-bg)" }}
        >
          <div
            className="border-b border-white/6 px-4 py-4 md:px-6 md:py-5"
            style={{ background: "var(--trading-header-bg)", borderBottomColor: "var(--trading-border-color)" }}
          >
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
              <div className="min-w-0 border border-[#0b2f3a] bg-[#13232d] shadow-[0_18px_50px_rgba(0,0,0,0.28)] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7f8ea8]">Live account</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#1f3a5d] shadow-[inset_0_0_0_4px_rgba(33,45,68,0.95)]">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-[#2693ff]" />
                    )}
                    <KycAvatarBadge status={kycStatus} documents={profileDocuments} size="sm" />
                  </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <VipBadge tierId={vip.currentTier.id} size={40} />
                        <span className="truncate text-[18px] font-bold text-white">{p?.username || user?.email || "My account"}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#96a3bb]">
                      <span className="whitespace-nowrap">ID: {accountId}</span>
                      <span className="whitespace-nowrap">Registered: {registeredAt}</span>
                      <span className="whitespace-nowrap">Balance: {formatMoney(balance)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="hidden h-11 rounded-[10px] border border-white/10 bg-white/5 px-4 text-[14px] font-semibold text-[#e5edf9] transition-colors hover:bg-white/10 md:inline-flex md:items-center md:gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-[#cfd8ea] transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close account panel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {TAB_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`shrink-0 rounded-[12px] px-3 py-2 text-[13px] font-bold transition-colors sm:px-4 sm:py-3 sm:text-[14px] ${
                    activeTab === item.id
                      ? "bg-white/[0.08] text-white"
                      : "bg-white/[0.045] text-[#b7c2d8] hover:bg-white/[0.075] hover:text-white"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <item.icon className="h-4 w-4 md:hidden" />
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => signOut()}
              className="mt-3 inline-flex h-11 items-center gap-2 rounded-[10px] border border-white/10 bg-white/5 px-4 text-[14px] font-semibold text-[#e5edf9] transition-colors hover:bg-white/10 md:hidden"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6"
            style={{ background: "var(--trading-workspace-bg)" }}
          >
            {activeTab === "personal" && <ProfilePersonalData compact guidedTarget={personalGuideTarget} />}
            {activeTab === "deposit" && <ProfileDeposit />}
            {activeTab === "support" && <ProfileSupport />}
            {activeTab === "balance_history" && <ProfileBalanceHistory />}
            {activeTab === "trading_history" && <ProfileTradingHistory />}
            {activeTab === "settings" && <ProfileSettings />}
          </div>
        </div>
      </div>
    </>
  );
};
