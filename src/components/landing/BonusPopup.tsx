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
      "absolute flex h-11 w-11 items-center justify-center rounded-full border border-[hsl(var(--landing-border))] bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,hsl(var(--landing-primary))_42%,hsl(var(--landing-surface))_100%)] shadow-[0_10px_24px_hsla(var(--landing-primary),0.16)]",
      className,
    )}
  >
    <span className="text-base font-black text-[#ffffff]">$</span>
  </div>
);

const FloatingBill = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "absolute h-16 w-24 rounded-xl border border-[hsla(var(--landing-primary),0.6)] bg-[linear-gradient(180deg,hsl(var(--landing-primary))_0%,hsl(var(--landing-surface))_100%)] p-2 shadow-[0_18px_30px_hsla(var(--landing-primary),0.16)]",
      className,
    )}
  >
    <div className="flex h-full items-center justify-between rounded-lg border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.08)_100%)] px-2">
      <span className="text-lg font-black text-[#0f1419]/80">$</span>
      <div className="space-y-1">
        <div className="h-1.5 w-6 rounded-full bg-[#0f1419]/40" />
        <div className="h-1.5 w-4 rounded-full bg-[#0f1419]/25" />
      </div>
    </div>
  </div>
);

const PromoIllustration = () => (
  <div className="relative mx-auto h-[222px] w-full max-w-[330px] sm:h-[248px]">
    <div className="absolute left-1/2 top-7 h-24 w-24 -translate-x-1/2 rounded-full bg-[hsla(var(--landing-primary),0.1)] blur-[46px]" />
    <div className="absolute left-1/2 top-12 h-32 w-40 -translate-x-1/2 rounded-full bg-[hsla(var(--landing-primary),0.1)] blur-[56px]" />

    <FloatingCoin className="left-[20%] top-1 h-9 w-9" />
    <FloatingCoin className="right-[16%] top-[76px] h-10 w-10" />
    <FloatingCoin className="left-[33%] top-[76px] h-8 w-8" />

    <FloatingBill className="left-[3%] top-[86px] h-12 w-[76px] -rotate-[22deg] p-1.5" />
    <FloatingBill className="right-[3%] top-[58px] h-12 w-[76px] rotate-[32deg] p-1.5" />

    <div className="absolute bottom-[18px] left-[22%] h-24 w-[104px] rotate-[18deg] rounded-[34px] bg-[linear-gradient(180deg,#ffffff_0%,#e8ecf4_100%)] shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
      <div className="absolute -left-8 bottom-0 h-20 w-16 rounded-[28px] bg-[linear-gradient(180deg,#e8ecf4_0%,#f5f6fa_100%)]" />
      <div className="absolute left-3 top-3 h-14 w-12 rounded-[22px] bg-[linear-gradient(180deg,#ffffff_0%,#e8ecf4_100%)]" />
      <div className="absolute -bottom-2 right-2 h-9 w-24 rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#e8ecf4_100%)]" />
      <div className="absolute -right-5 bottom-8 h-14 w-14 rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#e8ecf4_100%)]" />
      <div className="absolute -bottom-3 left-6 h-16 w-20 rounded-[30px] bg-[linear-gradient(180deg,#e8ecf4_0%,#f5f6fa_100%)] shadow-[0_10px_14px_rgba(0,0,0,0.04)]" />
    </div>

    <div className="absolute left-1/2 top-[40px] flex h-[144px] w-[98px] -translate-x-1/2 flex-col rounded-[22px] border-[4px] border-[hsl(var(--landing-border))] bg-white px-3 pb-3 pt-3 shadow-[0_18px_32px_rgba(0,0,0,0.06)]">
      <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-[#a9e2dd]" />
      <div className="mb-3 flex items-center gap-2">
        <div className="h-4 w-4 rounded-full bg-[hsl(var(--landing-primary))]" />
        <div className="h-1.5 w-6 rounded-full bg-[#0f1419]/50" />
      </div>
      <div className="flex flex-1 items-end gap-1">
        <div className="h-9 w-1.5 rounded-full bg-[hsl(var(--landing-primary))]" />
        <div className="h-[3.25rem] w-1.5 rounded-full bg-[#0f1419]/40" />
        <div className="h-8 w-1.5 rounded-full bg-[hsl(var(--landing-primary))]" />
        <div className="h-5 w-1.5 rounded-full bg-[#0f1419]/40" />
        <div className="h-11 w-1.5 rounded-full bg-[hsl(var(--landing-primary))]" />
        <div className="h-7 w-1.5 rounded-full bg-[#0f1419]/40" />
      </div>
      <div className="relative mt-2 h-8">
        <div className="absolute left-2 top-5 h-1 w-12 rounded-full bg-[hsl(var(--landing-primary))]/75" />
        <TrendingUp className="absolute left-1 top-0 h-8 w-12 text-[hsl(var(--landing-primary))]" strokeWidth={2.8} />
      </div>
      <div className="mt-auto space-y-1">
        <div className="ml-auto flex w-fit items-center rounded-full bg-[hsl(var(--landing-primary))] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white">
          Buy
        </div>
        <div className="ml-auto flex w-fit items-center rounded-full bg-[#0f1419]/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-[#0f1419]">
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
    <div className="flex items-start gap-4 text-left">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[hsl(var(--landing-border))] bg-[#f8f9fc] text-[#536471]">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="font-landing-copy text-[16px] leading-[1.25] text-[#0f1419] sm:text-[18px]">{children}</p>
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
          className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,620px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-[hsl(var(--landing-border))] bg-white font-landing-copy text-[#0f1419] shadow-[0_30px_100px_rgba(0,0,0,0.08)] outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,hsla(var(--landing-primary),0.16)_0%,rgba(255,255,255,0)_100%)]" />
          <div className="absolute left-1/2 top-16 h-32 w-[56%] -translate-x-1/2 rounded-full bg-[hsla(var(--landing-primary),0.1)] blur-[76px]" />
          <div className="absolute bottom-5 left-1/2 h-16 w-[50%] -translate-x-1/2 rounded-full bg-[hsla(var(--landing-primary),0.1)] blur-[48px]" />

          <DialogPrimitive.Close asChild>
            <button
              type="button"
              className="absolute right-4 top-4 z-10 rounded-full p-2 text-[#536471] transition hover:bg-[#f0f2f5] hover:text-[#0f1419]"
              aria-label="Close bonus popup"
            >
              <X className="h-7 w-7" strokeWidth={1.75} />
            </button>
          </DialogPrimitive.Close>

          <div className="relative px-4 pb-6 pt-5 sm:px-7 sm:pb-8 sm:pt-6">
            <PromoIllustration />

            <div className="mx-auto mt-1 max-w-[500px]">
              <DialogPrimitive.Title className="text-center font-landing-display text-[26px] font-black leading-none text-[#0f1419] sm:text-[36px]">
                Register right now!
              </DialogPrimitive.Title>

              <DialogPrimitive.Description className="sr-only">
                Register now to receive a first deposit bonus and free demo account access.
              </DialogPrimitive.Description>

              <div className="mt-5 space-y-4 px-1 sm:mt-6">
                <BenefitRow icon={Gift}>{resolvedBonusPercent}% deposit bonus on your first deposit guaranteed</BenefitRow>
                <BenefitRow icon={CheckSquare}>You&apos;ll get access to a demo account for free skill training</BenefitRow>
              </div>

              <Link
                to="/register"
                onClick={() => handleOpenChange(false)}
                className="mt-6 inline-flex w-full items-center justify-center rounded-[16px] border border-[hsl(var(--landing-primary))] bg-[hsl(var(--landing-primary))] px-6 py-4 text-center font-landing-copy text-[18px] font-black text-[#ffffff] shadow-[0_20px_32px_hsla(var(--landing-primary),0.16)] transition hover:bg-[hsl(var(--landing-primary))] hover:brightness-[1.03] sm:mt-7"
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
