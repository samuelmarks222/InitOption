

import { api } from "@/integrations/api/client";
import { getAppwriteIdToken } from "@/integrations/appwrite/authService";

export type WithdrawalDecision = "approved" | "rejected";
export type MobileMoneyWithdrawalDecision = "approved" | "rejected" | "completed" | "failed";

export interface WithdrawalRequestPayload {
  amount?: number;
  destination?: string;
  forfeited_bonus_amount?: number;
  method?: string;
  request_id?: string;
  status?: string;
}

export interface CryptoWithdrawalRequestPayload extends WithdrawalRequestPayload {
  cryptoCurrency?: string;
  cryptoNetwork?: string;
  cryptoMemo?: string;
}

interface RequestWithdrawalArgs {
  amount: number;
  destination: string;
  forfeitBonus?: boolean;
  method: string;
}

interface RequestCryptoWithdrawalArgs {
  amount: number;
  destination: string;
  cryptoCurrency: string;
  cryptoNetwork: string;
  cryptoMemo?: string;
  forfeitBonus?: boolean;
}

interface AdminUpdateWithdrawalStatusArgs {
  adminNote?: string | null;
  requestId: string;
  status: WithdrawalDecision;
}

const getAccessToken = () => getAppwriteIdToken();

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
  forfeitBonus = false,
  method,
}: RequestWithdrawalArgs): Promise<WithdrawalRequestPayload> => {
  return postAuthenticatedJson<WithdrawalRequestPayload>("/api/withdraw", {
    amount,
    destination,
    forfeitBonus,
    method,
  });
};

export const adminUpdateWithdrawalStatus = async ({
  adminNote = null,
  requestId,
  status,
}: AdminUpdateWithdrawalStatusArgs): Promise<WithdrawalRequestPayload> => {
  const response = await api.rpc("admin_update_withdrawal_status", {
    p_admin_note: adminNote,
    p_request_id: requestId,
    p_status: status,
  });

  if (response.error) {
    throw response.error;
  }

  return (response.data ?? {}) as WithdrawalRequestPayload;
};

export const cancelWithdrawal = async (requestId: string): Promise<WithdrawalRequestPayload> => {
  return postAuthenticatedJson<WithdrawalRequestPayload>("/api/withdraw", {
    action: "cancel",
    requestId,
  });
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

export const requestCryptoWithdrawal = async ({
  amount,
  destination,
  cryptoCurrency,
  cryptoNetwork,
  cryptoMemo,
  forfeitBonus = false,
}: RequestCryptoWithdrawalArgs): Promise<CryptoWithdrawalRequestPayload> => {
  return postAuthenticatedJson<CryptoWithdrawalRequestPayload>("/api/crypto/withdrawal", {
    amount,
    destination,
    cryptoCurrency,
    cryptoNetwork,
    cryptoMemo,
    forfeitBonus,
  });
};
