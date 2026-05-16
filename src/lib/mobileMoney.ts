import { supabase } from "@/integrations/supabase/client";
import { maskKenyanPhoneNumber, normalizeKenyanPhoneNumber } from "@/lib/mobileMoneyShared";

export interface MobileMoneyDepositPayload {
  amount_kes: number;
  amount_usd: number;
  checkout_request_id: string | null;
  customer_message: string | null;
  detail: string | null;
  masked_phone_number: string;
  provider_request_id: string | null;
  request_id: string;
  status: string;
}

export interface MobileMoneyWithdrawalPayload {
  approval_required?: boolean;
  amount_kes: number;
  amount_usd: number;
  auto_approved?: boolean;
  forfeited_bonus_amount?: number;
  detail: string | null;
  masked_phone_number: string;
  provider_checkout_id: string | null;
  provider_request_id: string | null;
  request_id: string;
  status: string;
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
    throw new Error(payload.error || "The mobile money request could not be completed.");
  }

  return payload as T;
};

export const requestMobileMoneyDeposit = async ({
  amount,
  bonusOfferId = null,
  phoneNumber,
}: {
  amount: number;
  bonusOfferId?: string | null;
  phoneNumber: string;
}) => {
  const normalizedPhoneNumber = normalizeKenyanPhoneNumber(phoneNumber);

  if (!normalizedPhoneNumber) {
    throw new Error("Enter a valid Kenyan M-PESA number in 07..., 7..., or 2547... format.");
  }

  const response = await postAuthenticatedJson<MobileMoneyDepositPayload>("/api/mobile-money/deposit", {
    amount,
    bonusOfferId,
    phoneNumber: normalizedPhoneNumber,
  });

  return {
    ...response,
    masked_phone_number: response.masked_phone_number || maskKenyanPhoneNumber(normalizedPhoneNumber),
  };
};

export const requestMobileMoneyWithdrawal = async ({
  amount,
  forfeitBonus = false,
  phoneNumber,
}: {
  amount: number;
  forfeitBonus?: boolean;
  phoneNumber: string;
}) => {
  const normalizedPhoneNumber = normalizeKenyanPhoneNumber(phoneNumber);

  if (!normalizedPhoneNumber) {
    throw new Error("Enter a valid Kenyan M-PESA number in 07..., 7..., or 2547... format.");
  }

  const response = await postAuthenticatedJson<MobileMoneyWithdrawalPayload>("/api/mobile-money/withdraw", {
    amount,
    forfeitBonus,
    phoneNumber: normalizedPhoneNumber,
  });

  return {
    ...response,
    masked_phone_number: response.masked_phone_number || maskKenyanPhoneNumber(normalizedPhoneNumber),
  };
};
