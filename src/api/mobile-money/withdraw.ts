import type { IncomingMessage, ServerResponse } from "node:http";
import { getHeaderValue } from "../../src/lib/cryptoWebhook.js";
import {
  convertUsdToKesAmount,
  maskKenyanPhoneNumber,
  MPESA_CHANNEL_CODE,
  normalizeKenyanPhoneNumber,
} from "../../src/lib/mobileMoneyShared.js";
import { readJsonRequestBody } from "../_lib/sasapay.js";
import { getSupabaseUserClient } from "../_lib/supabaseAdmin.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

type RequestPayload = {
  amount?: number;
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
    const amountKes = convertUsdToKesAmount(amountUsd);
    const userClient = getSupabaseUserClient(accessToken);
    const authResponse = await userClient.auth.getUser();

    if (authResponse.error || !authResponse.data.user?.id) {
      sendJson(response, 401, { error: "Invalid authentication token." });
      return;
    }

    const requestResponse = await userClient.rpc("request_mobile_money_withdrawal", {
      p_amount: amountUsd,
      p_amount_kes: amountKes,
      p_phone_number: normalizedPhoneNumber,
      p_provider_channel: MPESA_CHANNEL_CODE,
      p_request_ip: getClientIp(request.headers),
      p_request_user_agent: asString(getHeaderValue(request.headers, "user-agent")),
    });

    if (requestResponse.error) {
      throw requestResponse.error;
    }

    const requestPayload = (requestResponse.data ?? {}) as {
      amount?: number | null;
      amount_kes?: number | null;
      approval_required?: boolean;
      auto_approved?: boolean;
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

    sendJson(response, 200, {
      amount_kes: amountKes,
      amount_usd: amountUsd,
      approval_required: approvalRequired,
      auto_approved: Boolean(requestPayload.auto_approved),
      detail,
      masked_phone_number: maskKenyanPhoneNumber(normalizedPhoneNumber),
      request_id: requestId,
      status: nextStatus,
    });
  } catch (error) {
    console.error("Mobile money withdrawal request creation failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to submit mobile money withdrawal request.",
    });
  }
}
