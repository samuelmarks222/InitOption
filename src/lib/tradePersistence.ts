export interface TradeInsertPayloadInput {
  userId: string;
  assetSymbol: string;
  direction: "higher" | "lower";
  amount: number;
  entryPrice: number;
  markerTime?: number | null;
  expirySeconds: number;
  payoutRate: number;
  openedAt: string;
  tournamentParticipantId?: string | null;
}

export const buildTradeInsertPayload = ({
  userId,
  assetSymbol,
  direction,
  amount,
  entryPrice,
  expirySeconds,
  payoutRate,
  openedAt,
  tournamentParticipantId,
}: TradeInsertPayloadInput) => ({
  user_id: userId,
  asset_symbol: assetSymbol,
  direction,
  amount,
  entry_price: entryPrice,
  expiry_seconds: expirySeconds,
  payout_rate: payoutRate,
  status: "open",
  opened_at: openedAt,
  tournament_participant_id: tournamentParticipantId ?? null,
});
