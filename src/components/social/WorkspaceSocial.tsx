import { useEffect, useState } from "react";
import { ChevronLeft, LifeBuoy, MessagesSquare, X } from "lucide-react";
import { ProfileSupport } from "@/components/profile/ProfileSupport";

type SocialView = "home" | "community" | "desk";

const VIEW_CARDS = [
  {
    id: "community" as const,
    label: "Traders chats",
    icon: MessagesSquare,
    description: "Open trader conversations, market calls, and quick live discussion.",
  },
  {
    id: "desk" as const,
    label: "Support chat",
    icon: LifeBuoy,
    description: "Private help for account issues, deposits, withdrawals, and general support.",
  },
] satisfies Array<{ id: Exclude<SocialView, "home">; label: string; icon: typeof MessagesSquare; description: string }>;

interface WorkspaceSocialProps {
  onClose?: () => void;
  onImmersiveChange?: (immersive: boolean) => void;
}

export const WorkspaceSocial = ({ onClose, onImmersiveChange }: WorkspaceSocialProps) => {
  const [activeView, setActiveView] = useState<SocialView>("home");
  const isImmersiveView = activeView !== "home";

  useEffect(() => {
    onImmersiveChange?.(isImmersiveView);

    return () => {
      onImmersiveChange?.(false);
    };
  }, [isImmersiveView, onImmersiveChange]);

  if (activeView !== "home") {
    const currentCard = VIEW_CARDS.find((card) => card.id === activeView);
    const title =
      activeView === "community"
        ? "Traders chats"
        : "Support chat";
    const description =
      activeView === "community"
        ? "Live room for trader conversation, setups, and market discussion."
        : "Private support room for account help, payments, and platform questions.";
    const Icon = currentCard?.icon ?? MessagesSquare;

    return (
      <div className="flex h-full flex-col bg-[#0E1217] text-white">
        <div className="border-b border-white/8 bg-[#11161d] px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveView("home")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-black/20 text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Back to social hub"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-black/20 text-blue-300">
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-bold sm:text-[19px]">{title}</h2>
              <p className="mt-1 text-[12px] text-gray-400">{description}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">
                Live
              </div>
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-black/20 text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label={`Close ${title.toLowerCase()}`}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 px-3 py-3 sm:px-4 sm:py-4">
          {activeView === "community" ? <ProfileSupport mode="community" /> : null}
          {activeView === "desk" ? <ProfileSupport mode="desk" /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0E1217] text-white">
      <div className="border-b border-white/8 bg-[#11161d] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold">Chats</h2>
            <p className="mt-1 text-[11px] text-gray-400">Choose either traders chats or the private support chat.</p>
          </div>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">
            Live
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="grid gap-3">
          {VIEW_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setActiveView(card.id)}
              className="group rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 text-left transition-all hover:border-white/14 hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-blue-300 transition-colors group-hover:text-white">
                  <card.icon className="h-5 w-5" />
                </div>
                <div className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                  {card.id === "desk" ? "Private" : "Open room"}
                </div>
              </div>
              <h3 className="mt-4 text-[15px] font-bold text-white">{card.label}</h3>
              <p className="mt-2 text-[12px] leading-6 text-gray-400">{card.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
