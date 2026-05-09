import { useTrading } from "@/hooks/useTrading";
import { mapTradeSettlementToPresentation, TradeResultDetailModal } from "./TradeResultPresentation";

export const TradeSettlementOverlay = () => {
  const { latestSettlement, clearLatestSettlement } = useTrading();

  return (
    <TradeResultDetailModal
      trade={latestSettlement ? mapTradeSettlementToPresentation(latestSettlement) : null}
      onClose={clearLatestSettlement}
    />
  );
};
