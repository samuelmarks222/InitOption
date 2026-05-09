import {
  BadgeCheck,
  Crown,
  Gem,
  Medal,
  Shield,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { getVipTierById, VipTierId } from "@/lib/vip";

interface VipBadgeProps {
  tierId: VipTierId;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

interface BadgeTheme {
  start: string;
  end: string;
  edge: string;
  glow: string;
  icon: string;
  labelBg: string;
  labelText: string;
  shine: string;
}

const BADGE_ICONS: Record<VipTierId, LucideIcon> = {
  none: Shield,
  bronze: Medal,
  silver: BadgeCheck,
  gold: Crown,
  platinum: ShieldCheck,
  diamond: Gem,
};

const BADGE_THEMES: Record<VipTierId, BadgeTheme> = {
  none: {
    start: "#8895ab",
    end: "#4a556b",
    edge: "#d6deea",
    glow: "rgba(155, 169, 192, 0.62)",
    icon: "#ffffff",
    labelBg: "rgba(132, 149, 173, 0.2)",
    labelText: "#e7eef9",
    shine: "#f7fbff",
  },
  bronze: {
    start: "#ffb55e",
    end: "#d76412",
    edge: "#ffe0bb",
    glow: "rgba(255, 149, 73, 0.65)",
    icon: "#fff7ef",
    labelBg: "rgba(255, 157, 88, 0.22)",
    labelText: "#ffe3c7",
    shine: "#fff3e5",
  },
  silver: {
    start: "#f3f8ff",
    end: "#92a9d3",
    edge: "#ffffff",
    glow: "rgba(214, 228, 255, 0.72)",
    icon: "#17304c",
    labelBg: "rgba(206, 221, 255, 0.24)",
    labelText: "#f5f9ff",
    shine: "#ffffff",
  },
  gold: {
    start: "#ffe96a",
    end: "#f1a41b",
    edge: "#fff6c7",
    glow: "rgba(255, 206, 61, 0.74)",
    icon: "#5b3700",
    labelBg: "rgba(255, 211, 74, 0.24)",
    labelText: "#fff3bf",
    shine: "#fff9de",
  },
  platinum: {
    start: "#66f6e9",
    end: "#0e9ab8",
    edge: "#d8fffb",
    glow: "rgba(81, 241, 227, 0.72)",
    icon: "#052b3f",
    labelBg: "rgba(88, 246, 228, 0.22)",
    labelText: "#d5fffb",
    shine: "#f0fffe",
  },
  diamond: {
    start: "#74c4ff",
    end: "#4b57ff",
    edge: "#e4efff",
    glow: "rgba(103, 143, 255, 0.78)",
    icon: "#ffffff",
    labelBg: "rgba(112, 145, 255, 0.24)",
    labelText: "#e7eeff",
    shine: "#f4f8ff",
  },
};

export const VipBadge = ({ tierId, size = 24, showLabel = false, className = "" }: VipBadgeProps) => {
  const tier = getVipTierById(tierId);
  const Icon = BADGE_ICONS[tier.id] ?? Shield;
  const theme = BADGE_THEMES[tier.id] ?? BADGE_THEMES.none;
  const iconSize = Math.max(12, Math.round(size * 0.56));
  const borderRadius = Math.max(8, Math.round(size * 0.3));
  const innerRadius = Math.max(7, Math.round(size * 0.22));

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      title={`${tier.name}: ${tier.shortDescription}`}
    >
      <div
        className="relative inline-flex items-center justify-center overflow-hidden border shadow-[0_0_18px_rgba(0,0,0,0.25)]"
        style={{
          width: size,
          height: size,
          borderRadius,
          borderColor: theme.edge,
          background: `linear-gradient(145deg, ${theme.start} 0%, ${theme.end} 100%)`,
          boxShadow: `0 10px 18px rgba(0,0,0,0.32), 0 0 22px ${theme.glow}`,
        }}
      >
        <div
          className="absolute inset-[1px] border"
          style={{
            borderRadius: innerRadius,
            borderColor: "rgba(255,255,255,0.28)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 26%, rgba(18,24,36,0.08) 100%)",
          }}
        />
        <div
          className="absolute inset-x-[10%] top-[10%] h-[32%] rounded-[40%]"
          style={{
            background: `linear-gradient(180deg, ${theme.shine}55 0%, rgba(255,255,255,0) 100%)`,
            filter: "blur(1px)",
          }}
        />
        <div
          className="absolute inset-x-[14%] bottom-[14%] h-[16%] rounded-full"
          style={{ background: "rgba(8, 12, 20, 0.16)" }}
        />
        <Icon
          className="relative z-10"
          style={{
            width: iconSize,
            height: iconSize,
            color: theme.icon,
            filter: `drop-shadow(0 1px 1px rgba(0,0,0,0.18)) drop-shadow(0 0 10px ${theme.glow})`,
          }}
          strokeWidth={2.5}
        />
      </div>
      {showLabel && (
        <span
          className="rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em]"
          style={{
            borderColor: `${theme.edge}55`,
            background: theme.labelBg,
            color: theme.labelText,
            boxShadow: `0 0 14px ${theme.glow}`,
          }}
        >
          {tier.name}
        </span>
      )}
    </div>
  );
};
