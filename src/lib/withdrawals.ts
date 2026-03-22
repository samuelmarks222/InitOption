import { supabase } from "@/integrations/supabase/client";

export type WithdrawalDecision = "approved" | "rejected";

export interface WithdrawalRequestPayload {
  amount?: number;
  destination?: string;
  method?: string;
  request_id?: string;
  status?: string;
}

interface RequestWithdrawalArgs {
  amount: number;
  destination: string;
  method: string;
}

interface AdminUpdateWithdrawalStatusArgs {
  adminNote?: string | null;
  requestId: string;
  status: WithdrawalDecision;
}

export const requestWithdrawal = async ({
  amount,
  destination,
  method,
}: RequestWithdrawalArgs): Promise<WithdrawalRequestPayload> => {
  const response = await supabase.rpc("request_withdrawal", {
    p_amount: amount,
    p_destination: destination,
    p_method: method,
  });

  if (response.error) {
    throw response.error;
  }

  return (response.data ?? {}) as WithdrawalRequestPayload;
};

export const adminUpdateWithdrawalStatus = async ({
  adminNote = null,
  requestId,
  status,
}: AdminUpdateWithdrawalStatusArgs): Promise<WithdrawalRequestPayload> => {
  const response = await supabase.rpc("admin_update_withdrawal_status", {
    p_admin_note: adminNote,
    p_request_id: requestId,
    p_status: status,
  });

  if (response.error) {
    throw response.error;
  }

  return (response.data ?? {}) as WithdrawalRequestPayload;
};
