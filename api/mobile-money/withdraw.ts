import type { IncomingMessage, ServerResponse } from "node:http";
import { getHeaderValue } from "../../src/lib/cryptoWebhook.js";
import {
  convertUsdToKesWithdrawalAmount,
  maskKenyanPhoneNumber,
  MPESA_CHANNEL_CODE,
  MPESA_METHOD_LABEL,
  normalizeKenyanPhoneNumber,
} from "../../src/lib/mobileMoneyShared.js";
import { readJsonRequestBody } from "../_lib/sasapay.js";
import { query, queryOne, userRpc } from "../_lib/db.js";
import { authenticateRequest, clerkUserIdToUuid } from "../_lib/clerkWebhook.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

type RequestPayload = {
  amount?: number;
  forfeitBonus?: boolean;
  phoneNumber?: string;
};

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
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

const asString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getClientIp = (headers: ApiRequest["headers"]) => {
  const forwardedFor = getHeaderValue(headers, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return asString(getHeaderValue(headers, "x-real-ip"));
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const maybeMessage = "message" in error && typeof error.message === "string" ? error.message : null;
    const maybeDetails = "details" in error && typeof error.details === "string" ? error.details : null;
    const maybeHint = "hint" in error && typeof error.hint === "string" ? error.hint : null;
    return [maybeMessage, maybeDetails, maybeHint].filter(Boolean).join(" ");
  }
  return typeof error === "string" ? error : "";
};

const shouldFallbackToManualWithdrawal = (message: string) => {
  const normalized = message.toLowerCase();
  return [
    "request_mobile_money_withdrawal",
    "schema cache",
    "does not exist",
    "withdrawal_requests_merchant_ref",
    "provider_",
    "approval_required",
    "auto_approved",
    "queued_at",
    "merchant_ref",
  ].some((pattern) => normalized.includes(pattern));
};

const isBonusTurnoverError = (message: string) =>
  message.toLowerCase().includes("bonus turnover requirement not met");

const formatUsd = (value: number) =>
  Number.isFinite(value) ? value.toFixed(2) : "0.00";

const clearActiveBonusRows = async ({ userId }: { userId: string }) => {
  await query(
    "update deposit_requests set deposit_bonus = $1, promo_bonus = $2, updated_at = $3, welcome_bonus = $4 where user_id = $5 and status = $6",
    [0, 0, new Date().toISOString(), 0, userId, "approved"],
  );
};

const createTenXMobileMoneyWithdrawal = async ({
  amountKes,
  amountUsd,
  forfeitBonus,
  phoneNumber,
  requestHeaders,
  userId,
}: {
  amountKes: number;
  amountUsd: number;
  forfeitBonus: boolean;
  phoneNumber: string;
  requestHeaders: ApiRequest["headers"];
  userId: string;
}) => {
  const nowIso = new Date().toISOString();

  const profile = await queryOne(
    "select id, balance, kyc_status, reserved_withdrawal_balance from profiles where id = $1",
    [userId],
  );

  if (!profile) {
    throw new Error("Profile not found");
  }

  const balance = Number(profile.balance ?? 0);
  const reservedBalance = Number(profile.reserved_withdrawal_balance ?? 0);
  const availableBalance = Math.max(0, balance - reservedBalance);

  const pending = await queryOne(
    "select id from withdrawal_requests where user_id = $1 and status = $2 limit 1",
    [userId, "pending"],
  );

  if (pending?.id) {
    throw new Error("You already have a pending withdrawal request");
  }

  const settings = await queryOne(
    "select require_kyc_withdrawal, mpesa_withdrawal_approval_threshold_kes from platform_settings order by updated_at desc limit 1",
  );

  const requireKyc = Boolean(settings?.require_kyc_withdrawal ?? true);
  if (requireKyc && !["verified", "approved"].includes(String(profile.kyc_status ?? "").toLowerCase())) {
    throw new Error("Account verification is required before withdrawal");
  }

  const deposits = await query(
    "select welcome_bonus, deposit_bonus, promo_bonus from deposit_requests where user_id = $1 and status = $2",
    [userId, "approved"],
  );

  const bonusTotal = deposits.reduce((sum, deposit) => {
    return (
      sum +
      Number(deposit.welcome_bonus ?? 0) +
      Number(deposit.deposit_bonus ?? 0) +
      Number(deposit.promo_bonus ?? 0)
    );
  }, 0);

  let completedTurnover = 0;
  let forfeitedBonusAmount = 0;
  const requiredTurnover = Math.round(bonusTotal * 10 * 100) / 100;

  if (bonusTotal > 0) {
    const trades = await query(
      "select amount from trades where user_id = $1 and status = any($2) and tournament_participant_id is null",
      [userId, ["won", "lost", "expired"]],
    );

    completedTurnover = trades.reduce((sum, trade) => sum + Number(trade.amount ?? 0), 0);

    if (completedTurnover < requiredTurnover) {
      if (!forfeitBonus) {
        throw new Error(
          `Bonus turnover requirement not met. Required volume: $${formatUsd(requiredTurnover)}, completed: $${formatUsd(completedTurnover)}.`,
        );
      }

      const availableAfterBonusRemoval = Math.max(0, availableBalance - bonusTotal);
      if (amountUsd > availableAfterBonusRemoval) {
        throw new Error(
          `Insufficient available balance. Your withdrawable balance after removing the active bonus is $${formatUsd(availableAfterBonusRemoval)}.`,
        );
      }

      forfeitedBonusAmount = bonusTotal;
    }
  }

  if (amountUsd > Math.max(0, availableBalance - forfeitedBonusAmount)) {
    throw new Error("Insufficient available balance");
  }

  const approvalThresholdKes = Number(settings?.mpesa_withdrawal_approval_threshold_kes ?? 10000);
  const autoApproved = amountKes <= approvalThresholdKes;
  const merchantRef = `WITHDRAW_${userId.replace(/-/g, "")}_${Date.now()}`;
  const requestIp = getClientIp(requestHeaders);
  const requestUserAgent = asString(getHeaderValue(requestHeaders, "user-agent"));

  const queueInsertPayload = {
    amount: amountUsd,
    approval_required: !autoApproved,
    approval_threshold_kes: approvalThresholdKes,
    approved_at: autoApproved ? nowIso : null,
    auto_approved: autoApproved,
    audit_log: [
      {
        action: "requested",
        actor_id: userId,
        amount: amountUsd,
        amount_kes: amountKes,
        created_at: nowIso,
        forfeited_bonus_amount: forfeitedBonusAmount,
        status: autoApproved ? "approved" : "pending",
        turnover_multiplier: 10,
      },
    ],
    destination: phoneNumber,
    merchant_ref: merchantRef,
    method: MPESA_METHOD_LABEL,
    next_retry_at: nowIso,
    provider_amount: amountKes,
    provider_channel: MPESA_CHANNEL_CODE,
    provider_currency: "KES",
    provider_name: "sasapay",
    provider_phone_number: phoneNumber,
    provider_status: autoApproved ? "queued" : "awaiting_approval",
    queued_at: autoApproved ? nowIso : null,
    request_ip: requestIp,
    request_user_agent: requestUserAgent,
    status: autoApproved ? "approved" : "pending",
    user_id: userId,
  };

  let insertedRequestId: string | null = null;
  let insertedStatus = autoApproved ? "approved" : "pending";
  let insertedApprovalRequired = !autoApproved;
  let insertedAutoApproved = autoApproved;
  let usesReservation = true;

  let queueInsertRow: unknown = null;
  try {
    const rows = await query(
      `insert into withdrawal_requests (
         amount, approval_required, approval_threshold_kes, approved_at, auto_approved, audit_log,
         destination, merchant_ref, method, next_retry_at, provider_amount, provider_channel,
         provider_currency, provider_name, provider_phone_number, provider_status, queued_at,
         request_ip, request_user_agent, status, user_id
       ) values (
         $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
         $18, $19, $20, $21
       ) returning id, status, approval_required, auto_approved`,
      [
        amountUsd,
        !autoApproved,
        autoApproved ? nowIso : null,
        autoApproved,
        queueInsertPayload.audit_log,
        phoneNumber,
        merchantRef,
        MPESA_METHOD_LABEL,
        nowIso,
        amountKes,
        MPESA_CHANNEL_CODE,
        "KES",
        "sasapay",
        phoneNumber,
        autoApproved ? "queued" : "awaiting_approval",
        autoApproved ? nowIso : null,
        requestIp,
        requestUserAgent,
        autoApproved ? "approved" : "pending",
        userId,
      ],
    );
    queueInsertRow = rows[0] ?? null;
  } catch (rawInsertError) {
    const insertErrorMessage = getErrorMessage(rawInsertError);
    if (!shouldFallbackToManualWithdrawal(insertErrorMessage)) {
      throw rawInsertError;
    }
    usesReservation = false;
  }

  if (!queueInsertRow) {
    const manualRows = await query(
      `insert into withdrawal_requests (amount, destination, method, status, user_id)
       values ($1, $2, $3, $4, $5) returning id, status`,
      [amountUsd, phoneNumber, MPESA_METHOD_LABEL, "pending", userId],
    );
    const manual = manualRows[0] as Record<string, unknown> | undefined;
    insertedRequestId = asString(manual?.id);
    insertedStatus = asString(manual?.status) || "pending";
    insertedApprovalRequired = true;
    insertedAutoApproved = false;
  } else {
    const queueRow = queueInsertRow as Record<string, unknown>;
    insertedRequestId = asString(queueRow.id);
    insertedStatus = asString(queueRow.status) || insertedStatus;
    insertedApprovalRequired = Boolean(queueRow.approval_required ?? insertedApprovalRequired);
    insertedAutoApproved = Boolean(queueRow.auto_approved ?? insertedAutoApproved);
  }

  if (!insertedRequestId) {
    throw new Error("Withdrawal request could not be created.");
  }

  const profileUpdatePayload = usesReservation
    ? {
        balance: balance - forfeitedBonusAmount,
        reserved_withdrawal_balance: reservedBalance + amountUsd,
        updated_at: nowIso,
      }
    : {
        balance: balance - amountUsd - forfeitedBonusAmount,
        updated_at: nowIso,
      };

  try {
    await query(
      `update profiles set ${Object.keys(profileUpdatePayload)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ")} where id = $${Object.keys(profileUpdatePayload).length + 1}`,
      [...Object.values(profileUpdatePayload), userId],
    );
  } catch (updateError) {
    await query("delete from withdrawal_requests where id = $1", [insertedRequestId]);
    throw updateError;
  }

  try {
    if (forfeitedBonusAmount > 0) {
      await clearActiveBonusRows({ userId });
    }
  } catch (error) {
    const rollbackPayload = usesReservation
      ? {
          balance,
          reserved_withdrawal_balance: reservedBalance,
          updated_at: nowIso,
        }
      : {
          balance,
          updated_at: nowIso,
        };

    await query(
      `update profiles set ${Object.keys(rollbackPayload)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ")} where id = $${Object.keys(rollbackPayload).length + 1}`,
      [...Object.values(rollbackPayload), userId],
    );
    await query("delete from withdrawal_requests where id = $1", [insertedRequestId]);
    throw error;
  }

  return {
    amount: amountUsd,
    amount_kes: amountKes,
    approval_required: insertedApprovalRequired,
    auto_approved: insertedAutoApproved,
    bonus_turnover: {
      bonusTotal,
      completedTurnover,
      isComplete: bonusTotal <= 0 || completedTurnover >= requiredTurnover,
      remainingTurnover: Math.max(0, requiredTurnover - completedTurnover),
      requiredTurnover,
    },
    forfeited_bonus_amount: forfeitedBonusAmount,
    request_id: insertedRequestId,
    status: insertedStatus,
  };
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = (await readJsonRequestBody(request)) as RequestPayload;
    const amount = asNumber(body.amount ?? 0);
    const normalizedPhoneNumber = normalizeKenyanPhoneNumber(asString(body.phoneNumber ?? null));

    const clerkUserId = await authenticateRequest(request.headers);
    if (!clerkUserId) {
      sendJson(response, 401, { error: "Missing or invalid Bearer token." });
      return;
    }

    if (!Number.isFinite(amount) || Number(amount) <= 0) {
      sendJson(response, 400, { error: "amount must be a positive number." });
      return;
    }

    if (!normalizedPhoneNumber) {
      sendJson(response, 400, { error: "phoneNumber is required." });
      return;
    }

    const amountUsd = Number(amount);
    const amountKes = convertUsdToKesWithdrawalAmount(amountUsd);
    const userId = clerkUserIdToUuid(clerkUserId);

    const shouldForfeitBonus = body.forfeitBonus === true;
    let requestData: Record<string, unknown> | null = null;

    if (shouldForfeitBonus) {
      requestData = await createTenXMobileMoneyWithdrawal({
        amountKes,
        amountUsd,
        forfeitBonus: true,
        phoneNumber: normalizedPhoneNumber,
        requestHeaders: request.headers,
        userId,
      });
    } else {
      try {
        const rows = await userRpc("request_mobile_money_withdrawal", clerkUserId, {
          p_amount: amountUsd,
          p_amount_kes: amountKes,
          p_phone_number: normalizedPhoneNumber,
          p_provider_channel: MPESA_CHANNEL_CODE,
          p_request_ip: getClientIp(request.headers),
          p_request_user_agent: asString(getHeaderValue(request.headers, "user-agent")),
        });
        requestData = rows[0] ?? null;
      } catch (rpcError) {
        const mobileMoneyErrorMessage = getErrorMessage(rpcError);

        if (isBonusTurnoverError(mobileMoneyErrorMessage)) {
          requestData = await createTenXMobileMoneyWithdrawal({
            amountKes,
            amountUsd,
            forfeitBonus: false,
            phoneNumber: normalizedPhoneNumber,
            requestHeaders: request.headers,
            userId,
          });
        } else if (shouldFallbackToManualWithdrawal(mobileMoneyErrorMessage)) {
          console.warn("Mobile money withdrawal queue unavailable; falling back to manual withdrawal request", rpcError);
          try {
            const rows = await userRpc("request_withdrawal", clerkUserId, {
              p_amount: amountUsd,
              p_destination: normalizedPhoneNumber,
              p_method: MPESA_METHOD_LABEL,
            });
            requestData = rows[0] ?? null;
          } catch (manualError) {
            const manualWithdrawalErrorMessage = getErrorMessage(manualError);
            if (isBonusTurnoverError(manualWithdrawalErrorMessage)) {
              requestData = await createTenXMobileMoneyWithdrawal({
                amountKes,
                amountUsd,
                forfeitBonus: false,
                phoneNumber: normalizedPhoneNumber,
                requestHeaders: request.headers,
                userId,
              });
            } else {
              throw manualError;
            }
          }
        } else {
          throw rpcError;
        }
      }
    }

    const requestPayload = (requestData ?? {}) as {
      amount?: number | null;
      amount_kes?: number | null;
      approval_required?: boolean;
      auto_approved?: boolean;
      bonus_turnover?: unknown;
      forfeited_bonus_amount?: number | null;
      request_id?: string | null;
      status?: string | null;
    };

    const requestId = asString(requestPayload.request_id);
    const requestStatus = asString(requestPayload.status) || "pending";
    const approvalRequired = Boolean(requestPayload.approval_required);
    const nextStatus = requestStatus;
    let detail =
      requestStatus === "pending"
        ? "Withdrawal request received. It is waiting for finance approval before the payout is sent manually."
        : "Withdrawal request received. Finance can now send it manually from the merchant dashboard.";
    const forfeitedBonusAmount = Number(requestPayload.forfeited_bonus_amount ?? 0);

    if (forfeitedBonusAmount > 0) {
      detail = `Active bonus of $${formatUsd(forfeitedBonusAmount)} was removed so this withdrawal can continue without bonus restrictions. ${detail}`;
    }

    sendJson(response, 200, {
      amount_kes: amountKes,
      amount_usd: amountUsd,
      approval_required: approvalRequired,
      auto_approved: Boolean(requestPayload.auto_approved),
      bonus_turnover: requestPayload.bonus_turnover ?? null,
      detail,
      forfeited_bonus_amount: forfeitedBonusAmount,
      masked_phone_number: maskKenyanPhoneNumber(normalizedPhoneNumber),
      request_id: requestId,
      status: nextStatus,
    });
  } catch (error) {
    console.error("Mobile money withdrawal request creation failed", error);
    const errorMessage = getErrorMessage(error);
    sendJson(response, 500, {
      error: errorMessage || "Failed to submit mobile money withdrawal request.",
    });
  }
}
