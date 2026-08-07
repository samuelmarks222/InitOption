import type { Json } from "../../src/integrations/supabase/types.js";
import { MPESA_CHANNEL_CODE } from "../../src/lib/mobileMoneyShared.js";
import { buildSasaPayCallbackUrl, getFriendlySasaPayWithdrawalMessage, requestSasaPayB2CPayout } from "./sasapay.js";
import { query, rpc } from "./db.js";

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

  await query(
    `update withdrawal_requests
        set provider_amount = $1, provider_channel = $2, provider_checkout_id = $3, provider_currency = $4,
            provider_payload = $5, provider_phone_number = $6, provider_request_id = $7,
            provider_result_code = $8, provider_result_desc = $9, provider_status = $10,
            provider_transaction_ref = $11, updated_at = $12
      where id = $13 and status = $14`,
    [
      amountKes,
      MPESA_CHANNEL_CODE,
      checkoutRequestId,
      "KES",
      payload as Json,
      phoneNumber,
      providerRequestId,
      providerResultCode,
      providerResultDesc,
      "submitted",
      transactionRef,
      new Date().toISOString(),
      requestId,
      "processing",
    ],
  );
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
  const friendlyMessage = getFriendlySasaPayWithdrawalMessage(errorMessage);
  const retryable = isRetryableWithdrawalError(errorMessage) && processingAttempts < MAX_PROCESSING_ATTEMPTS;

  await rpc("update_mobile_money_withdrawal_dispatch_state", {
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

  return retryable;
};

const recoverStaleProcessingWithdrawals = async () => {
  const staleBeforeIso = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60_000).toISOString();
  const rows = await query(
    "select id from withdrawal_requests where provider_name = $1 and status = $2 and processing_started_at <= $3",
    ["sasapay", "processing", staleBeforeIso],
  );

  for (const row of rows) {
    const requestId = asString(row.id);
    if (!requestId) continue;

    try {
      await rpc("update_mobile_money_withdrawal_dispatch_state", {
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
  const maxItems = Math.max(1, Math.min(limit, 10));
  const results: QueueProcessResult = {
    failed: 0,
    processed: 0,
    queued: 0,
  };

  await recoverStaleProcessingWithdrawals();

  for (let index = 0; index < maxItems; index += 1) {
    const claimRows = await rpc("claim_mobile_money_withdrawal", {
      p_request_id: requestId,
    });

    const claimPayload = (claimRows?.[0] ?? {}) as WithdrawalClaimPayload;
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
