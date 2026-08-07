import type { IncomingMessage, ServerResponse } from "node:http";
import { rpc } from "../_lib/db.js";
import type { Json } from "../../src/integrations/supabase/types.js";
import {
  getHeaderValue,
  normalizeCryptoWebhookPayload,
  parseFormEncodedWebhookBody,
  verifyCoinPaymentsLegacyIpnSignature,
  verifyCoinPaymentsPayloadSignature,
  verifyCryptoWebhookSignature,
  verifyNowPaymentsSignature,
  verifyPlisioSignature,
} from "../../src/lib/cryptoWebhook.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;
type JsonObject = { [key: string]: Json | undefined };

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const readRawBody = async (request: ApiRequest) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
};

const parseWebhookBody = (request: ApiRequest, rawBody: string): JsonObject => {
  const contentType = getHeaderValue(request.headers, "content-type").toLowerCase();

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return parseFormEncodedWebhookBody(rawBody);
  }

  try {
    const parsedBody = JSON.parse(rawBody) as Json;
    if (!parsedBody || Array.isArray(parsedBody) || typeof parsedBody !== "object") {
      throw new Error("Webhook payload must be a JSON object.");
    }

    return parsedBody as JsonObject;
  } catch {
    const fallbackBody = parseFormEncodedWebhookBody(rawBody);
    if (Object.keys(fallbackBody).length > 0) {
      return fallbackBody;
    }

    throw new Error("Webhook payload must be a JSON object or form-encoded fields.");
  }
};

const getAbsoluteRequestUrl = (request: ApiRequest) => {
  const protocol = getHeaderValue(request.headers, "x-forwarded-proto") || "https";
  const host = getHeaderValue(request.headers, "x-forwarded-host") || getHeaderValue(request.headers, "host");
  const path = request.url || "/api/crypto/webhook";

  if (!host) {
    throw new Error("Unable to resolve the request host while verifying the CoinPayments webhook signature.");
  }

  return `${protocol}://${host}${path}`;
};

const verifyIncomingSignature = ({
  parsedBody,
  rawBody,
  request,
}: {
  parsedBody: Record<string, unknown>;
  rawBody: string;
  request: ApiRequest;
}) => {
  const genericSignature =
    getHeaderValue(request.headers, "x-crypto-signature") ||
    getHeaderValue(request.headers, "x-deposit-signature");
  const plisioSignature = typeof parsedBody.verify_hash === "string" ? parsedBody.verify_hash.trim() : "";
  const nowPaymentsSignature = getHeaderValue(request.headers, "x-nowpayments-sig");
  const legacyCoinPaymentsSignature = getHeaderValue(request.headers, "hmac");
  const coinPaymentsSignature = getHeaderValue(request.headers, "x-coinpayments-signature");

  if (plisioSignature) {
    const secret = process.env.PLISIO_API_KEY?.trim();
    if (!secret) {
      throw new Error("Missing required environment variable: PLISIO_API_KEY");
    }

    return verifyPlisioSignature(parsedBody, plisioSignature, secret);
  }

  if (nowPaymentsSignature) {
    const secret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (!secret) {
      throw new Error("Missing required environment variable: NOWPAYMENTS_IPN_SECRET");
    }

    return verifyNowPaymentsSignature(parsedBody, nowPaymentsSignature, secret);
  }

  if (legacyCoinPaymentsSignature) {
    const secret = process.env.COINPAYMENTS_IPN_SECRET;
    if (!secret) {
      throw new Error("Missing required environment variable: COINPAYMENTS_IPN_SECRET");
    }

    if (!verifyCoinPaymentsLegacyIpnSignature(rawBody, legacyCoinPaymentsSignature, secret)) {
      return false;
    }

    const configuredMerchantId = process.env.COINPAYMENTS_MERCHANT_ID?.trim();
    const merchantId = typeof parsedBody.merchant === "string" ? parsedBody.merchant.trim() : "";
    if (configuredMerchantId && merchantId !== configuredMerchantId) {
      return false;
    }

    return true;
  }

  if (coinPaymentsSignature) {
    const clientId = process.env.COINPAYMENTS_CLIENT_ID;
    const secret = process.env.COINPAYMENTS_CLIENT_SECRET;
    if (!clientId || !secret) {
      throw new Error("Missing required environment variables: COINPAYMENTS_CLIENT_ID and COINPAYMENTS_CLIENT_SECRET");
    }

    const requestClientId = getHeaderValue(request.headers, "x-coinpayments-client");
    const timestamp = getHeaderValue(request.headers, "x-coinpayments-timestamp");
    if (!timestamp || (requestClientId && requestClientId !== clientId)) {
      return false;
    }

    return verifyCoinPaymentsPayloadSignature({
      clientId,
      method: request.method || "POST",
      rawBody,
      secret,
      signature: coinPaymentsSignature,
      timestamp,
      url: getAbsoluteRequestUrl(request),
    });
  }

  if (genericSignature) {
    const secret = process.env.CRYPTO_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("Missing required environment variable: CRYPTO_WEBHOOK_SECRET");
    }

    return verifyCryptoWebhookSignature(rawBody, genericSignature, secret);
  }

  return false;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const rawBody = await readRawBody(request);
    const parsedBody = parseWebhookBody(request, rawBody);

    if (!verifyIncomingSignature({ parsedBody, rawBody, request })) {
      sendJson(response, 401, { error: "Invalid webhook signature" });
      return;
    }

    const normalizedPayload = parsedBody as Record<string, unknown>;
    const payload = normalizeCryptoWebhookPayload(normalizedPayload);

    const rpcRows = await rpc("process_crypto_deposit_detection", {
      p_address: payload.address,
      p_amount_asset: payload.amountAsset,
      p_amount_asset_symbol: payload.amountAssetSymbol,
      p_amount_usd: payload.amountUsd,
      p_confirmations: payload.confirmations,
      p_event_status: payload.eventStatus,
      p_external_event_id: payload.externalEventId,
      p_memo_value: payload.memoValue,
      p_payment_method_id: payload.paymentMethodId,
      p_provider_name: payload.providerName,
      p_raw_payload: parsedBody,
      p_tx_hash: payload.txHash,
    });

    sendJson(response, 200, {
      ok: true,
      result: rpcRows?.[0] ?? null,
    });
  } catch (error) {
    console.error("Crypto webhook processing failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to process webhook",
    });
  }
}
