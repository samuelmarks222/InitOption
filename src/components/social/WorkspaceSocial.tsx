import { useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { ProfileSupport } from "@/components/profile/ProfileSupport";

interface WorkspaceSocialProps {
  onClose?: () => void;
  onImmersiveChange?: (immersive: boolean) => void;
}

export const WorkspaceSocial = ({ onClose, onImmersiveChange }: WorkspaceSocialProps) => {
  useEffect(() => {
    onImmersiveChange?.(false);

    return () => {
      onImmersiveChange?.(false);
    };
  }, [onImmersiveChange]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#10131b] text-white">
      <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#121622] px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/85">
            <MessageCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-bold text-white">Chats & Support</h2>
            <p className="mt-0.5 text-[10px] font-semibold text-[#7e8798]">Live desk and trader room</p>
          </div>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Close chats and support"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ProfileSupport mode="compact" />
      </div>
    </div>
  );
};
