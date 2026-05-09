import { supabase } from "@/integrations/supabase/client";

export type DepositDecision = "approved" | "rejected";

const PENDING_DEPOSIT_MIGRATION_PATH = "supabase/migrations/20260322_c_pending_deposit_review.sql";

export interface DepositReviewPayload {
  amount?: number;
  credited_amount?: number | null;
  method?: string;
  promo_bonus?: number;
  request_id?: string;
  status?: string;
}

interface RequestDepositReviewArgs {
  amount: number;
  method: string;
  paymentMethodId?: string | null;
  promoId?: string | null;
  txHash?: string | null;
}

interface AdminUpdateDepositStatusArgs {
  adminNote?: string | null;
  requestId: string;
  status: DepositDecision;
}

const withPendingDepositMigrationHint = (error: {
  details?: string | null;
  hint?: string | null;
  message?: string;
}) => {
  const combined = [error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();
  const needsMigrationHint = [
    "request_deposit_review",
    "admin_update_deposit_status",
    "deposit_requests",
    "credit_deposit_internal",
  ].some((needle) => combined.includes(needle));

  if (!needsMigrationHint) {
    return error;
  }

  const baseMessage = error.message ?? "The pending deposit review flow is not available yet.";
  return new Error(
    `${baseMessage} Run ${PENDING_DEPOSIT_MIGRATION_PATH} before testing the new deposit request flow.`,
  );
};

export const requestDepositReview = async ({
  amount,
  method,
  paymentMethodId = null,
  promoId = null,
  txHash = null,
}: RequestDepositReviewArgs): Promise<DepositReviewPayload> => {
  const response = await supabase.rpc("request_deposit_review", {
    p_amount: amount,
    p_method: method,
    p_payment_method_id: paymentMethodId,
    p_promo_id: promoId,
    p_tx_hash: txHash,
  });

  if (response.error) {
    throw withPendingDepositMigrationHint(response.error);
  }

  return (response.data ?? {}) as DepositReviewPayload;
};

export const adminUpdateDepositStatus = async ({
  adminNote = null,
  requestId,
  status,
}: AdminUpdateDepositStatusArgs): Promise<DepositReviewPayload> => {
  const response = await supabase.rpc("admin_update_deposit_status", {
    p_admin_note: adminNote,
    p_request_id: requestId,
    p_status: status,
  });

  if (response.error) {
    throw withPendingDepositMigrationHint(response.error);
  }

  return (response.data ?? {}) as DepositReviewPayload;
};
