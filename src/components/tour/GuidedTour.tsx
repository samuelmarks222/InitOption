import { useProfileTour, TourType } from "@/contexts/ProfileTourContext";
import { X, ChevronLeft, ChevronRight, CheckCircle2, MapPin } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";

interface TourStep {
  selector: string;
  title: string;
  message: string;
  tag?: string;
  learnMoreLabel?: string;
  onLearnMore?: () => void;
}

interface GuidedTourProps {
  enabled?: boolean;
}

const CARD_DEFAULT_SIZE = { width: 340, height: 240 };
const VIEWPORT_PADDING = 20;
const MOBILE_VIEWPORT_PADDING = 12;
const MOBILE_BOTTOM_OFFSET = 80;

// ─── TOUR STEP DEFINITIONS BY TYPE ─────────────────────────────────────────

const PLATFORM_TOUR_STEPS: TourStep[] = [
  {
    selector: "#tour-chart",
    title: "Your Trading Dashboard",
    tag: "Step 1 · Dashboard",
    message:
      "Welcome to the InitOption trading terminal. This is your main workspace where you can view live asset prices, read charts, analyze market movements, and place trades — all in one place.",
  },
  {
    selector: "#tour-account-switch",
    title: "Account Balance",
    tag: "Step 2 · Balance",
    message:
      "Your available balance is displayed here. You can switch between your Live Account (real funds) and Demo Account ($10,000 virtual funds for practice) using this control. Funds in open trades are not included in the available balance.",
  },
  {
    selector: "#tour-chart",
    title: "Market Chart",
    tag: "Step 3 · Chart & Analysis",
    message:
      "This is the live price chart. Use it to study price movements before placing a trade. You can change the timeframe, chart type, add technical indicators (RSI, MACD, Bollinger Bands), and use drawing tools to mark key support and resistance zones.",
  },
  {
    selector: "#tour-timeframe",
    title: "Chart Timeframes",
    tag: "Step 4 · Timeframes",
    message:
      "Choose how each candle or bar represents time — from 5 seconds for fast turbo trading up to 4 hours for broader trend analysis. Shorter timeframes show more price detail while longer ones reveal the overall trend direction.",
  },
  {
    selector: "#tour-trade-panel",
    title: "Trade Panel",
    tag: "Step 5 · Placing a Trade",
    message:
      "This is where you build and confirm your trade. Select the asset, enter your trade amount, choose your expiry time, then click the UP (green) or DOWN (red) button to open a position. Note: demo trades use virtual balance only.",
  },
  {
    selector: "#tour-chart-type",
    title: "Chart Styles",
    tag: "Step 6 · Chart Types",
    message:
      "Switch between different chart visualizations: Candlestick (shows open/high/low/close), Line chart (simple price line), Bar chart, and Area chart. Most professional traders use candlestick charts to read market sentiment.",
  },
  {
    selector: "#tour-indicators",
    title: "Technical Indicators",
    tag: "Step 7 · Indicators",
    message:
      "Add indicators to your chart for deeper market analysis. Popular choices include RSI (momentum), MACD (trend & momentum), Bollinger Bands (volatility), Moving Averages (trend direction), and Stochastic (overbought/oversold signals).",
  },
  {
    selector: "#tour-deposit-button",
    title: "Deposit Funds",
    tag: "Step 8 · Deposit",
    message:
      "When you're ready to trade with real money, click here to add funds. We support M-Pesa mobile money, Cryptocurrency (USDT, BTC, ETH, SOL) and other payment methods. Minimum deposit is $10. Deposits are processed instantly.",
  },
  {
    selector: "#tour-account",
    title: "Account & Security",
    tag: "Step 9 · My Account",
    message:
      "Open your account panel to manage your personal profile, update your password, enable two-factor authentication (2FA), upload KYC verification documents, view your payment history, and configure notification preferences.",
  },
  {
    selector: "#tour-tournaments",
    title: "Tournaments",
    tag: "Step 10 · Tournaments",
    message:
      "Compete in live trading competitions against other traders. Join free tournaments (no entry fee) or paid events with cash prize pools. All participants trade on equal virtual balances — the highest balance at the end wins.",
  },
  {
    selector: "#tour-chart",
    title: "Trade History",
    tag: "Step 11 · Trade History",
    message:
      "Review your complete trade history in the Trades section of your account panel. You can see each trade's asset, amount, direction, opening time, expiry, result, profit or loss, and current status. Use this to analyze and improve your strategy.",
  },
  {
    selector: "#tour-account",
    title: "Withdrawals",
    tag: "Step 12 · Withdraw Funds",
    message:
      "To withdraw your earnings, open the Account panel and select Withdrawal. Enter the amount, select your payout method (M-Pesa or Crypto wallet), and confirm your request. Processing usually completes within 15–60 minutes.",
  },
];

const TRADING_TOUR_STEPS: TourStep[] = [
  {
    selector: "#tour-chart",
    title: "Trading Terminal",
    tag: "Trading · Step 1",
    message:
      "This is the live trading chart. Price candles update in real time from global market data feeds. Study the chart before placing any trade to understand the current market direction and momentum.",
  },
  {
    selector: "#tour-timeframe",
    title: "Select a Timeframe",
    tag: "Trading · Step 2",
    message:
      "Your chosen timeframe determines how long each chart candle represents. For quick turbo trades (5s–60s), use the shorter timeframes. For swing positions, use 1m–1h candles for a clearer view of the trend.",
  },
  {
    selector: "#tour-chart-type",
    title: "Chart Type",
    tag: "Trading · Step 3",
    message:
      "Switch between Candlestick, Line, Bar, and Area chart views. Candlestick is recommended for most traders — it shows the open, high, low, and close price for each period and reveals market sentiment at a glance.",
  },
  {
    selector: "#tour-indicators",
    title: "Add Indicators",
    tag: "Trading · Step 4",
    message:
      "Technical indicators are mathematical overlays that help identify trends, momentum, and entry signals. Add RSI to check if an asset is overbought or oversold. Use MACD to spot momentum shifts and potential reversals.",
  },
  {
    selector: "#tour-drawings",
    title: "Drawing Tools",
    tag: "Trading · Step 5",
    message:
      "Mark key support and resistance levels, draw trend lines, and annotate chart patterns using the drawing tools panel. These visual markers help you plan trade entries and exits more precisely.",
  },
  {
    selector: "#tour-trade-panel",
    title: "Place Your Trade",
    tag: "Trading · Step 6",
    message:
      "Set your trade amount, choose the expiry time, then click UP if you predict the price will rise, or DOWN if you predict it will fall by expiration. The platform shows your potential payout percentage before you confirm.",
  },
  {
    selector: "#tour-account-switch",
    title: "Demo vs Live",
    tag: "Trading · Step 7",
    message:
      "Always practice new strategies on the Demo Account first. Your demo balance is separate from your live funds and can be refilled at any time at no cost. Switch here between Live, Demo, and Tournament balance modes.",
  },
];

const DEPOSIT_TOUR_STEPS: TourStep[] = [
  {
    selector: "#tour-deposit-button",
    title: "Start a Deposit",
    tag: "Deposit · Step 1",
    message:
      "Click the Deposit button to open the payment panel. You can fund your account using M-Pesa mobile money, Cryptocurrency (USDT TRC-20, BTC, ETH, SOL), or other supported payment methods.",
  },
  {
    selector: "#tour-deposit-button",
    title: "Choose a Payment Method",
    tag: "Deposit · Step 2",
    message:
      "Select your preferred payment method from the list. M-Pesa deposits are the fastest for Kenya-based users — you'll receive a payment prompt on your phone within seconds. Crypto deposits are confirmed after blockchain confirmation.",
  },
  {
    selector: "#tour-deposit-button",
    title: "Enter Deposit Amount",
    tag: "Deposit · Step 3",
    message:
      "Enter how much you want to deposit. The minimum deposit is $10 for all payment methods. There are no platform fees on deposits — the full amount is credited to your live trading balance.",
  },
  {
    selector: "#tour-account-switch",
    title: "Balance Updated",
    tag: "Deposit · Step 4",
    message:
      "Once your deposit is confirmed, your live balance updates instantly. You can now trade with the deposited funds. Your balance is always visible in the account balance area at the top of the trading panel.",
  },
];

const WITHDRAWAL_TOUR_STEPS: TourStep[] = [
  {
    selector: "#tour-account",
    title: "Open Your Account",
    tag: "Withdrawal · Step 1",
    message:
      "To request a withdrawal, open your Account panel. You'll find the Withdrawal option alongside Deposits, Payments, Trades, and other account management sections.",
  },
  {
    selector: "#tour-account",
    title: "Select Withdrawal Method",
    tag: "Withdrawal · Step 2",
    message:
      "Choose your payout destination: M-Pesa mobile money (fastest, usually 15–30 minutes) or a Cryptocurrency wallet address. Your withdrawal method must match the method you used to deposit funds.",
  },
  {
    selector: "#tour-account",
    title: "Enter Amount & Confirm",
    tag: "Withdrawal · Step 3",
    message:
      "Enter the withdrawal amount (minimum $10) and your recipient details (M-Pesa number or crypto wallet address). Review the request carefully before confirming — withdrawals cannot be reversed once submitted.",
  },
  {
    selector: "#tour-account-switch",
    title: "Withdrawal Processing",
    tag: "Withdrawal · Step 4",
    message:
      "After submitting, your withdrawal request is processed by our payments team. Standard withdrawals complete within 15–60 minutes. Track your withdrawal status in the Payments section of your account.",
  },
];

const ACCOUNT_TOUR_STEPS: TourStep[] = [
  {
    selector: "#tour-account",
    title: "Account Settings",
    tag: "Account · Step 1",
    message:
      "Your account panel contains all your personal information, security settings, and account preferences. Access it by clicking the account icon in the navigation.",
  },
  {
    selector: "#tour-account",
    title: "Personal Information",
    tag: "Account · Step 2",
    message:
      "Update your name, date of birth, country, and contact details here. Your personal information must match your government-issued identity documents to pass KYC verification and enable full withdrawal access.",
  },
  {
    selector: "#tour-account",
    title: "KYC Verification",
    tag: "Account · Step 3",
    message:
      "KYC (Know Your Customer) verification is required before processing withdrawals above standard limits. Upload a clear photo of your government-issued ID (passport, national ID, or driver's license) and a selfie for identity confirmation.",
  },
  {
    selector: "#tour-account",
    title: "Security Settings",
    tag: "Account · Step 4",
    message:
      "Strengthen your account security by enabling Two-Factor Authentication (2FA). We recommend using an authenticator app. A secure account protects your funds and trading history from unauthorized access.",
  },
];

const COPY_TRADING_STEPS: TourStep[] = [
  {
    selector: "#tour-chart",
    title: "Copy Trading",
    tag: "Copy Trading · Step 1",
    message:
      "Copy Trading lets you automatically replicate trades from verified, high-performance traders. When a trader you follow opens a position, the same trade is instantly mirrored in your account proportionally.",
  },
  {
    selector: "#tour-chart",
    title: "Browse Traders",
    tag: "Copy Trading · Step 2",
    message:
      "Browse the trader directory to find eligible traders to copy. Review each trader's performance history, win rate, average profit, trading style, risk score, and number of followers before making a decision.",
  },
  {
    selector: "#tour-chart",
    title: "Configure Copy Settings",
    tag: "Copy Trading · Step 3",
    message:
      "When following a trader, set your copy amount (how much of your balance to allocate per trade), a maximum loss limit, and a stop-copying threshold. These controls help you manage risk automatically.",
  },
  {
    selector: "#tour-account",
    title: "Monitor & Stop Copying",
    tag: "Copy Trading · Step 4",
    message:
      "Review all active copy positions in your account panel. You can pause or stop copying any trader at any time. Past performance of any trader does not guarantee future results — always apply proper risk management.",
  },
];

const TOUR_STEPS_BY_TYPE: Record<TourType, TourStep[]> = {
  platform: PLATFORM_TOUR_STEPS,
  trading: TRADING_TOUR_STEPS,
  deposit: DEPOSIT_TOUR_STEPS,
  withdrawal: WITHDRAWAL_TOUR_STEPS,
  account: ACCOUNT_TOUR_STEPS,
  copy_trading: COPY_TRADING_STEPS,
};

const TOUR_LABELS: Record<TourType, string> = {
  platform: "Platform Tour",
  trading: "Trading Tour",
  deposit: "Deposit Tour",
  withdrawal: "Withdrawal Tour",
  account: "Account Tour",
  copy_trading: "Copy Trading Tour",
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// ─── COMPLETION SCREEN ─────────────────────────────────────────────────────
const TourCompletionScreen = ({
  tourType,
  onClose,
  onRestartTour,
  onExplorHelp,
}: {
  tourType: TourType;
  onClose: () => void;
  onRestartTour: () => void;
  onExplorHelp: () => void;
}) => {
  const platformChecklist = [
    "Trading Terminal",
    "Account Balance",
    "Charts & Timeframes",
    "Technical Indicators",
    "Trade Panel",
    "Deposits",
    "Withdrawals",
    "Tournaments",
    "Account & Security",
  ];

  const tourChecklist: Record<TourType, string[]> = {
    platform: platformChecklist,
    trading: ["Chart Reading", "Timeframes", "Indicators", "Drawing Tools", "Trade Panel", "Demo vs Live"],
    deposit: ["Payment Methods", "M-Pesa Deposits", "Crypto Deposits", "Balance Updates"],
    withdrawal: ["Withdrawal Methods", "Amount & Confirmation", "Processing Times"],
    account: ["Personal Profile", "KYC Verification", "Security Settings"],
    copy_trading: ["Browsing Traders", "Copy Settings", "Risk Management", "Monitoring"],
  };

  const checklist = tourChecklist[tourType] || platformChecklist;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-[440px] rounded-[18px] bg-[#1a2233] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.55)] p-7 text-white">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0a8a3c]/20 border border-[#0a8a3c]/40 mb-4">
            <CheckCircle2 className="h-7 w-7 text-[#22c55e]" />
          </div>
          <h2 className="text-[22px] font-black text-white">You're all set!</h2>
          <p className="text-[13px] text-white/50 mt-1">
            You've completed the {TOUR_LABELS[tourType]}.
          </p>
        </div>

        <div className="bg-[#131b2a] rounded-[10px] p-4 mb-6 border border-white/5">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white/40 mb-3">
            You now know how to use:
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {checklist.map((item) => (
              <div key={item} className="flex items-center gap-2 text-[12.5px] text-white/75">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#22c55e] shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-[10px] bg-[#1175d5] text-[14px] font-black text-white hover:bg-[#0d69c2] transition-colors"
          >
            Start Trading
          </button>
          <button
            type="button"
            onClick={onExplorHelp}
            className="w-full h-11 rounded-[10px] bg-white/5 border border-white/10 text-[14px] font-semibold text-white/70 hover:text-white hover:bg-white/8 transition-colors"
          >
            Explore Help Center
          </button>
          <button
            type="button"
            onClick={onRestartTour}
            className="w-full text-center text-[12px] text-white/30 hover:text-white/60 transition-colors py-1"
          >
            Restart tour
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── GUIDED TOUR MAIN COMPONENT ────────────────────────────────────────────
export const GuidedTour = ({ enabled = true }: GuidedTourProps) => {
  const { runTour, finishTour, skipTour, restartTour, activeTourType, saveTourStep } = useProfileTour();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [cardSize, setCardSize] = useState(CARD_DEFAULT_SIZE);
  const [showCompletion, setShowCompletion] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false,
  );

  const tourSteps = TOUR_STEPS_BY_TYPE[activeTourType] ?? PLATFORM_TOUR_STEPS;
  const currentStep = tourSteps[currentStepIndex];
  const totalSteps = tourSteps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateViewportMode = () => setIsDesktopViewport(mediaQuery.matches);
    updateViewportMode();
    mediaQuery.addEventListener("change", updateViewportMode);
    return () => mediaQuery.removeEventListener("change", updateViewportMode);
  }, []);

  useEffect(() => {
    if (!runTour) {
      setCurrentStepIndex(0);
      setTargetRect(null);
      setShowCompletion(false);
    }
  }, [runTour]);

  // Reset step on tour type change
  useEffect(() => {
    setCurrentStepIndex(0);
    setTargetRect(null);
    setShowCompletion(false);
  }, [activeTourType]);

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
  }, [currentStepIndex, enabled, runTour, activeTourType]);

  useEffect(() => {
    if (!runTour || !enabled || !currentStep) return;

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
        rect.bottom < 0 || rect.right < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth;
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
  }, [currentStep, enabled, isDesktopViewport, runTour, activeTourType]);

  const position = useMemo(() => {
    if (typeof window === "undefined") {
      return { left: VIEWPORT_PADDING, top: VIEWPORT_PADDING, placement: "below" as const, arrowLeft: 64 };
    }

    if (!isDesktopViewport) {
      const width = Math.min(window.innerWidth - MOBILE_VIEWPORT_PADDING * 2, 380);
      return {
        left: clamp(
          (window.innerWidth - width) / 2,
          MOBILE_VIEWPORT_PADDING,
          window.innerWidth - width - MOBILE_VIEWPORT_PADDING,
        ),
        top: clamp(
          window.innerHeight - cardSize.height - MOBILE_BOTTOM_OFFSET,
          MOBILE_VIEWPORT_PADDING,
          window.innerHeight - cardSize.height - MOBILE_VIEWPORT_PADDING,
        ),
        placement: "below" as const,
        arrowLeft: width / 2,
        width,
      };
    }

    if (!targetRect) {
      return {
        left: clamp(
          (window.innerWidth - cardSize.width) / 2,
          VIEWPORT_PADDING,
          window.innerWidth - cardSize.width - VIEWPORT_PADDING,
        ),
        top: VIEWPORT_PADDING * 2,
        placement: "below" as const,
        arrowLeft: cardSize.width / 2,
        width: cardSize.width,
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

    return { left, top, placement, arrowLeft, width: cardSize.width };
  }, [cardSize.height, cardSize.width, isDesktopViewport, targetRect]);

  const closeTour = useCallback(() => {
    setCurrentStepIndex(0);
    finishTour();
    setShowCompletion(false);
  }, [finishTour]);

  const handleSkip = useCallback(() => {
    setCurrentStepIndex(0);
    skipTour();
    setShowCompletion(false);
  }, [skipTour]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      setShowCompletion(true);
      finishTour();
      return;
    }
    const nextIndex = currentStepIndex + 1;
    setCurrentStepIndex(nextIndex);
    saveTourStep(activeTourType, nextIndex);
  }, [isLastStep, currentStepIndex, finishTour, saveTourStep, activeTourType]);

  const handleBack = useCallback(() => {
    if (currentStepIndex === 0) return;
    setCurrentStepIndex((i) => i - 1);
  }, [currentStepIndex]);

  const handleExploreHelp = useCallback(() => {
    setShowCompletion(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("initoption:open-help-center"));
    }
  }, []);

  const handleRestartTour = useCallback(() => {
    setShowCompletion(false);
    restartTour(activeTourType);
  }, [restartTour, activeTourType]);

  if (!runTour || !enabled) {
    if (showCompletion) {
      return (
        <TourCompletionScreen
          tourType={activeTourType}
          onClose={closeTour}
          onRestartTour={handleRestartTour}
          onExplorHelp={handleExploreHelp}
        />
      );
    }
    return null;
  }

  if (!currentStep) return null;

  const progressPercent = ((currentStepIndex + 1) / totalSteps) * 100;

  return (
    <>
      {/* Dim overlay — pointer-events: none so user can still interact beneath */}
      <div
        className="fixed inset-0 z-[140] pointer-events-none"
        aria-live="polite"
        role="dialog"
        aria-modal="true"
        aria-label={`${TOUR_LABELS[activeTourType]} step ${currentStepIndex + 1} of ${totalSteps}`}
      >
        {/* Subtle dark overlay */}
        <div className="absolute inset-0 bg-[#090e1a]/50" />

        {/* Spotlight highlight ring around target element */}
        {targetRect && (
          <div
            className="pointer-events-none fixed rounded-[20px] border-2 border-[#5da6ff]/80 shadow-[0_0_0_4000px_rgba(9,14,26,0.55),0_0_40px_rgba(46,125,255,0.35)]"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        )}
      </div>

      {/* Tooltip card — pointer-events: auto */}
      <div
        ref={cardRef}
        className={`fixed z-[150] rounded-[18px] border border-white/10 bg-[#1e2740] text-left shadow-[0_24px_60px_rgba(5,16,45,0.55)] ${
          isDesktopViewport ? "w-[340px]" : ""
        }`}
        style={{
          left: position.left,
          top: position.top,
          width: position.width,
          transition: "top 0.3s cubic-bezier(0.4,0,0.2,1), left 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
        role="tooltip"
      >
        {/* Arrow pointer */}
        {isDesktopViewport && targetRect && (
          <span
            className={`absolute h-5 w-5 rotate-45 border-white/10 bg-[#1e2740] ${
              position.placement === "above"
                ? "-bottom-2.5 border-b border-r"
                : "-top-2.5 border-t border-l"
            }`}
            style={{ left: position.arrowLeft - 10 }}
          />
        )}

        {/* Card inner content */}
        <div className="p-5">
          {/* Top row: tour type label + step counter + close */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-[#1175d5]/20 border border-[#1175d5]/30 px-2.5 py-0.5">
                <MapPin className="h-3 w-3 text-[#5da6ff]" />
                <span className="text-[11px] font-black text-[#5da6ff] tracking-[0.04em]">
                  {currentStep.tag || `${TOUR_LABELS[activeTourType]} · Step ${currentStepIndex + 1}`}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="rounded-full p-1 text-white/30 transition-colors hover:bg-white/5 hover:text-white/70"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-4 h-1 w-full rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1175d5] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Title */}
          <h3 className="text-[17px] font-black text-white mb-2 leading-tight">{currentStep.title}</h3>

          {/* Message */}
          <p className="text-[13px] leading-[1.55] text-white/65">{currentStep.message}</p>

          {/* Bottom nav */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-white/10 bg-white/5 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Previous step"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-[8px] bg-[#1175d5] px-5 py-2 text-[13px] font-black text-white transition-colors hover:bg-[#0d69c2]"
              >
                {isLastStep ? "Finish" : "Next"}
                {!isLastStep && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[12px] text-white/35 font-semibold">
                {currentStepIndex + 1} / {totalSteps}
              </span>
            </div>
          </div>

          {/* Skip tour link */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={handleSkip}
              className="text-[11px] text-white/25 hover:text-white/50 transition-colors"
            >
              Skip Tour
            </button>
          </div>
        </div>
      </div>

      {/* Completion modal rendered over everything else */}
      {showCompletion && (
        <TourCompletionScreen
          tourType={activeTourType}
          onClose={closeTour}
          onRestartTour={handleRestartTour}
          onExplorHelp={handleExploreHelp}
        />
      )}
    </>
  );
};

export { TOUR_LABELS };
export type { TourStep };
