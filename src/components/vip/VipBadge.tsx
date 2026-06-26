import { getVipTierById, VipTierId } from "@/lib/vip";

interface VipBadgeProps {
  tierId: VipTierId | string;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

interface BadgeTheme {
  start: string;
  end: string;
  edge: string;
  glow: string;
  labelBg: string;
  labelText: string;
  shine: string;
}

const BADGE_THEMES: Record<string, BadgeTheme> = {
  standard: {
    start: "#34d399",
    end: "#059669",
    edge: "#6ee7b7",
    glow: "rgba(52, 211, 153, 0.5)",
    labelBg: "rgba(52, 211, 153, 0.15)",
    labelText: "#d1fae5",
    shine: "#ecfdf5",
  },
  pro: {
    start: "#fbbf24",
    end: "#d97706",
    edge: "#fde68a",
    glow: "rgba(251, 191, 36, 0.55)",
    labelBg: "rgba(251, 191, 36, 0.18)",
    labelText: "#fef3c7",
    shine: "#fffbeb",
  },
  vip: {
    start: "#c084fc",
    end: "#7c3aed",
    edge: "#ddd6fe",
    glow: "rgba(192, 132, 252, 0.6)",
    labelBg: "rgba(192, 132, 252, 0.18)",
    labelText: "#ede9fe",
    shine: "#f5f3ff",
  },
};

export const VipBadge = ({ tierId, size = 24, showLabel = false, className = "" }: VipBadgeProps) => {
  const tier = getVipTierById(tierId);
  const theme = BADGE_THEMES[tier.id] ?? BADGE_THEMES.standard;
  const iconSize = Math.max(14, Math.round(size * 0.56));
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
        <img
          src={tier.icon}
          alt={tier.name}
          className="relative z-10"
          style={{ width: iconSize, height: iconSize, objectFit: "contain" }}
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
