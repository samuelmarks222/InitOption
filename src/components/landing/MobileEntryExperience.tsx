import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import {
  hasSeenMobileSplashThisSession,
  markMobileSplashSeenThisSession,
} from "@/lib/mobileExperience";

const MOBILE_SPLASH_DURATION_MS = 1700;

type MobileEntryExperienceProps = {
  enabled?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
};

const MobileEntryExperience = ({
  enabled = true,
  onVisibilityChange,
}: MobileEntryExperienceProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { logoUrl, platformName, initials } = useSiteBranding();
  const [phase, setPhase] = useState<"hidden" | "splash">("hidden");

  useEffect(() => {
    if (!enabled || !isMobile) {
      setPhase("hidden");
      return;
    }

    if (hasSeenMobileSplashThisSession()) {
      navigate("/register", { replace: true });
      return;
    }

    setPhase("splash");
  }, [enabled, isMobile, navigate]);

  useEffect(() => {
    if (phase !== "splash") return;

    const reducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timer = window.setTimeout(() => {
      markMobileSplashSeenThisSession();
      navigate("/register", { replace: true });
    }, reducedMotion ? 500 : MOBILE_SPLASH_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [navigate, phase]);

  useEffect(() => {
    const visible = enabled && isMobile && phase === "splash";
    onVisibilityChange?.(visible);
  }, [enabled, isMobile, onVisibilityChange, phase]);

  useEffect(() => {
    if (!(enabled && isMobile && phase === "splash")) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [enabled, isMobile, phase]);

  if (!enabled || !isMobile || phase !== "splash") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[140] md:hidden" role="dialog" aria-modal="true" aria-label="Mobile logo intro">
      <div className="absolute inset-0 bg-[#080b11]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(255,124,54,0.28),transparent_28%),radial-gradient(circle_at_50%_82%,rgba(255,124,54,0.18),transparent_32%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:38px_38px] opacity-20" />

      <div
        className="relative flex h-full flex-col items-center justify-center px-8 text-center"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        }}
      >
        <div className="mobile-logo-intro-halo absolute inset-x-0 top-[21%] mx-auto h-44 w-44 rounded-full bg-[rgba(255,124,54,0.24)] blur-[74px]" />
        <div className="mobile-logo-intro-halo absolute inset-x-0 bottom-[17%] mx-auto h-32 w-60 rounded-full bg-[rgba(255,124,54,0.18)] blur-[86px]" />

        <div className="relative flex w-full max-w-[360px] flex-col items-center">
          <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,31,0.98)_0%,rgba(9,11,16,1)_100%)] px-8 py-10 shadow-[0_32px_120px_rgba(0,0,0,0.48)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/72">
              <Sparkles className="h-3.5 w-3.5 text-[#ff7c36]" />
              Logo intro
            </div>

            <div className="mt-10 flex justify-center">
              <div className="mobile-logo-intro-mark relative flex h-[138px] w-[138px] items-center justify-center rounded-[36px] border border-[rgba(255,124,54,0.28)] bg-[linear-gradient(180deg,rgba(255,124,54,0.16)_0%,rgba(255,124,54,0.05)_100%)] shadow-[0_20px_54px_rgba(255,124,54,0.18)]">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={platformName}
                    className="h-[88px] w-auto max-w-[96px] object-contain"
                  />
                ) : (
                  <div className="flex h-[92px] w-[92px] items-center justify-center rounded-[28px] bg-[linear-gradient(135deg,#ff7c36_0%,#ff9c63_100%)] text-[2rem] font-black uppercase tracking-[0.12em] text-white shadow-[0_16px_40px_rgba(255,124,54,0.28)]">
                    {initials}
                  </div>
                )}
              </div>
            </div>

            <div className="mobile-logo-intro-wordmark mt-8">
              <div className="font-display text-[1.55rem] font-bold uppercase tracking-[0.12em] text-white">
                {platformName}
              </div>
              <div className="mt-2 text-[11px] font-black uppercase tracking-[0.28em] text-[#ff9d6d]">
                Mobile trading desk
              </div>
            </div>
          </div>

          <div className="mobile-logo-intro-wordmark mt-8 text-sm leading-7 text-white/58">
            Launching your mobile experience...
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileEntryExperience;
