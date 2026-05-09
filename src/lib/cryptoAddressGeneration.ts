import type { Tables } from "@/integrations/supabase/types";

export type CryptoAddressGenerationMode = "manual_pool" | "xpub_evm";
export type CryptoDerivationFamily = "evm";

type CryptoMethodLike = Pick<
  Tables<"crypto_payment_methods">,
  "coin_name" | "symbol" | "network"
>;

const EVM_NETWORK_MARKERS = ["ERC20", "BEP20", "POLYGON", "C-CHAIN", "ETHEREUM"];

export const isEvmAddressGenerationCandidate = (method: CryptoMethodLike) => {
  const normalizedNetwork = method.network.trim().toUpperCase();
  return EVM_NETWORK_MARKERS.some((marker) => normalizedNetwork.includes(marker));
};

export const getCryptoAddressGenerationRecommendation = (method: CryptoMethodLike) => {
  if (isEvmAddressGenerationCandidate(method)) {
    return {
      description:
        "This network can auto-generate fresh deposit addresses from an EVM xpub. Users can keep the simple copy-address flow.",
      derivationFamily: "evm" as const,
      supported: true,
      suggestedMode: "xpub_evm" as const,
    };
  }

  return {
    description:
      "Automatic HD address generation is not implemented for this network yet. Keep using a manual address pool for now.",
    derivationFamily: null,
    supported: false,
    suggestedMode: "manual_pool" as const,
  };
};
