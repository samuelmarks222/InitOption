import {
  BadgeInfo,
  Blocks,
  Headset,
  Instagram,
  MessageSquareText,
  Send,
  Star,
  ThumbsUp,
  Youtube,
} from "lucide-react";

interface WorkspaceHelpProps {
  onOpenSupport?: () => void;
}

const HELP_ITEMS = [
  { label: "Support Service", icon: Headset, action: "support" },
  { label: "Guides and Tutorials", icon: BadgeInfo, action: "guide" },
  { label: "Reviews", icon: ThumbsUp, action: "reviews" },
  { label: "Support Chat", icon: MessageSquareText, action: "support" },
  { label: "Apps", icon: Blocks, action: "apps" },
];

const CHANNELS = [
  { label: "Telegram", icon: Send },
  { label: "WhatsApp", text: "W" },
  { label: "Discord", text: "D" },
];

const SOCIALS = [
  { label: "Facebook", text: "f" },
  { label: "Telegram", icon: Send },
  { label: "Instagram", icon: Instagram },
  { label: "X", text: "X" },
  { label: "YouTube", icon: Youtube },
  { label: "TikTok", text: "t" },
];

export const WorkspaceHelp = ({ onOpenSupport }: WorkspaceHelpProps) => {
  const handleItemClick = (action: string) => {
    if (action === "support") {
      onOpenSupport?.();
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#222839] text-white">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
        <div className="space-y-2">
          {HELP_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleItemClick(item.action)}
                className="flex h-[56px] w-full items-center gap-4 rounded-[4px] bg-[#2b3448] px-5 text-left text-[14px] font-bold text-white transition-colors hover:bg-[#323d54]"
              >
                <Icon className="h-[23px] w-[23px] shrink-0 text-[#9db0c9]" strokeWidth={2.7} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <h3 className="mb-2 text-[14px] font-bold text-white">Official channels:</h3>
          <div className="grid grid-cols-3 gap-2">
            {CHANNELS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  aria-label={item.label}
                  className="flex h-[39px] items-center justify-center rounded-[5px] bg-[#2b3448] text-[#9db0c9] transition-colors hover:bg-[#33405a] hover:text-white"
                >
                  {Icon ? <Icon className="h-[21px] w-[21px]" strokeWidth={2.5} /> : <span className="text-[18px] font-black">{item.text}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-[14px] font-bold text-white">Follow us on:</h3>
          <div className="grid grid-cols-3 gap-2">
            {SOCIALS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  aria-label={item.label}
                  className="flex h-[39px] items-center justify-center rounded-[5px] bg-[#2b3448] text-[#9db0c9] transition-colors hover:bg-[#33405a] hover:text-white"
                >
                  {Icon ? <Icon className="h-[21px] w-[21px]" strokeWidth={2.5} /> : <span className="text-[18px] font-black">{item.text}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto pt-4">
          <div className="rounded-[5px] border border-white/[0.06] bg-[#1d2434] p-3">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#9db0c9]">
              <Star className="h-4 w-4 text-[#74a8ff]" fill="currentColor" />
              24/7 online desk
            </div>
            <p className="mt-1 text-[11px] leading-5 text-[#7f8da5]">
              Support chat opens in the trading panel so users can keep the chart visible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
