import { type ComponentType, type ReactNode, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Gift, TrendingUp, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const BONUS_POPUP_DELAY_MS = 900;

interface BonusPopupProps {
  enabled?: boolean;
}

type PublicBonusSettings = {
  depositBonusEnabled: boolean;
  depositBonusPercent: number;
};

const FloatingCoin = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "absolute flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--landing-border))] bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,hsl(var(--landing-primary))_42%,hsl(var(--landing-surface))_100%)] shadow-[0_8px_18px_hsla(var(--landing-primary),0.16)]",
      className,
    )}
  >
    <span className="text-sm font-black text-[#ffffff]">$</span>
  </div>
);

const FloatingBill = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "absolute h-12 w-[72px] rounded-xl border border-[hsla(var(--landing-primary),0.6)] bg-[linear-gradient(180deg,hsl(var(--landing-primary))_0%,hsl(var(--landing-surface))_100%)] p-1.5 shadow-[0_14px_24px_hsla(var(--landing-primary),0.16)]",
      className,
    )}
  >
    <div className="flex h-full items-center justify-between rounded-lg border border-white/20 bg-[linear-gradient(180deg,hsla(var(--landing-surface),0.2)_0%,hsla(var(--landing-surface),0.08)_100%)] px-1.5">
      <span className="text-base font-black text-[hsl(var(--landing-secondary))]/80">$</span>
      <div className="space-y-0.5">
        <div className="h-1 w-5 rounded-full bg-[hsl(var(--landing-secondary))]/40" />
        <div className="h-1 w-3 rounded-full bg-[hsl(var(--landing-secondary))]/25" />
      </div>
    </div>
  </div>
);

const PromoIllustration = () => (
  <div className="relative mx-auto h-[160px] w-full max-w-[240px] sm:h-[180px]">
    <div className="absolute left-1/2 top-4 h-16 w-16 -translate-x-1/2 rounded-full bg-[hsla(var(--landing-primary),0.1)] blur-[34px]" />
    <div className="absolute left-1/2 top-8 h-24 w-28 -translate-x-1/2 rounded-full bg-[hsla(var(--landing-primary),0.1)] blur-[40px]" />

    <FloatingCoin className="left-[18%] top-0 h-7 w-7" />
    <FloatingCoin className="right-[14%] top-[52px] h-8 w-8" />
    <FloatingCoin className="left-[30%] top-[52px] h-6 w-6" />

    <FloatingBill className="left-[2%] top-[60px] h-10 w-[60px] -rotate-[22deg] p-1" />
    <FloatingBill className="right-[2%] top-[38px] h-10 w-[60px] rotate-[32deg] p-1" />

    <div className="absolute bottom-[12px] left-[18%] h-16 w-[80px] rotate-[18deg] rounded-[26px] bg-[linear-gradient(180deg,#ffffff_0%,white_100%)] shadow-[0_12px_24px_hsla(var(--landing-secondary),0.08)]">
      <div className="absolute -left-6 bottom-0 h-14 w-12 rounded-[20px] bg-[linear-gradient(180deg,white_0%,hsl(var(--landing-surface))_100%)]" />
      <div className="absolute left-2 top-2 h-10 w-9 rounded-[16px] bg-[linear-gradient(180deg,#ffffff_0%,white_100%)]" />
      <div className="absolute -bottom-1 right-1 h-7 w-18 rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,white_100%)]" />
      <div className="absolute -right-4 bottom-5 h-10 w-10 rounded-full bg-[linear-gradient(180deg,#ffffff_0%,white_100%)]" />
      <div className="absolute -bottom-2 left-4 h-12 w-14 rounded-[22px] bg-[linear-gradient(180deg,white_0%,hsl(var(--landing-surface))_100%)] shadow-[0_8px_10px_hsla(var(--landing-secondary),0.06)]" />
    </div>

    <div className="absolute left-1/2 top-[28px] flex h-[106px] w-[76px] -translate-x-1/2 flex-col rounded-[16px] border-[3px] border-[hsl(var(--landing-border))] bg-white px-2 pb-2 pt-2 shadow-[0_14px_24px_hsla(var(--landing-secondary),0.08)]">
      <div className="mx-auto mb-1 h-1 w-9 rounded-full bg-[hsl(var(--landing-border))]" />
      <div className="mb-2 flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-full bg-[hsl(var(--landing-primary))]" />
        <div className="h-1 w-5 rounded-full bg-[hsl(var(--landing-secondary))]/50" />
      </div>
      <div className="flex flex-1 items-end gap-0.5">
        <div className="h-6 w-1 rounded-full bg-[hsl(var(--landing-primary))]" />
        <div className="h-9 w-1 rounded-full bg-[hsl(var(--landing-secondary))]/40" />
        <div className="h-5 w-1 rounded-full bg-[hsl(var(--landing-primary))]" />
        <div className="h-3 w-1 rounded-full bg-[hsl(var(--landing-secondary))]/40" />
        <div className="h-8 w-1 rounded-full bg-[hsl(var(--landing-primary))]" />
        <div className="h-5 w-1 rounded-full bg-[hsl(var(--landing-secondary))]/40" />
      </div>
      <div className="relative mt-1 h-6">
        <div className="absolute left-1 top-4 h-0.5 w-9 rounded-full bg-[hsl(var(--landing-primary))]/75" />
        <TrendingUp className="absolute left-0 top-0 h-6 w-9 text-[hsl(var(--landing-primary))]" strokeWidth={2.8} />
      </div>
      <div className="mt-auto space-y-0.5">
        <div className="ml-auto flex w-fit items-center rounded-full bg-[hsl(var(--landing-primary))] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.12em] text-white">
          Buy
        </div>
        <div className="ml-auto flex w-fit items-center rounded-full bg-[hsl(var(--landing-secondary))]/10 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.12em] text-[hsl(var(--landing-secondary))]">
          Sell
        </div>
      </div>
    </div>
  </div>
);

const BenefitRow = ({
  icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) => {
  const Icon = icon;

  return (
    <div className="flex items-start gap-3 text-left">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--landing-border))] bg-[hsl(var(--landing-surface))] text-[hsl(var(--landing-border))]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="font-landing-copy text-[14px] leading-[1.25] text-[hsl(var(--landing-secondary))] sm:text-[15px]">{children}</p>
    </div>
  );
};

const fetchPublicBonusSettings = async (): Promise<PublicBonusSettings> => {
  const response = await fetch("/api/public-bonus", {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load public bonus settings: ${response.status}`);
  }

  return response.json() as Promise<PublicBonusSettings>;
};

const BonusPopup = ({ enabled = true }: BonusPopupProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: publicBonusSettings } = useQuery({
    queryKey: ["public-bonus-settings"],
    queryFn: fetchPublicBonusSettings,
    enabled: enabled && !user,
    staleTime: 60_000,
    retry: 1,
  });
  const resolvedBonusPercent =
    typeof publicBonusSettings?.depositBonusPercent === "number" &&
    Number.isFinite(publicBonusSettings.depositBonusPercent) &&
    publicBonusSettings.depositBonusPercent > 0
      ? Math.round(publicBonusSettings.depositBonusPercent)
      : 70;

  useEffect(() => {
    if (!enabled || user || typeof window === "undefined") return;

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, BONUS_POPUP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [enabled, user]);

  useEffect(() => {
    if (!enabled || user) {
      setOpen(false);
    }
  }, [enabled, user]);

  if (user) {
    return null;
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/38 backdrop-blur-[10px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(88vw,460px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[20px] border border-[hsl(var(--landing-border))] bg-white font-landing-copy text-[hsl(var(--landing-secondary))] shadow-[0_30px_100px_hsla(var(--landing-secondary),0.1)] outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,hsla(var(--landing-primary),0.16)_0%,transparent_100%)]" />
          <div className="absolute left-1/2 top-10 h-24 w-[56%] -translate-x-1/2 rounded-full bg-[hsla(var(--landing-primary),0.1)] blur-[56px]" />
          <div className="absolute bottom-3 left-1/2 h-12 w-[50%] -translate-x-1/2 rounded-full bg-[hsla(var(--landing-primary),0.1)] blur-[36px]" />

          <DialogPrimitive.Close asChild>
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-[hsl(var(--landing-border))] transition hover:bg-[hsl(var(--landing-surface))] hover:text-[hsl(var(--landing-secondary))]"
              aria-label="Close bonus popup"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </DialogPrimitive.Close>

          <div className="relative px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
            <PromoIllustration />

            <div className="mx-auto mt-1 max-w-[380px]">
              <DialogPrimitive.Title className="text-center font-landing-display text-[20px] font-black leading-none text-[hsl(var(--landing-secondary))] sm:text-[26px]">
                Register right now!
              </DialogPrimitive.Title>

              <DialogPrimitive.Description className="sr-only">
                Register now to receive a first deposit bonus and free demo account access.
              </DialogPrimitive.Description>

              <div className="mt-4 space-y-3 px-1 sm:mt-5">
                <BenefitRow icon={Gift}>{resolvedBonusPercent}% deposit bonus on your first deposit guaranteed</BenefitRow>
                <BenefitRow icon={CheckSquare}>You&apos;ll get access to a demo account for free skill training</BenefitRow>
              </div>

              <Link
                to="/register"
                onClick={() => handleOpenChange(false)}
                className="mt-5 inline-flex w-full items-center justify-center rounded-[12px] border border-[hsl(var(--landing-primary))] bg-[hsl(var(--landing-primary))] px-5 py-3 text-center font-landing-copy text-[15px] font-black text-[#ffffff] shadow-[0_14px_24px_hsla(var(--landing-primary),0.16)] transition hover:bg-[hsl(var(--landing-primary))] hover:brightness-[1.03] sm:mt-6"
              >
                Get Bonus
              </Link>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default BonusPopup;
