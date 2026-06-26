import { useEffect, useState } from "react";
import { BadgeDollarSign, History, LogOut, MessageCircle, Settings, User, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileTour } from "@/contexts/ProfileTourContext";
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
  const { emailVerified, profile, signOut } = useAuth();
  const { markStepCompleted } = useProfileTour();
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [personalGuideTarget, setPersonalGuideTarget] = useState<PersonalGuideTarget | null>(null);

  const p = profile as any;

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
            <div className="flex items-start justify-between gap-4">
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
                      ? "bg-[#293042] text-white"
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
