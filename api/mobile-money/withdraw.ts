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
import { getSupabaseAdminClient, getSupabaseUserClient } from "../_lib/supabaseAdmin.js";

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

const parseBearerToken = (authorizationHeader: string) => {
  const trimmed = authorizationHeader.trim();
  if (!trimmed) return null;

  const [scheme, token] = trimmed.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
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

const clearActiveBonusRows = async ({
  adminClient,
  userId,
}: {
  adminClient: ReturnType<typeof getSupabaseAdminClient>;
  userId: string;
}) => {
  const response = await adminClient
    .from("deposit_requests")
    .update({
      deposit_bonus: 0,
      promo_bonus: 0,
      updated_at: new Date().toISOString(),
      welcome_bonus: 0,
    })
    .eq("user_id", userId)
    .eq("status", "approved");

  if (response.error) {
    throw response.error;
  }
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
  const adminClient = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const profileResponse = await adminClient
    .from("profiles")
    .select("id,balance,kyc_status,reserved_withdrawal_balance")
    .eq("id", userId)
    .maybeSingle();

  if (profileResponse.error) {
    throw profileResponse.error;
  }

  const profile = profileResponse.data;
  if (!profile) {
    throw new Error("Profile not found");
  }

  const balance = Number(profile.balance ?? 0);
  const reservedBalance = Number(profile.reserved_withdrawal_balance ?? 0);
  const availableBalance = Math.max(0, balance - reservedBalance);

  const settingsResponse = await adminClient
    .from("platform_settings")
    .select("require_kyc_withdrawal,mpesa_withdrawal_approval_threshold_kes")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (settingsResponse.error) {
    throw settingsResponse.error;
  }

  const requireKyc = Boolean(settingsResponse.data?.require_kyc_withdrawal ?? true);
  if (requireKyc && !["verified", "approved"].includes(String(profile.kyc_status ?? "").toLowerCase())) {
    throw new Error("Account verification is required before withdrawal");
  }

  const depositsResponse = await adminClient
    .from("deposit_requests")
    .select("welcome_bonus,deposit_bonus,promo_bonus")
    .eq("user_id", userId)
    .eq("status", "approved");

  if (depositsResponse.error) {
    throw depositsResponse.error;
  }

  const bonusTotal = (depositsResponse.data ?? []).reduce((sum, deposit) => {
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
    const tradesResponse = await adminClient
      .from("trades")
      .select("amount")
      .eq("user_id", userId)
      .in("status", ["won", "lost", "expired"])
      .is("tournament_participant_id", null);

    if (tradesResponse.error) {
      throw tradesResponse.error;
    }

    completedTurnover = (tradesResponse.data ?? []).reduce((sum, trade) => sum + Number(trade.amount ?? 0), 0);

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

  const approvalThresholdKes = Number(settingsResponse.data?.mpesa_withdrawal_approval_threshold_kes ?? 10000);
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

  const queueInsertResponse = await adminClient
    .from("withdrawal_requests")
    .insert(queueInsertPayload)
    .select("id,status,approval_required,auto_approved")
    .maybeSingle();

  if (queueInsertResponse.error) {
    const insertErrorMessage = getErrorMessage(queueInsertResponse.error);

    if (!shouldFallbackToManualWithdrawal(insertErrorMessage)) {
      throw queueInsertResponse.error;
    }

    usesReservation = false;
    const manualInsertResponse = await adminClient
      .from("withdrawal_requests")
      .insert({
        amount: amountUsd,
        destination: phoneNumber,
        method: MPESA_METHOD_LABEL,
        status: "pending",
        user_id: userId,
      })
      .select("id,status")
      .maybeSingle();

    if (manualInsertResponse.error) {
      throw manualInsertResponse.error;
    }

    insertedRequestId = asString(manualInsertResponse.data?.id);
    insertedStatus = asString(manualInsertResponse.data?.status) || "pending";
    insertedApprovalRequired = true;
    insertedAutoApproved = false;
  } else {
    insertedRequestId = asString(queueInsertResponse.data?.id);
    insertedStatus = asString(queueInsertResponse.data?.status) || insertedStatus;
    insertedApprovalRequired = Boolean(queueInsertResponse.data?.approval_required ?? insertedApprovalRequired);
    insertedAutoApproved = Boolean(queueInsertResponse.data?.auto_approved ?? insertedAutoApproved);
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

  const profileUpdateResponse = await adminClient.from("profiles").update(profileUpdatePayload).eq("id", userId);

  if (profileUpdateResponse.error) {
    await adminClient.from("withdrawal_requests").delete().eq("id", insertedRequestId);
    throw profileUpdateResponse.error;
  }

  try {
    if (forfeitedBonusAmount > 0) {
      await clearActiveBonusRows({ adminClient, userId });
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

    await adminClient.from("profiles").update(rollbackPayload).eq("id", userId);
    await adminClient.from("withdrawal_requests").delete().eq("id", insertedRequestId);
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
    const authHeader = getHeaderValue(request.headers, "authorization");
    const accessToken = parseBearerToken(authHeader);

    if (!accessToken) {
      sendJson(response, 401, { error: "Missing Bearer token." });
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
    const userClient = getSupabaseUserClient(accessToken);
    const authResponse = await userClient.auth.getUser();

    if (authResponse.error || !authResponse.data.user?.id) {
      sendJson(response, 401, { error: "Invalid authentication token." });
      return;
    }

    const shouldForfeitBonus = body.forfeitBonus === true;
    let requestResponse = shouldForfeitBonus
      ? {
          data: await createTenXMobileMoneyWithdrawal({
            amountKes,
            amountUsd,
            forfeitBonus: true,
            phoneNumber: normalizedPhoneNumber,
            requestHeaders: request.headers,
            userId: authResponse.data.user.id,
          }),
          error: null,
        }
      : await userClient.rpc("request_mobile_money_withdrawal", {
          p_amount: amountUsd,
          p_amount_kes: amountKes,
          p_phone_number: normalizedPhoneNumber,
          p_provider_channel: MPESA_CHANNEL_CODE,
          p_request_ip: getClientIp(request.headers),
          p_request_user_agent: asString(getHeaderValue(request.headers, "user-agent")),
        });

    if (requestResponse.error) {
      const mobileMoneyErrorMessage = getErrorMessage(requestResponse.error);

      if (isBonusTurnoverError(mobileMoneyErrorMessage)) {
        requestResponse = {
          data: await createTenXMobileMoneyWithdrawal({
            amountKes,
            amountUsd,
            forfeitBonus: false,
            phoneNumber: normalizedPhoneNumber,
            requestHeaders: request.headers,
            userId: authResponse.data.user.id,
          }),
          error: null,
        };
      } else if (!shouldFallbackToManualWithdrawal(mobileMoneyErrorMessage)) {
        throw requestResponse.error;
      } else {
        console.warn("Mobile money withdrawal queue unavailable; falling back to manual withdrawal request", requestResponse.error);

        requestResponse = await userClient.rpc("request_withdrawal", {
          p_amount: amountUsd,
          p_destination: normalizedPhoneNumber,
          p_method: MPESA_METHOD_LABEL,
        });

        if (requestResponse.error) {
          const manualWithdrawalErrorMessage = getErrorMessage(requestResponse.error);

          if (isBonusTurnoverError(manualWithdrawalErrorMessage)) {
            requestResponse = {
              data: await createTenXMobileMoneyWithdrawal({
                amountKes,
                amountUsd,
                forfeitBonus: false,
                phoneNumber: normalizedPhoneNumber,
                requestHeaders: request.headers,
                userId: authResponse.data.user.id,
              }),
              error: null,
            };
          } else {
            throw requestResponse.error;
          }
        }
      }
    }

    const requestPayload = (requestResponse.data ?? {}) as {
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
