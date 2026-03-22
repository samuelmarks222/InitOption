import { useAuth } from "@/contexts/AuthContext";
import { useProfileTour } from "@/contexts/ProfileTourContext";
import { isNewUserProfile } from "@/lib/onboarding";
import { X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type TourStep = {
  selector: string;
  message: string;
};

interface GuidedTourProps {
  enabled?: boolean;
}

const CARD_DEFAULT_SIZE = { width: 324, height: 220 };
const VIEWPORT_PADDING = 24;
const TOUR_STEPS: TourStep[] = [
  { selector: "#tour-chart", message: "Trading can be surprisingly simple." },
  { selector: "#tour-timeframe", message: "Choose how fast or slow you want to read the market." },
  { selector: "#tour-chart-type", message: "Switch chart styles whenever you want a different view of price action." },
  { selector: "#tour-indicators", message: "Add indicators here when you want extra confirmation before entering." },
  { selector: "#tour-drawings", message: "Use drawing tools to mark support, resistance, and key trade zones." },
  { selector: "#tour-trade-panel", message: "Set the amount, expiry, and direction here before you place a trade." },
  { selector: "#tour-account-switch", message: "Swap between live, demo, and tournament balances from this control." },
  { selector: "#tour-deposit-button", message: "When you are ready to trade live, this is where you fund the account." },
  { selector: "#tour-account", message: "Open Account to complete your profile and unlock platform features faster." },
  { selector: "#tour-tournaments", message: "Tournaments give new users a safe way to compete and practice." },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const GuidedTour = ({ enabled = true }: GuidedTourProps) => {
  const { profile } = useAuth();
  const { runTour, startTour, finishTour, tourCompleted } = useProfileTour();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [cardSize, setCardSize] = useState(CARD_DEFAULT_SIZE);
  const cardRef = useRef<HTMLDivElement>(null);
  const autoStartedForUserRef = useRef<string | null>(null);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isDesktopViewport =
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false;

  const isNewUser = useMemo(() => isNewUserProfile(profile), [profile]);

  useEffect(() => {
    autoStartedForUserRef.current = null;
    setCurrentStepIndex(0);
    setTargetRect(null);
  }, [profile?.id]);

  useEffect(() => {
    if (!enabled || !isDesktopViewport || !isNewUser || tourCompleted || runTour || !profile?.id) {
      return;
    }

    if (autoStartedForUserRef.current === profile.id) {
      return;
    }

    autoStartedForUserRef.current = profile.id;
    startTour();
  }, [enabled, isDesktopViewport, isNewUser, profile?.id, runTour, startTour, tourCompleted]);

  useEffect(() => {
    if (!runTour) {
      setCurrentStepIndex(0);
    }
  }, [runTour]);

  useLayoutEffect(() => {
    if (!runTour || !enabled || !cardRef.current) return;

    const updateCardSize = () => {
      if (!cardRef.current) return;
      setCardSize({
        width: cardRef.current.offsetWidth || CARD_DEFAULT_SIZE.width,
        height: cardRef.current.offsetHeight || CARD_DEFAULT_SIZE.height,
      });
    };

    updateCardSize();
    const observer = new ResizeObserver(updateCardSize);
    observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, [currentStepIndex, enabled, runTour]);

  useEffect(() => {
    if (!runTour || !enabled || !isDesktopViewport) return;

    const updateTargetRect = () => {
      const element = document.querySelector(currentStep.selector) as HTMLElement | null;
      if (!element) {
        setTargetRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setTargetRect(null);
        return;
      }

      const isOutsideViewport =
        rect.bottom < 0 ||
        rect.right < 0 ||
        rect.top > window.innerHeight ||
        rect.left > window.innerWidth;

      if (isOutsideViewport) {
        element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }

      setTargetRect(element.getBoundingClientRect());
    };

    updateTargetRect();
    const animationFrame = window.requestAnimationFrame(updateTargetRect);

    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [currentStep.selector, enabled, isDesktopViewport, runTour]);

  const position = useMemo(() => {
    if (typeof window === "undefined") {
      return { left: VIEWPORT_PADDING, top: VIEWPORT_PADDING, placement: "below" as const, arrowLeft: 64 };
    }

    if (!targetRect) {
      return {
        left: clamp((window.innerWidth - cardSize.width) / 2, VIEWPORT_PADDING, window.innerWidth - cardSize.width - VIEWPORT_PADDING),
        top: VIEWPORT_PADDING * 2,
        placement: "below" as const,
        arrowLeft: cardSize.width / 2,
      };
    }

    const spaceAbove = targetRect.top;
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const placement = spaceAbove > cardSize.height + 40 || spaceAbove >= spaceBelow ? "above" : "below";
    const left = clamp(
      targetRect.left + targetRect.width / 2 - cardSize.width / 2,
      VIEWPORT_PADDING,
      window.innerWidth - cardSize.width - VIEWPORT_PADDING,
    );
    const top =
      placement === "above"
        ? clamp(targetRect.top - cardSize.height - 22, VIEWPORT_PADDING, window.innerHeight - cardSize.height - VIEWPORT_PADDING)
        : clamp(targetRect.bottom + 22, VIEWPORT_PADDING, window.innerHeight - cardSize.height - VIEWPORT_PADDING);
    const arrowLeft = clamp(targetRect.left + targetRect.width / 2 - left, 36, cardSize.width - 36);

    return { left, top, placement, arrowLeft };
  }, [cardSize.height, cardSize.width, targetRect]);

  const closeTour = () => {
    setCurrentStepIndex(0);
    finishTour();
  };

  const handleNext = () => {
    if (currentStepIndex === TOUR_STEPS.length - 1) {
      closeTour();
      return;
    }

    setCurrentStepIndex((index) => index + 1);
  };

  if (!runTour || !enabled || !isDesktopViewport) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[140]" aria-live="polite">
      <div className="absolute inset-0 bg-transparent" />

      {targetRect && (
        <div
          className="pointer-events-none fixed rounded-[24px] border border-[#5da6ff]/70 bg-[#50a2ff]/5 shadow-[0_0_0_1px_rgba(93,166,255,0.18),0_0_30px_rgba(46,125,255,0.24)]"
          style={{
            top: targetRect.top - 10,
            left: targetRect.left - 10,
            width: targetRect.width + 20,
            height: targetRect.height + 20,
          }}
        />
      )}

      <div
        ref={cardRef}
        className="fixed w-[324px] rounded-[22px] border border-white/8 bg-[#242a39] p-7 text-left shadow-[0_20px_60px_rgba(5,16,45,0.42)]"
        style={{ left: position.left, top: position.top }}
      >
        <span
          className={`absolute h-6 w-6 rotate-45 border-white/8 bg-[#242a39] ${
            position.placement === "above" ? "-bottom-3" : "-top-3"
          }`}
          style={{ left: position.arrowLeft - 12 }}
        />

        <div className="relative flex items-center justify-between">
          <span className="text-[13px] font-medium tracking-[0.01em] text-[#93a3bf]">
            Step {currentStepIndex + 1} / {TOUR_STEPS.length}
          </span>
          <button
            type="button"
            onClick={closeTour}
            className="rounded-full p-1 text-[#93a3bf] transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close platform tour"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-6 max-w-[230px] text-[18px] font-medium leading-[1.35] text-[#e6edf9]">
          {currentStep.message}
        </p>

        <div className="mt-7">
          <button
            type="button"
            onClick={handleNext}
            className="rounded-[12px] bg-[#1175d5] px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#0d69c2]"
          >
            {currentStepIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};
