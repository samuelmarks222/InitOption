import type { Json } from "../../src/integrations/supabase/types.js";
import { MPESA_CHANNEL_CODE } from "../../src/lib/mobileMoneyShared.js";

type JsonObject = { [key: string]: Json | undefined };

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const getSasaPayBaseUrl = () => {
  const explicitBaseUrl = process.env.SASAPAY_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }

  const environment = (process.env.SASAPAY_ENVIRONMENT?.trim() || "sandbox").toLowerCase();
  return `https://${environment}.sasapay.app`;
};

const asNumber = (value: Json | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const asString = (value: Json | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const pickString = (...values: Array<Json | undefined>) => {
  for (const value of values) {
    const parsed = asString(value);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const parseJsonResponse = async (response: Response) => {
  try {
    return (await response.json()) as JsonObject;
  } catch {
    return null;
  }
};

export const getSasaPayMerchantCode = () => getRequiredEnv("SASAPAY_MERCHANT_CODE");

export const getSasaPayCallbackBaseUrl = () =>
  process.env.SASAPAY_CALLBACK_BASE_URL?.trim() || process.env.APP_BASE_URL?.trim() || null;

export const buildSasaPayCallbackUrl = (path: string) => {
  const baseUrl = getSasaPayCallbackBaseUrl();

  if (!baseUrl) {
    throw new Error("Set SASAPAY_CALLBACK_BASE_URL or APP_BASE_URL before using SasaPay callbacks.");
  }

  const url = new URL(path, baseUrl);
  const callbackToken = process.env.SASAPAY_CALLBACK_TOKEN?.trim();
  if (callbackToken) {
    url.searchParams.set("token", callbackToken);
  }
  return url.toString();
};

export const verifySasaPayCallbackToken = (urlString: string) => {
  const expectedToken = process.env.SASAPAY_CALLBACK_TOKEN?.trim();
  if (!expectedToken) {
    return true;
  }

  const callbackUrl = new URL(urlString, "https://placeholder.local");
  return callbackUrl.searchParams.get("token") === expectedToken;
};

export const getSasaPayAccessToken = async () => {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt) {
    return cachedAccessToken;
  }

  const credentials = Buffer.from(
    `${getRequiredEnv("SASAPAY_CLIENT_ID")}:${getRequiredEnv("SASAPAY_CLIENT_SECRET")}`,
  ).toString("base64");

  const tokenEndpoints = [
    {
      url: `${getSasaPayBaseUrl()}/api/v1/auth/token/?grant_type=client_credentials`,
      init: {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      } satisfies RequestInit,
    },
    {
      url: `${getSasaPayBaseUrl()}/api/v1/auth/token/`,
      init: {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      } satisfies RequestInit,
    },
  ];

  let lastError = "Unknown authentication error";
  let accessToken: string | null = null;
  let expiresIn = 300;

  for (const attempt of tokenEndpoints) {
    const response = await fetch(attempt.url, attempt.init);
    const payload = await parseJsonResponse(response);

    accessToken = pickString(payload?.access_token, payload?.accessToken);
    expiresIn = Math.max(asNumber(payload?.expires_in) ?? asNumber(payload?.expiresIn) ?? 0, 300);

    if (response.ok && accessToken) {
      break;
    }

    lastError =
      pickString(payload?.detail, payload?.error, payload?.message) || `HTTP ${response.status}`;
    accessToken = null;
  }

  if (!accessToken) {
    throw new Error(`SasaPay authentication failed: ${lastError}`);
  }

  cachedAccessToken = accessToken;
  cachedAccessTokenExpiresAt = Date.now() + Math.max(expiresIn - 60, 60) * 1000;
  return accessToken;
};

const sendSasaPayRequest = async (path: string, payload: Record<string, unknown>) => {
  const token = await getSasaPayAccessToken();
  const response = await fetch(`${getSasaPayBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);
  const detail = pickString(
    data?.detail,
    data?.ResponseDescription,
    data?.responseDescription,
    data?.CustomerMessage,
    data?.customerMessage,
    data?.error,
    data?.message,
  );
  const status = typeof data?.status === "boolean" ? data.status : null;
  const responseCode = pickString(data?.ResponseCode, data?.responseCode);

  if (!response.ok || status === false || (responseCode && responseCode !== "0")) {
    throw new Error(detail || `SasaPay returned HTTP ${response.status}`);
  }

  return data ?? {};
};

export const requestSasaPayStkPush = async ({
  accountReference,
  amountKes,
  callbackUrl,
  phoneNumber,
  transactionDescription,
}: {
  accountReference: string;
  amountKes: number;
  callbackUrl: string;
  phoneNumber: string;
  transactionDescription: string;
}) =>
  sendSasaPayRequest("/api/v1/payments/request-payment/", {
    AccountReference: accountReference,
    Amount: amountKes.toFixed(2),
    CallBackURL: callbackUrl,
    Currency: "KES",
    MerchantCode: getSasaPayMerchantCode(),
    NetworkCode: MPESA_CHANNEL_CODE,
    PhoneNumber: phoneNumber,
    TransactionDesc: transactionDescription,
    "Transaction Fee": "0",
  });

export const requestSasaPayB2CPayout = async ({
  amountKes,
  callbackUrl,
  phoneNumber,
  reason,
  requestReference,
}: {
  amountKes: number;
  callbackUrl: string;
  phoneNumber: string;
  reason: string;
  requestReference: string;
}) =>
  sendSasaPayRequest("/api/v1/payments/b2c/", {
    Amount: amountKes.toFixed(2),
    CallBackURL: callbackUrl,
    Channel: MPESA_CHANNEL_CODE,
    Currency: "KES",
    MerchantCode: getSasaPayMerchantCode(),
    MerchantTransactionReference: requestReference,
    Reason: reason,
    ReceiverNumber: phoneNumber,
  });

export const getFriendlySasaPayWithdrawalMessage = (rawMessage: string | null | undefined) => {
  const message = rawMessage?.trim();
  if (!message) {
    return "M-PESA withdrawal could not be completed right now. Your funds were returned to your balance.";
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("insufficient balance to send kes")) {
    return "M-PESA withdrawals are temporarily unavailable right now. Your funds were returned to your balance. Please try again later.";
  }

  if (
    normalized.includes("receiver") &&
    (normalized.includes("invalid") || normalized.includes("not found") || normalized.includes("does not exist"))
  ) {
    return "The M-PESA number could not be reached. Check the number and try again.";
  }

  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    return "The M-PESA payout request timed out. Your funds were returned to your balance. Please try again.";
  }

  return message;
};

export const readJsonRequestBody = async (request: AsyncIterable<Buffer | string>) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawBody) as Json;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Request body must be a JSON object.");
    }

    return parsed as JsonObject;
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
};

export const normalizeCallbackPayload = (rawPayload: Record<string, Json | undefined>) => {
  const requestIdCandidate =
    pickString(
      rawPayload.MerchantTransactionReference,
      rawPayload.AccountReference,
      rawPayload.BillRefNumber,
      rawPayload.billRefNumber,
      rawPayload.merchantReference,
    );

  return {
    amountKes:
      asNumber(rawPayload.TransactionAmount) ??
      asNumber(rawPayload.TransAmount) ??
      asNumber(rawPayload.Amount) ??
      asNumber(rawPayload.amount),
    checkoutId:
      pickString(
        rawPayload.CheckoutRequestID,
        rawPayload.checkoutRequestID,
        rawPayload.B2CRequestID,
        rawPayload.ConversationID,
      ),
    phoneNumber:
      pickString(
        rawPayload.CustomerMobile,
        rawPayload.MSISDN,
        rawPayload.RecipientAccountNumber,
        rawPayload.PhoneNumber,
        rawPayload.mobileNumber,
      ),
    providerRequestId: pickString(
      rawPayload.MerchantRequestID,
      rawPayload.B2CRequestID,
      rawPayload.merchantRequestID,
    ),
    requestId: requestIdCandidate,
    resultCode: pickString(rawPayload.ResultCode, rawPayload.resultCode, rawPayload.ResponseCode),
    resultDescription: pickString(
      rawPayload.ResultDesc,
      rawPayload.detail,
      rawPayload.ResponseDescription,
      rawPayload.responseDescription,
      rawPayload.message,
    ),
    transactionReference:
      pickString(
        rawPayload.SasaPayTransactionCode,
        rawPayload.SasaPayTransactionID,
        rawPayload.TransactionReference,
        rawPayload.TransactionCode,
        rawPayload.ThirdPartyTransID,
        rawPayload.TransID,
        rawPayload.ConversationID,
        rawPayload.PaymentRequestID,
      ),
  };
};
