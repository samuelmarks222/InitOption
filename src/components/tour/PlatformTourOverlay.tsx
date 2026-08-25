import React, { useEffect, useState } from "react";
import { X, Compass } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileTour } from "@/contexts/ProfileTourContext";

const WELCOME_DISMISSED_KEY = "initoption_welcome_tour_dismissed";

export const PlatformTourOverlay: React.FC = () => {
  const { user } = useAuth();
  const { startTour, tourProgress } = useProfileTour();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setVisible(false);
      return;
    }

    const dismissedKey = `${WELCOME_DISMISSED_KEY}:${user.id}`;
    const alreadyDismissed = localStorage.getItem(dismissedKey) === "true";
    const platformProgress = tourProgress?.platform;
    const alreadyStarted = platformProgress?.started || platformProgress?.completed || platformProgress?.skipped;

    if (!alreadyDismissed && !alreadyStarted) {
      // Show welcome modal after a short delay on first load
      const timer = setTimeout(() => setVisible(true), 1800);
      return () => clearTimeout(timer);
    }
  }, [user?.id, tourProgress]);

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`${WELCOME_DISMISSED_KEY}:${user.id}`, "true");
    }
    setVisible(false);
  };

  const handleStartTour = () => {
    if (user?.id) {
      localStorage.setItem(`${WELCOME_DISMISSED_KEY}:${user.id}`, "true");
    }
    setVisible(false);
    // Small delay so modal closes first
    setTimeout(() => startTour(), 200);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(9,14,26,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-[420px] rounded-[20px] bg-[#1a2233] border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden animate-slide-up">
        {/* Header band */}
        <div className="bg-gradient-to-r from-[#0c3a72] to-[#1152a0] px-6 py-5 relative">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
            aria-label="Close welcome modal"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
              <Compass className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#90bdff]">Welcome to InitOption</p>
              <h2 className="text-[20px] font-black text-white leading-tight">Take a quick tour? 👋</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-[14px] text-white/65 leading-relaxed mb-1">
            Learn how to navigate InitOption, place trades, manage your account, deposit funds, withdraw your balance,
            and use the platform's main features.
          </p>
          <p className="text-[12px] text-white/35 mb-5">Takes about 2–3 minutes. You can skip at any time.</p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleStartTour}
              className="w-full h-12 rounded-[10px] bg-[#1175d5] text-[15px] font-black text-white hover:bg-[#0d69c2] transition-colors flex items-center justify-center gap-2"
            >
              <Compass className="h-4.5 w-4.5" />
              Start Platform Tour
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full h-11 rounded-[10px] bg-white/5 border border-white/10 text-[14px] font-semibold text-white/55 hover:text-white hover:bg-white/8 transition-colors"
            >
              Maybe Later
            </button>
          </div>

          <p className="mt-4 text-center text-[11px] text-white/25">
            You can always restart the tour from Help Center → Take a Tour
          </p>
        </div>
      </div>
    </div>
  );
};
