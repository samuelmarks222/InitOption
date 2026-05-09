import { VipBadge } from "@/components/vip/VipBadge";
import { useVip } from "@/contexts/VipContext";
import { formatVipCurrency } from "@/lib/vip";

interface VipProgressCardProps {
  compact?: boolean;
}

export const VipProgressCard = ({ compact = false }: VipProgressCardProps) => {
  const { vip } = useVip();
  const currentTier = vip.currentTier;
  const nextTier = vip.nextTier;

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] ${compact ? "p-4" : "p-5"}`}>
      <div className={`flex ${compact ? "flex-col gap-3" : "items-start justify-between gap-4"}`}>
        <div>
          <div className="flex items-center gap-2">
            <VipBadge tierId={currentTier.id} size={26} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Current VIP</p>
              <p className="text-[18px] font-bold text-white">{currentTier.name}</p>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-gray-400">{currentTier.shortDescription}</p>
        </div>
        <div className="min-w-[140px] rounded-xl border border-white/8 bg-black/20 px-3 py-2">
          <p className="text-[11px] text-gray-500">30d Volume</p>
          <p className="text-[15px] font-bold text-white">{formatVipCurrency(vip.tradeVolume30d)}</p>
          <p className="mt-1 text-[11px] text-gray-500">Trades: {vip.tradeCount30d}</p>
        </div>
      </div>

      {nextTier ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-white">Progress to {nextTier.name}</p>
            <VipBadge tierId={nextTier.id} size={20} />
          </div>
          {vip.progressMetrics.map((metric) => (
            <div key={metric.key}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-gray-400">{metric.label}</span>
                <span className="text-white">
                  {metric.key === "trades"
                    ? `${Math.round(metric.current)} / ${metric.required}`
                    : `${formatVipCurrency(metric.current)} / ${formatVipCurrency(metric.required)}`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${Math.max(4, metric.ratio * 100)}%`,
                    background: `linear-gradient(90deg, ${currentTier.accent}, ${nextTier.accent})`,
                  }}
                />
              </div>
            </div>
          ))}
          <div className="rounded-xl bg-black/20 px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">Next tier perks</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {nextTier.benefits.map((benefit) => (
                <span key={benefit} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-300">
                  {benefit}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-[12px] text-gray-300">
          Top tier unlocked. You currently have access to the platform’s highest VIP status.
        </div>
      )}
    </div>
  );
};
