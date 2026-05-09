import { supabase } from "@/integrations/supabase/client";

export type WithdrawalDecision = "approved" | "rejected";
export type MobileMoneyWithdrawalDecision = "approved" | "rejected" | "completed" | "failed";

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

const getAccessToken = async () => {
  const sessionResponse = await supabase.auth.getSession();
  const accessToken = sessionResponse.data.session?.access_token;

  if (!accessToken) {
    throw new Error("Authentication required. Please sign in again.");
  }

  return accessToken;
};

const postAuthenticatedJson = async <T>(path: string, body: Record<string, unknown>) => {
  const accessToken = await getAccessToken();

  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let payload: { error?: string } & Partial<T> = {};

  try {
    payload = (await response.json()) as { error?: string } & Partial<T>;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || "The withdrawal request could not be completed.");
  }

  return payload as T;
};

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

export const reviewMobileMoneyWithdrawal = async ({
  adminNote = null,
  requestId,
  status,
}: {
  adminNote?: string | null;
  requestId: string;
  status: MobileMoneyWithdrawalDecision;
}): Promise<WithdrawalRequestPayload> =>
  postAuthenticatedJson<WithdrawalRequestPayload>("/api/mobile-money/review-withdrawal", {
    adminNote,
    requestId,
    status,
  });
