import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Camera,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  History,
  IdCard,
  LogOut,
  Settings,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileUploadPhoto } from "../profile/ProfileUploadPhoto";
import { ProfilePersonalData, type GuideField, type GuideTarget } from "../profile/ProfilePersonalData";
import { ProfileDeposit } from "../profile/ProfileDeposit";
import { ProfileBalanceHistory } from "../profile/ProfileBalanceHistory";
import { ProfileTradingHistory } from "../profile/ProfileTradingHistory";
import { ProfileSettings } from "../profile/ProfileSettings";
import { normalizeKycStatus } from "@/lib/kyc";

export type AccountTab = "upload" | "personal" | "deposit" | "balance_history" | "trading_history" | "settings";
const ACCOUNT_TAB_STORAGE_KEY = "initoption:account-tab";
const ACCOUNT_TAB_CHANGE_EVENT = "initoption:account-tab-change";

const isAccountTab = (value: string | null): value is AccountTab =>
  value === "upload" ||
  value === "personal" ||
  value === "deposit" ||
  value === "balance_history" ||
  value === "trading_history" ||
  value === "settings";

interface AccountGridOverlayProps {
  onClose?: () => void;
  initialTab?: AccountTab;
}

export const AccountGridOverlay = ({ onClose, initialTab = "personal" }: AccountGridOverlayProps) => {
  const { profile, user, signOut } = useAuth();
  const p = profile as any;
  const [activeTab, setActiveTab] = useState<AccountTab>(() => {
    if (typeof window === "undefined") return initialTab;
    const storedTab = window.sessionStorage.getItem(ACCOUNT_TAB_STORAGE_KEY);
    return isAccountTab(storedTab) ? storedTab : initialTab;
  });
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [verificationGuideStep, setVerificationGuideStep] = useState<number | null>(null);

  const kycStatus = normalizeKycStatus(p?.kyc_status ?? p?.kycStatus);
  const isAccountVerified = kycStatus === "Verified";
  const verificationPromptKey = user?.id ? `account_verification_prompt_seen:${user.id}` : "";

  const personalGuideTarget = useMemo<GuideTarget>(() => getNextPersonalGuideTarget(p), [profile]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAccountTabChange = (event: Event) => {
      const nextTab = (event as CustomEvent<string>).detail;
      if (isAccountTab(nextTab)) {
        setActiveTab(nextTab);
      }
    };

    window.addEventListener(ACCOUNT_TAB_CHANGE_EVENT, handleAccountTabChange);
    return () => window.removeEventListener(ACCOUNT_TAB_CHANGE_EVENT, handleAccountTabChange);
  }, []);

  const changeTab = (tab: AccountTab) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ACCOUNT_TAB_STORAGE_KEY, tab);
      window.dispatchEvent(new CustomEvent(ACCOUNT_TAB_CHANGE_EVENT, { detail: tab }));
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    if (!user?.id || activeTab !== "personal" || isAccountVerified) return;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(verificationPromptKey) === "true") return;

    const timerId = window.setTimeout(() => setShowVerificationPrompt(true), 220);
    return () => window.clearTimeout(timerId);
  }, [activeTab, isAccountVerified, user?.id, verificationPromptKey]);

  const dismissVerificationPrompt = () => {
    if (verificationPromptKey && typeof window !== "undefined") {
      window.sessionStorage.setItem(verificationPromptKey, "true");
    }
    setShowVerificationPrompt(false);
  };

  const startVerificationGuide = () => {
    dismissVerificationPrompt();
    changeTab("personal");
    window.setTimeout(() => setVerificationGuideStep(0), 120);
  };

  const MENU_ITEMS = [
    { id: "personal", icon: User, label: "Personal Data", desc: "View and edit your profile information" },
    { id: "upload", icon: Camera, label: "Upload Photo", desc: "Update your profile picture" },
    { id: "deposit", icon: BadgeDollarSign, label: "Deposit Funds", desc: "Add funds to your trading account" },
    { id: "balance_history", icon: Clock, label: "Balance History", desc: "View all balance transactions" },
    { id: "trading_history", icon: History, label: "Trading History", desc: "Review your past trades" },
    { id: "settings", icon: Settings, label: "Settings", desc: "Configure account preferences" },
  ] as const;

  return (
    <div
      className="quotex-glow-home trading-terminal relative z-40 flex h-full w-full flex-col overflow-hidden text-[var(--trading-text-color)]"
      style={{ background: "var(--trading-workspace-bg)" }}
    >

      {/* ── TOP HEADER ── */}
      <div
        className="flex shrink-0 items-center justify-end border-b border-white/8 px-3 py-3 md:px-5"
        style={{ background: "var(--trading-header-bg)" }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => { signOut(); onClose?.(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sign Out</span>
          </button>
          {onClose && (
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/[0.06] text-gray-300 transition-colors hover:bg-white/[0.1] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>



      {/* ── MOBILE: Scrollable Tab Strip ── */}
      <div
        className="flex shrink-0 overflow-x-auto gap-2 border-b px-3 py-3 md:hidden"
        style={{ background: "var(--trading-header-bg)", borderColor: "rgba(255,255,255,0.04)", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {MENU_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => changeTab(item.id as AccountTab)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-center transition-all duration-200 shrink-0 min-w-[88px] ${
                isActive
                  ? "bg-[var(--admin-green)]/10 text-white border border-[var(--admin-green)]/20"
                  : "bg-white/[0.02] text-[var(--trading-muted-color)] hover:bg-white/[0.05] hover:text-white"
              }`}
              style={{
                borderWidth: isActive ? 1 : 0,
                borderStyle: "solid",
                borderColor: isActive ? "rgba(0,192,118,0.2)" : "transparent",
              }}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 ${isActive ? "bg-[var(--admin-green)]/15 text-[var(--admin-green)]" : "bg-white/[0.03] text-[#8b9bb0]"}`}>
                <item.icon className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-semibold leading-tight">
                {item.id === "balance_history"
                  ? "Balance"
                  : item.id === "trading_history"
                    ? "Trading"
                    : item.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Desktop Sidebar */}
        <div
          className="hidden w-[288px] shrink-0 flex-col overflow-y-auto border-r py-4 md:flex"
          style={{ background: "var(--trading-header-bg)", borderColor: "rgba(255,255,255,0.04)" }}
        >
          <div className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Account
          </div>
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => changeTab(item.id as AccountTab)}
                className={`mx-3 my-1.5 flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-left transition-all duration-200 ${
                  isActive
                    ? "bg-white/[0.04] text-white"
                    : "text-[var(--trading-muted-color)] hover:bg-white/[0.03] hover:text-white"
                }`}
                style={{
                  backgroundColor: isActive ? "rgba(0, 192, 118, 0.08)" : "transparent",
                  borderColor: isActive ? "rgba(0, 192, 118, 0.15)" : "transparent",
                  borderWidth: isActive ? 1 : 0,
                  borderStyle: "solid",
                }}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                  isActive
                    ? "bg-[var(--admin-green)]/15 text-[var(--admin-green)]"
                    : "bg-white/[0.03] text-[#8b9bb0]"
                }`}>
                  <item.icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-semibold tracking-tight ${isActive ? "text-white" : "text-[#c8d2e6]"}`}>{item.label}</div>
                  <div className="mt-1 text-[11px] leading-4" style={{ color: isActive ? "rgba(255,255,255,0.55)" : "rgba(139,155,176,0.8)" }}>{item.desc}</div>
                </div>
                {isActive && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--admin-green)] shadow-[0_0_6px_rgba(0,192,118,0.6)]" />
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--admin-green)]" />
                  </div>
                )}
                {!isActive && <div className="w-7" />}
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-2 md:p-3">
            {activeTab === "upload" && <ProfileUploadPhoto />}
            {activeTab === "personal" && <ProfilePersonalData compact guidedTarget={verificationGuideStep === 1 ? personalGuideTarget : null} />}
            {activeTab === "deposit" && <ProfileDeposit />}
            {activeTab === "balance_history" && <ProfileBalanceHistory />}
            {activeTab === "trading_history" && <ProfileTradingHistory />}
            {activeTab === "settings" && <ProfileSettings />}
          </div>
        </div>
      </div>

      {showVerificationPrompt && !isAccountVerified && (
        <VerificationStartModal onClose={dismissVerificationPrompt} onStart={startVerificationGuide} />
      )}

      {verificationGuideStep !== null && !isAccountVerified && activeTab === "personal" && (
        <VerificationGuideOverlay
          stepIndex={verificationGuideStep}
          guideTarget={personalGuideTarget}
          onClose={() => setVerificationGuideStep(null)}
          onPrev={() => setVerificationGuideStep((step) => (step === null ? null : Math.max(0, step - 1)))}
          onNext={() => {
            setVerificationGuideStep((step) => {
              if (step === null) return null;
              return step >= VERIFICATION_GUIDE_STEPS.length - 1 ? null : step + 1;
            });
          }}
        />
      )}
    </div>
  );
};

const getNextPersonalGuideTarget = (profile: any): GuideTarget => {
  const checks: Array<{ field: GuideField; label: string; completed: boolean }> = [
    { field: "username", label: "Add your nickname", completed: Boolean(String(profile?.username || "").trim()) },
    { field: "firstName", label: "Add your first name", completed: Boolean(String(profile?.firstName || "").trim()) },
    { field: "lastName", label: "Add your last name", completed: Boolean(String(profile?.lastName || "").trim()) },
    { field: "dob", label: "Add your date of birth", completed: Boolean(String(profile?.dob || "").trim()) },
    { field: "nationality", label: "Select your country", completed: Boolean(String(profile?.nationality || "").trim()) },
    { field: "phone", label: "Add your phone number", completed: Boolean(String(profile?.phone || "").trim()) },
    { field: "address", label: "Add your address", completed: Boolean(String(profile?.address || "").trim()) },
    { field: "idType", label: "Select your ID type", completed: Boolean(String(profile?.idType || "").trim()) },
    { field: "idNumber", label: "Add your ID number", completed: Boolean(String(profile?.idNumber || "").trim()) },
    {
      field: "frontDocument",
      label: "Upload the front of your ID",
      completed: Boolean(profile?.kyc_documents?.front?.url || profile?.kycDocuments?.front?.url),
    },
    {
      field: "backDocument",
      label: "Upload the back of your ID",
      completed: Boolean(profile?.kyc_documents?.back?.url || profile?.kycDocuments?.back?.url),
    },
  ];

  const next = checks.find((item) => !item.completed);
  return next ? { field: next.field, label: next.label } : null;
};

const VerificationStartModal = ({ onClose, onStart }: { onClose: () => void; onStart: () => void }) => (
  <div className="fixed inset-0 z-[170] flex items-center justify-center bg-[#0b1020]/78 p-4 backdrop-blur-[3px]">
    <div className="relative w-full max-w-[360px] rounded-[6px] border border-white/[0.06] bg-[#2d3447] px-8 pb-8 pt-7 text-center shadow-[0_30px_90px_rgba(2,7,19,0.58)]">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[#a5adbd] transition hover:bg-white/5 hover:text-white"
        aria-label="Close verification guide"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mx-auto mb-8 flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-[#248de8] shadow-[0_16px_35px_rgba(20,116,219,0.24)]">
        <IdCard className="h-10 w-10 text-[#eef7ff]" />
        <span className="absolute ml-12 mt-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#394354] text-[#48d078] shadow-[0_10px_22px_rgba(0,0,0,0.24)]">
          <CheckCircle2 className="h-6 w-6" />
        </span>
      </div>

      <h2 className="text-[24px] font-bold leading-tight text-white">Verify your account</h2>
      <p className="mx-auto mt-6 max-w-[285px] text-[16px] font-semibold leading-[1.25] text-[#d5d9e4]">
        Verify your account to confirm your identity and unlock full access to all features.
      </p>

      <button
        type="button"
        onClick={onStart}
        className="mt-6 h-[38px] w-full rounded-[4px] bg-[#12b765] text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(17,180,97,0.28)] transition hover:bg-[#10a85b]"
      >
        Start verification
      </button>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 h-[38px] w-full rounded-[4px] bg-[#626a83] text-[14px] font-bold text-white transition hover:bg-[#6b748e]"
      >
        Later
      </button>
    </div>
  </div>
);

const VERIFICATION_GUIDE_STEPS = [
  {
    selector: "[data-verification-tour='status']",
    title: "Check your verification status",
    body: "Verification confirms your identity and gives you full access.",
  },
  {
    selector: "[data-verification-tour='personal-details']",
    title: "Fill in your personal details",
    body: "Enter your details and save.",
  },
  {
    selector: "[data-verification-tour='documents']",
    title: "Upload your documents",
    body: "Choose your ID type, add the ID number, then upload the front and back of your document.",
  },
] as const;

const VerificationGuideOverlay = ({
  stepIndex,
  guideTarget,
  onClose,
  onPrev,
  onNext,
}: {
  stepIndex: number;
  guideTarget: GuideTarget;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const step = VERIFICATION_GUIDE_STEPS[stepIndex];

  useLayoutEffect(() => {
    const updateRect = () => {
      const element = document.querySelector(step.selector) as HTMLElement | null;
      if (!element) {
        setTargetRect(null);
        return;
      }

      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      window.requestAnimationFrame(() => setTargetRect(element.getBoundingClientRect()));
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [step.selector]);

  const tooltipStyle = useMemo(() => {
    if (!targetRect) return { left: 160, top: 240 };
    const width = 274;
    const left = Math.min(Math.max(16, targetRect.left + targetRect.width * 0.15), window.innerWidth - width - 16);
    const top =
      stepIndex === 2
        ? Math.max(16, targetRect.top + 36)
        : Math.min(window.innerHeight - 220, targetRect.bottom + 14);
    return { left, top, width };
  }, [stepIndex, targetRect]);

  return (
    <div className="fixed inset-0 z-[165] bg-[#0b1020]/74 backdrop-blur-[1px]">
      {targetRect && (
        <div
          className="pointer-events-none fixed rounded-[12px] bg-[#1e2638]/72 shadow-[0_0_0_9999px_rgba(8,12,24,0.62),0_16px_45px_rgba(0,0,0,0.22)] ring-1 ring-[#5c6b86]/45"
          style={{
            left: targetRect.left - 10,
            top: targetRect.top - 10,
            width: targetRect.width + 20,
            height: targetRect.height + 20,
          }}
        />
      )}

      <div
        className="fixed rounded-[4px] bg-[#687189] p-3 text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
        style={tooltipStyle}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-[#d4dae8] transition hover:text-white"
          aria-label="Close verification tour"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-8 text-[15px] font-bold leading-tight">
          {stepIndex === 1 && guideTarget?.label ? guideTarget.label : step.title}
        </div>
        <div className="mt-4 border-t border-white/16 pt-3 text-[13px] font-semibold leading-[1.35] text-white/92">
          {step.body}
        </div>
        <div className="mt-3 border-t border-white/16 pt-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onPrev}
              disabled={stepIndex === 0}
              className="flex h-8 w-9 items-center justify-center rounded-[4px] bg-white/10 text-white transition hover:bg-white/15 disabled:opacity-35"
              aria-label="Previous verification step"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-center text-[10px] font-black uppercase tracking-[0.08em] text-white">
              <div>Step {stepIndex + 1} of {VERIFICATION_GUIDE_STEPS.length}</div>
              <div className="mt-1 flex justify-center gap-1">
                {VERIFICATION_GUIDE_STEPS.map((_, index) => (
                  <span key={index} className={`h-1.5 w-1.5 rounded-full ${index === stepIndex ? "bg-white" : "bg-white/45"}`} />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onNext}
              className="flex h-8 w-9 items-center justify-center rounded-[4px] bg-white/10 text-white transition hover:bg-white/15"
              aria-label={stepIndex === VERIFICATION_GUIDE_STEPS.length - 1 ? "Finish verification tour" : "Next verification step"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
