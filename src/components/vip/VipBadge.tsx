import { Star } from "lucide-react";
import { getVipTierById, VipTierId } from "@/lib/vip";

interface VipBadgeProps {
  tierId: VipTierId;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export const VipBadge = ({ tierId, size = 24, showLabel = false, className = "" }: VipBadgeProps) => {
  const tier = getVipTierById(tierId);
  const iconSize = Math.max(12, Math.round(size * 0.52));

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      title={`${tier.name}: ${tier.shortDescription}`}
    >
      <div
        className="relative inline-flex items-center justify-center rounded-full border shadow-[0_0_18px_rgba(0,0,0,0.25)]"
        style={{
          width: size,
          height: size,
          borderColor: `${tier.accent}55`,
          background: `radial-gradient(circle at 30% 30%, ${tier.accent} 0%, rgba(19,35,45,0.96) 70%)`,
          boxShadow: `0 0 14px ${tier.glow}`,
        }}
      >
        <Star className="text-white fill-white/20" style={{ width: iconSize, height: iconSize }} />
      </div>
      {showLabel && (
        <span className="text-[12px] font-semibold text-white">{tier.name}</span>
      )}
    </div>
  );
};
