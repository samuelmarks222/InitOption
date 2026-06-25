import { VipBadge } from "@/components/vip/VipBadge";
import { useVip } from "@/contexts/VipContext";

interface VipProgressCardProps {
  compact?: boolean;
}

export const VipProgressCard = ({ compact = false }: VipProgressCardProps) => {
  const { vip } = useVip();
  const currentTier = vip.currentTier;

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] ${compact ? "p-4" : "p-5"}`}>
      <div className={`flex ${compact ? "flex-col gap-3" : "items-start justify-between gap-4"}`}>
        <div>
          <div className="flex items-center gap-2">
            <VipBadge tierId={currentTier.id} size={26} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Current Level</p>
              <p className="text-[18px] font-bold text-white">{currentTier.name}</p>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-gray-400">{currentTier.shortDescription}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/8 bg-black/20 px-3 py-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">Level perks</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {currentTier.benefits.map((benefit) => (
            <span key={benefit} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-300">
              {benefit}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
