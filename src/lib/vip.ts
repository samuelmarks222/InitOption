export type VipTierId = "standard" | "pro" | "vip";

export interface VipTierConfig {
  id: VipTierId;
  level: number;
  name: string;
  icon: string;
  balanceThreshold: number;
  bonusPercentage: number;
  shortDescription: string;
  description: string;
  benefits: string[];
  accent: string;
  glow: string;
}

export const VIP_TIER_SEQUENCE: VipTierConfig[] = [
  {
    id: "standard",
    level: 1,
    name: "STANDARD",
    icon: "\u2708\ufe0f",
    balanceThreshold: 0,
    bonusPercentage: 0,
    shortDescription: "Level for beginners",
    description: "Basic percentage of profitability for all instruments",
    benefits: ["Standard percentage of profitability", "Basic support"],
    accent: "#34d399",
    glow: "rgba(52, 211, 153, 0.35)",
  },
  {
    id: "pro",
    level: 2,
    name: "PRO",
    icon: "\U0001f3c6",
    balanceThreshold: 5000,
    bonusPercentage: 2,
    shortDescription: "Level for casual traders",
    description: "Increased percentage of profitability for all instruments",
    benefits: ["+2% bonus percentage", "Promo codes from the market in mailings and promotions"],
    accent: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.4)",
  },
  {
    id: "vip",
    level: 3,
    name: "VIP",
    icon: "\U0001f48e",
    balanceThreshold: 10000,
    bonusPercentage: 4,
    shortDescription: "Level for professional traders",
    description: "Premium percentage of profitability for all instruments",
    benefits: ["+4% bonus percentage", "Promo codes from the market in mailings and promotions", "Priority support"],
    accent: "#a78bfa",
    glow: "rgba(167, 139, 250, 0.4)",
  },
];

export const VIP_TIER_MAP = Object.fromEntries(
  VIP_TIER_SEQUENCE.map((tier) => [tier.id, tier]),
) as Record<VipTierId, VipTierConfig>;

export const STANDARD_TIER = VIP_TIER_SEQUENCE[0];

export const getVipTierById = (tierId: VipTierId | string | null | undefined): VipTierConfig =>
  VIP_TIER_MAP[tierId as VipTierId] ?? STANDARD_TIER;

export const calculateVipTierFromBalance = (balance: number): VipTierConfig => {
  if (balance >= 10000) return VIP_TIER_MAP.vip;
  if (balance >= 5000) return VIP_TIER_MAP.pro;
  return VIP_TIER_MAP.standard;
};

export const formatVipCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
