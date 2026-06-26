import { getVipTierById, VipTierId } from "@/lib/vip";

interface VipBadgeProps {
  tierId: VipTierId | string;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export const VipBadge = ({ tierId, size = 24, showLabel = false, className = "" }: VipBadgeProps) => {
  const tier = getVipTierById(tierId);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} title={`${tier.name}: ${tier.shortDescription}`}>
      <img src={tier.icon} alt={tier.name} style={{ width: size, height: size, objectFit: "contain" }} />
      {showLabel && (
        <span className="text-[11px] font-black uppercase tracking-[0.08em] text-white/80">{tier.name}</span>
      )}
    </div>
  );
};
