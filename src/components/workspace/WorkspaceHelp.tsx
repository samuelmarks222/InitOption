import {
  BadgeInfo,
  Blocks,
  Facebook,
  Globe,
  Headset,
  Instagram,
  MessageSquareText,
  Music2,
  Send,
  Star,
  ThumbsUp,
  Twitter,
  type LucideIcon,
  Youtube,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { WhatsAppLogo } from "@/components/icons/BrandSocialIcons";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

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

type SocialButton = {
  label: string;
  platform: string;
  href: string;
  icon?: LucideIcon | typeof WhatsAppLogo;
  text?: string;
  brand?: "whatsapp";
};

const resolveSocialHref = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
};

const resolveSocialVisual = (platform: string): Pick<SocialButton, "icon" | "text"> => {
  const normalized = platform.trim().toLowerCase();

  if (normalized.includes("telegram") || normalized === "tg") return { icon: Send };
  if (normalized === "x" || normalized.includes("twitter")) return { icon: Twitter };
  if (normalized.includes("instagram") || normalized === "ig") return { icon: Instagram };
  if (normalized.includes("facebook") || normalized === "fb") return { icon: Facebook };
  if (normalized.includes("youtube") || normalized === "yt") return { icon: Youtube };
  if (normalized.includes("whatsapp") || normalized === "wa") return { brand: "whatsapp", icon: WhatsAppLogo };
  if (normalized.includes("tiktok") || normalized === "tt") return { icon: Music2 };
  if (normalized.includes("discord")) return { text: "D" };

  return { icon: Globe };
};

export const WorkspaceHelp = ({ onOpenSupport }: WorkspaceHelpProps) => {
  const navigate = useNavigate();
  const { data: websiteContent } = useWebsiteContent();
  const socialButtons = useMemo<SocialButton[]>(() => {
    return websiteContent.socialLinks.items
      .map((item) => {
        const href = resolveSocialHref(item.url);
        const label = item.handle.trim() || item.platform.trim();
        return href && label ? { label, platform: item.platform, href, ...resolveSocialVisual(item.platform) } : null;
      })
      .filter((item): item is SocialButton => Boolean(item));
  }, [websiteContent.socialLinks.items]);
  const officialChannels = useMemo(() => {
    const preferred = socialButtons.filter((item) =>
      /telegram|whatsapp|discord|support/i.test(`${item.platform} ${item.label}`),
    );
    return (preferred.length ? preferred : socialButtons).slice(0, 3);
  }, [socialButtons]);
  const followLinks = socialButtons.slice(0, 6);

  const handleItemClick = (action: string) => {
    if (action === "support") {
      onOpenSupport?.();
      return;
    }

    if (action === "reviews") {
      navigate("/reviews");
      return;
    }

    if (action === "guide") {
      navigate("/trading-guide");
      return;
    }

    if (action === "apps") {
      navigate("/features");
    }
  };

  return (
    <div className="flex h-full w-full flex-col text-white" style={{ background: "var(--trading-workspace-panel-bg)" }}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
        <div className="space-y-2">
          {HELP_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleItemClick(item.action)}
                className="flex h-[56px] w-full items-center gap-4 rounded-[4px] border px-5 text-left text-[14px] font-bold text-white transition-colors hover:brightness-110"
                style={{ background: "var(--trading-panel-bg)", borderColor: "var(--trading-border-color)" }}
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
            {officialChannels.map((item) => {
              const Icon = item.icon;
              const isWhatsApp = item.brand === "whatsapp";
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className="flex h-[39px] items-center justify-center rounded-[5px] border text-[#9db0c9] transition-colors hover:text-white"
                  style={{ background: "var(--trading-panel-bg)", borderColor: "var(--trading-border-color)" }}
                >
                  {Icon ? (
                    <Icon className={`h-[21px] w-[21px] ${isWhatsApp ? "text-[#25D366]" : ""}`} strokeWidth={2.5} />
                  ) : (
                    <span className="text-[18px] font-black">{item.text}</span>
                  )}
                </a>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-[14px] font-bold text-white">Follow us on:</h3>
          <div className="grid grid-cols-3 gap-2">
            {followLinks.map((item) => {
              const Icon = item.icon;
              const isWhatsApp = item.brand === "whatsapp";
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className="flex h-[39px] items-center justify-center rounded-[5px] border text-[#9db0c9] transition-colors hover:text-white"
                  style={{ background: "var(--trading-panel-bg)", borderColor: "var(--trading-border-color)" }}
                >
                  {Icon ? (
                    <Icon className={`h-[21px] w-[21px] ${isWhatsApp ? "text-[#25D366]" : ""}`} strokeWidth={2.5} />
                  ) : (
                    <span className="text-[18px] font-black">{item.text}</span>
                  )}
                </a>
              );
            })}
          </div>
        </div>

        <div className="mt-auto pt-4">
          <div className="rounded-[5px] border p-3" style={{ background: "var(--trading-panel-soft-bg)", borderColor: "var(--trading-border-color)" }}>
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
