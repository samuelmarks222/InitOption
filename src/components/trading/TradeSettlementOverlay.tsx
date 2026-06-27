import { useTrading } from "@/hooks/useTrading";
import { mapTradeSettlementToPresentation, TradeResultDetailModal } from "./TradeResultPresentation";

export const TradeSettlementOverlay = () => {
  const { pendingSettlements, dismissSettlement } = useTrading();
  const latest = pendingSettlements.length > 0 ? pendingSettlements[pendingSettlements.length - 1] : null;

  return (
    <TradeResultDetailModal
      trade={latest ? mapTradeSettlementToPresentation(latest) : null}
      onClose={latest ? () => dismissSettlement(latest.id) : undefined}
    />
  );
};
