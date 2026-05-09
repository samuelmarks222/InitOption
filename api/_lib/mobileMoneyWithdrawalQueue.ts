import type { Json } from "../../src/integrations/supabase/types.js";
import { MPESA_CHANNEL_CODE } from "../../src/lib/mobileMoneyShared.js";
import { buildSasaPayCallbackUrl, getFriendlySasaPayWithdrawalMessage, requestSasaPayB2CPayout } from "./sasapay.js";
import { getSupabaseAdminClient } from "./supabaseAdmin.js";

type WithdrawalClaimPayload = {
  amount?: number | null;
  amount_kes?: number | null;
  merchant_ref?: string | null;
  phone_number?: string | null;
  processing_attempts?: number | null;
  request_id?: string | null;
  status?: string | null;
  user_id?: string | null;
};

type QueueProcessResult = {
  failed: number;
  processed: number;
  queued: number;
};

const MAX_PROCESSING_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MINUTES = 2;
const STALE_PROCESSING_MINUTES = 15;

const asString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const getRetryDelayMinutes = (attemptNumber: number) =>
  Math.max(BASE_RETRY_DELAY_MINUTES * Math.pow(2, Math.max(0, attemptNumber - 1)), BASE_RETRY_DELAY_MINUTES);

const getNextRetryIso = (attemptNumber: number) =>
  new Date(Date.now() + getRetryDelayMinutes(attemptNumber) * 60_000).toISOString();

const isRetryableWithdrawalError = (message: string) => {
  const normalized = message.toLowerCase();

  return [
    "timeout",
    "timed out",
    "network error",
    "fetch failed",
    "socket hang up",
    "econnreset",
    "enotfound",
    "eai_again",
    "503",
    "502",
    "504",
    "temporarily unavailable",
  ].some((pattern) => normalized.includes(pattern));
};

const persistAcceptedDispatch = async ({
  amountKes,
  payload,
  phoneNumber,
  requestId,
}: {
  amountKes: number;
  payload: Record<string, unknown>;
  phoneNumber: string;
  requestId: string;
}) => {
  const adminClient = getSupabaseAdminClient();
  const providerRequestId =
    asString(payload.B2CRequestID) ||
    asString(payload.MerchantRequestID) ||
    null;
  const checkoutRequestId =
    asString(payload.ConversationID) ||
    asString(payload.CheckoutRequestID) ||
    providerRequestId;
  const providerResultCode =
    asString(payload.ResponseCode) ||
    "0";
  const providerResultDesc =
    asString(payload.ResponseDescription) ||
    asString(payload.detail) ||
    "Accepted for processing";
  const transactionRef =
    asString(payload.ConversationID) ||
    asString(payload.TransactionReference) ||
    providerRequestId;

  const updateResponse = await adminClient
    .from("withdrawal_requests")
    .update({
      provider_amount: amountKes,
      provider_channel: MPESA_CHANNEL_CODE,
      provider_checkout_id: checkoutRequestId,
      provider_currency: "KES",
      provider_payload: payload as Json,
      provider_phone_number: phoneNumber,
      provider_request_id: providerRequestId,
      provider_result_code: providerResultCode,
      provider_result_desc: providerResultDesc,
      provider_status: "submitted",
      provider_transaction_ref: transactionRef,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "processing");

  if (updateResponse.error) {
    console.error("Failed to persist accepted M-PESA withdrawal dispatch", updateResponse.error);
  }
};

const markRetryOrFailure = async ({
  errorMessage,
  payload,
  processingAttempts,
  requestId,
}: {
  errorMessage: string;
  payload: Record<string, unknown>;
  processingAttempts: number;
  requestId: string;
}) => {
  const adminClient = getSupabaseAdminClient();
  const friendlyMessage = getFriendlySasaPayWithdrawalMessage(errorMessage);
  const retryable = isRetryableWithdrawalError(errorMessage) && processingAttempts < MAX_PROCESSING_ATTEMPTS;

  const rpcResponse = await adminClient.rpc("update_mobile_money_withdrawal_dispatch_state", {
    p_failure_reason: friendlyMessage,
    p_next_retry_at: retryable ? getNextRetryIso(processingAttempts) : null,
    p_next_status: retryable ? "approved" : "failed",
    p_provider_payload: {
      ...payload,
      user_message: friendlyMessage,
    },
    p_provider_result_code: retryable ? "RETRY_SCHEDULED" : "DISPATCH_FAILED",
    p_provider_result_desc: friendlyMessage,
    p_request_id: requestId,
  });

  if (rpcResponse.error) {
    throw rpcResponse.error;
  }

  return retryable;
};

const recoverStaleProcessingWithdrawals = async () => {
  const adminClient = getSupabaseAdminClient();
  const staleBeforeIso = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60_000).toISOString();
  const { data, error } = await adminClient
    .from("withdrawal_requests")
    .select("id")
    .eq("provider_name", "sasapay")
    .eq("status", "processing")
    .lte("processing_started_at", staleBeforeIso);

  if (error) {
    console.error("Failed to scan for stale M-PESA withdrawals", error);
    return;
  }

  for (const row of data ?? []) {
    const requestId = asString(row.id);
    if (!requestId) continue;

    try {
      await adminClient.rpc("update_mobile_money_withdrawal_dispatch_state", {
        p_failure_reason: "Previous payout attempt timed out before a callback was received.",
        p_next_retry_at: new Date().toISOString(),
        p_next_status: "approved",
        p_provider_payload: {
          recovery: "stale_processing_timeout",
        },
        p_provider_result_code: "RETRY_SCHEDULED",
        p_provider_result_desc: "Previous payout attempt timed out before a callback was received.",
        p_request_id: requestId,
      });
    } catch (recoveryError) {
      console.error("Failed to recover stale M-PESA withdrawal", recoveryError);
    }
  }
};

export const processApprovedMobileMoneyWithdrawals = async ({
  limit = 1,
  requestId = null,
}: {
  limit?: number;
  requestId?: string | null;
} = {}): Promise<QueueProcessResult> => {
  const adminClient = getSupabaseAdminClient();
  const maxItems = Math.max(1, Math.min(limit, 10));
  const results: QueueProcessResult = {
    failed: 0,
    processed: 0,
    queued: 0,
  };

  await recoverStaleProcessingWithdrawals();

  for (let index = 0; index < maxItems; index += 1) {
    const claimResponse = await adminClient.rpc("claim_mobile_money_withdrawal", {
      p_request_id: requestId,
    });

    if (claimResponse.error) {
      throw claimResponse.error;
    }

    const claimPayload = (claimResponse.data ?? {}) as WithdrawalClaimPayload;
    const claimedRequestId = asString(claimPayload.request_id);

    if (!claimedRequestId) {
      break;
    }

    const amountKes = asNumber(claimPayload.amount_kes) ?? 0;
    const merchantRef = asString(claimPayload.merchant_ref);
    const phoneNumber = asString(claimPayload.phone_number);
    const processingAttempts = Math.max(1, asNumber(claimPayload.processing_attempts) ?? 1);

    if (!amountKes || !merchantRef || !phoneNumber) {
      await markRetryOrFailure({
        errorMessage: "Withdrawal request is missing payout details.",
        payload: {
          amount_kes: amountKes || null,
          merchant_ref: merchantRef,
          phone_number: phoneNumber,
        },
        processingAttempts: MAX_PROCESSING_ATTEMPTS,
        requestId: claimedRequestId,
      });
      results.failed += 1;
      if (requestId) {
        break;
      }
      continue;
    }

    try {
      const payoutPayload = (await requestSasaPayB2CPayout({
        amountKes,
        callbackUrl: buildSasaPayCallbackUrl("/api/mobile-money/withdraw-callback"),
        phoneNumber,
        reason: "Trading withdrawal",
        requestReference: merchantRef,
      })) as Record<string, unknown>;

      await persistAcceptedDispatch({
        amountKes,
        payload: payoutPayload,
        phoneNumber,
        requestId: claimedRequestId,
      });

      results.processed += 1;
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Failed to dispatch M-PESA withdrawal";
      const retryScheduled = await markRetryOrFailure({
        errorMessage: rawMessage,
        payload: {
          error: rawMessage,
        },
        processingAttempts,
        requestId: claimedRequestId,
      });

      if (retryScheduled) {
        results.queued += 1;
      } else {
        results.failed += 1;
      }
    }

    if (requestId) {
      break;
    }
  }

  return results;
};
