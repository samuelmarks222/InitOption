import { CheckCircle2, Wallet, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type DepositGuideReason = "deposit_required" | "insufficient_balance";

interface DepositGuideReminderProps {
  open: boolean;
  reason: DepositGuideReason | null;
  onClose: () => void;
  onDeposit: () => void;
}

const CARD_DEFAULT_SIZE = { width: 332, height: 208 };
const VIEWPORT_PADDING = 20;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getVisibleDepositTarget = () => {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-deposit-trigger="true"]'));
  return (
    targets.find((target) => {
      const rect = target.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) ?? null
  );
};

export const DepositGuideReminder = ({ open, reason, onClose, onDeposit }: DepositGuideReminderProps) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [cardSize, setCardSize] = useState(CARD_DEFAULT_SIZE);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;

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
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTargetRect(null);
      return;
    }

    const updateTargetRect = () => {
      const target = getVisibleDepositTarget();
      if (!target) {
        setTargetRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      if (rect.bottom < 0 || rect.right < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth) {
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }

      setTargetRect(target.getBoundingClientRect());
    };

    updateTargetRect();
    const frameId = window.requestAnimationFrame(updateTargetRect);

    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [open]);

  const content = useMemo(() => {
    if (reason === "insufficient_balance") {
      return {
        title: "Top up before this trade",
        message: "Your live balance is too low for this order. Use the highlighted Deposit button to add funds and continue.",
      };
    }

    return {
      title: "Live trading needs a deposit",
      message: "Before placing trades on the live account, make your first deposit. The Deposit button is highlighted for you above.",
    };
  }, [reason]);

  const position = useMemo(() => {
    if (typeof window === "undefined") {
      return { left: VIEWPORT_PADDING, top: VIEWPORT_PADDING, placement: "below" as const, arrowLeft: 64 };
    }

    if (!targetRect) {
      const width = Math.min(cardSize.width, window.innerWidth - VIEWPORT_PADDING * 2);
      return {
        left: clamp((window.innerWidth - width) / 2, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING)),
        top: VIEWPORT_PADDING * 2,
        placement: "below" as const,
        arrowLeft: width / 2,
      };
    }

    const width = Math.min(cardSize.width, window.innerWidth - VIEWPORT_PADDING * 2);
    const spaceAbove = targetRect.top;
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const placement = spaceAbove > cardSize.height + 36 || spaceAbove >= spaceBelow ? "above" : "below";
    const left = clamp(
      targetRect.left + targetRect.width / 2 - width / 2,
      VIEWPORT_PADDING,
      Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING),
    );
    const top =
      placement === "above"
        ? clamp(targetRect.top - cardSize.height - 20, VIEWPORT_PADDING, window.innerHeight - cardSize.height - VIEWPORT_PADDING)
        : clamp(targetRect.bottom + 20, VIEWPORT_PADDING, window.innerHeight - cardSize.height - VIEWPORT_PADDING);
    const arrowLeft = clamp(targetRect.left + targetRect.width / 2 - left, 32, width - 32);

    return { left, top, placement, arrowLeft, width };
  }, [cardSize.height, cardSize.width, targetRect]);

  if (!open || !reason) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[170]" aria-live="polite">
      <div className="pointer-events-none absolute inset-0 bg-black/10" />

      {targetRect && (
        <div
          className="pointer-events-none fixed rounded-[18px] border border-[#72d89d]/70 bg-[#72d89d]/8 shadow-[0_0_0_1px_rgba(114,216,157,0.2),0_0_30px_rgba(39,183,111,0.22)]"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      <div
        ref={cardRef}
        className="pointer-events-auto fixed w-[min(332px,calc(100vw-40px))] rounded-[22px] border border-white/8 bg-[#212938] p-6 text-left text-white shadow-[0_24px_60px_rgba(5,16,45,0.46)]"
        style={{ left: position.left, top: position.top }}
      >
        <span
          className={`absolute h-5 w-5 rotate-45 border border-white/8 bg-[#212938] ${
            position.placement === "above" ? "-bottom-3" : "-top-3"
          }`}
          style={{ left: position.arrowLeft - 10 }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#1fbf75]/18 text-[#74f0a8]">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[#7fd6a5]">Deposit Guide</div>
              <div className="mt-1 text-[20px] font-bold leading-tight text-white">{content.title}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#91a0b8] transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Dismiss deposit guide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-5 text-[14px] leading-6 text-[#d4dced]">{content.message}</p>

        <div className="mt-5 flex items-center gap-2 rounded-[14px] border border-[#2b3649] bg-[#1a2230] px-4 py-3 text-[13px] text-[#9eb0ca]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#74f0a8]" />
          <span>The Deposit button is now highlighted so the next step is clear.</span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onDeposit}
            className="rounded-[12px] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:brightness-110"
            style={{
              background: "var(--trading-success-color)",
              color: "var(--trading-success-contrast-color)",
              boxShadow: "var(--trading-success-shadow)",
            }}
          >
            Open deposit
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] border border-white/10 px-5 py-3 text-[14px] font-semibold text-[#d4dced] transition-colors hover:bg-white/5"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};
