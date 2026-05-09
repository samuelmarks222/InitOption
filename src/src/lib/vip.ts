export type VipTierId = "none" | "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface VipTierConfig {
  id: VipTierId;
  level: number;
  name: string;
  minDeposit: number;
  minVolume30d: number;
  minTrades30d: number;
  shortDescription: string;
  benefits: string[];
  accent: string;
  glow: string;
}

export interface VipMetricsInput {
  totalDeposit: number;
  tradeVolume30d: number;
  tradeCount30d: number;
}

export interface VipProgressMetric {
  key: "deposit" | "volume" | "trades";
  label: string;
  current: number;
  required: number;
  ratio: number;
}

export const VIP_TIER_SEQUENCE: VipTierConfig[] = [
  {
    id: "bronze",
    level: 1,
    name: "Bronze",
    minDeposit: 100,
    minVolume30d: 1000,
    minTrades30d: 10,
    shortDescription: "Starter VIP access for active traders.",
    benefits: ["Priority payout boosts", "Starter VIP support", "Entry-level tournaments"],
    accent: "#b87333",
    glow: "rgba(184, 115, 51, 0.35)",
  },
  {
    id: "silver",
    level: 2,
    name: "Silver",
    minDeposit: 500,
    minVolume30d: 5000,
    minTrades30d: 25,
    shortDescription: "Stronger trading perks and faster support.",
    benefits: ["Higher payouts", "Lower minimum trades", "Silver tournament access"],
    accent: "#c0c7d1",
    glow: "rgba(192, 199, 209, 0.35)",
  },
  {
    id: "gold",
    level: 3,
    name: "Gold",
    minDeposit: 2000,
    minVolume30d: 20000,
    minTrades30d: 50,
    shortDescription: "Premium performance tier with stronger trading rewards.",
    benefits: ["Gold payout bonuses", "Dedicated support lane", "Exclusive events"],
    accent: "#f2b94b",
    glow: "rgba(242, 185, 75, 0.4)",
  },
  {
    id: "platinum",
    level: 4,
    name: "Platinum",
    minDeposit: 10000,
    minVolume30d: 100000,
    minTrades30d: 100,
    shortDescription: "Elite tier for high-volume traders.",
    benefits: ["Enhanced payout rates", "Lower trade floor", "Premium tournaments"],
    accent: "#7fe7d8",
    glow: "rgba(127, 231, 216, 0.38)",
  },
  {
    id: "diamond",
    level: 5,
    name: "Diamond",
    minDeposit: 25000,
    minVolume30d: 250000,
    minTrades30d: 250,
    shortDescription: "Top-tier recognition with the strongest trading privileges.",
    benefits: ["Best payout tier", "Top concierge support", "Diamond-only competitions"],
    accent: "#59b9ff",
    glow: "rgba(89, 185, 255, 0.4)",
  },
];

export const VIP_NONE_TIER: VipTierConfig = {
  id: "none",
  level: 0,
  name: "No VIP",
  minDeposit: 0,
  minVolume30d: 0,
  minTrades30d: 0,
  shortDescription: "Trade and deposit to unlock your first VIP badge.",
  benefits: ["Unlock Bronze by meeting the first activity targets"],
  accent: "#64748b",
  glow: "rgba(100, 116, 139, 0.3)",
};

export const VIP_TIER_MAP = Object.fromEntries(
  [VIP_NONE_TIER, ...VIP_TIER_SEQUENCE].map((tier) => [tier.id, tier]),
) as Record<VipTierId, VipTierConfig>;

export const getVipTierById = (tierId: VipTierId | null | undefined) => VIP_TIER_MAP[tierId ?? "none"] ?? VIP_NONE_TIER;

export const calculateVipTier = (metrics: VipMetricsInput): VipTierConfig => {
  let currentTier = VIP_NONE_TIER;

  for (const tier of VIP_TIER_SEQUENCE) {
    const qualifies =
      metrics.totalDeposit >= tier.minDeposit &&
      metrics.tradeVolume30d >= tier.minVolume30d &&
      metrics.tradeCount30d >= tier.minTrades30d;

    if (qualifies) currentTier = tier;
  }

  return currentTier;
};

export const getNextVipTier = (currentTierId: VipTierId) => {
  const currentLevel = getVipTierById(currentTierId).level;
  return VIP_TIER_SEQUENCE.find((tier) => tier.level === currentLevel + 1) ?? null;
};

export const getVipProgressMetrics = (metrics: VipMetricsInput, targetTier: VipTierConfig | null): VipProgressMetric[] => {
  if (!targetTier) return [];

  const normalize = (current: number, required: number) => {
    if (required <= 0) return 1;
    return Math.max(0, Math.min(1, current / required));
  };

  return [
    {
      key: "deposit",
      label: "Deposits",
      current: metrics.totalDeposit,
      required: targetTier.minDeposit,
      ratio: normalize(metrics.totalDeposit, targetTier.minDeposit),
    },
    {
      key: "volume",
      label: "30d Volume",
      current: metrics.tradeVolume30d,
      required: targetTier.minVolume30d,
      ratio: normalize(metrics.tradeVolume30d, targetTier.minVolume30d),
    },
    {
      key: "trades",
      label: "30d Trades",
      current: metrics.tradeCount30d,
      required: targetTier.minTrades30d,
      ratio: normalize(metrics.tradeCount30d, targetTier.minTrades30d),
    },
  ];
};

export const formatVipCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
