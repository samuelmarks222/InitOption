import type { IncomingMessage, ServerResponse } from "node:http";
import type { Json } from "../../src/integrations/supabase/types.js";
import { MPESA_CHANNEL_CODE } from "../../src/lib/mobileMoneyShared.js";
import {
  getFriendlySasaPayWithdrawalMessage,
  normalizeCallbackPayload,
  readJsonRequestBody,
  verifySasaPayCallbackToken,
} from "../_lib/sasapay.js";
import { getSupabaseAdminClient } from "../_lib/supabaseAdmin.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;
type CallbackFlow = "deposit" | "withdraw";

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const asUuid = (value: string | null) =>
  value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;

const resolveCallbackFlow = (requestUrl: string | undefined, payload: Record<string, Json | undefined>): CallbackFlow => {
  const callbackUrl = new URL(requestUrl || "/api/mobile-money/callback", "https://placeholder.local");
  const flowParam = callbackUrl.searchParams.get("flow");

  if (flowParam === "deposit" || flowParam === "withdraw") {
    return flowParam;
  }

  if (typeof payload.B2CRequestID === "string" || typeof payload.ConversationID === "string") {
    return "withdraw";
  }

  return "deposit";
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (!verifySasaPayCallbackToken(request.url || "/api/mobile-money/callback")) {
    sendJson(response, 401, { error: "Unauthorized callback." });
    return;
  }

  try {
    const payload = await readJsonRequestBody(request);
    const normalized = normalizeCallbackPayload(payload);
    const flow = resolveCallbackFlow(request.url, payload);
    const adminClient = getSupabaseAdminClient();

    if (flow === "withdraw") {
      const friendlyResultDescription = getFriendlySasaPayWithdrawalMessage(normalized.resultDescription);
      const rpcResponse = await adminClient.rpc("process_mobile_money_withdrawal_callback", {
        p_provider_amount: normalized.amountKes,
        p_provider_channel: MPESA_CHANNEL_CODE,
        p_provider_checkout_id: normalized.checkoutId,
        p_provider_currency: "KES",
        p_provider_name: "sasapay",
        p_provider_payload: {
          ...payload,
          user_message: friendlyResultDescription,
        } as Json,
        p_provider_phone_number: normalized.phoneNumber,
        p_provider_request_id: normalized.providerRequestId,
        p_provider_result_code: normalized.resultCode,
        p_provider_result_desc: friendlyResultDescription,
        p_provider_transaction_ref: normalized.transactionReference,
        p_request_id: asUuid(normalized.requestId),
      });

      if (rpcResponse.error) {
        throw rpcResponse.error;
      }

      sendJson(response, 200, { flow, ok: true });
      return;
    }

    const rpcResponse = await adminClient.rpc("process_mobile_money_deposit_callback", {
      p_provider_amount: normalized.amountKes,
      p_provider_channel: MPESA_CHANNEL_CODE,
      p_provider_checkout_id: normalized.checkoutId,
      p_provider_currency: "KES",
      p_provider_name: "sasapay",
      p_provider_payload: payload,
      p_provider_phone_number: normalized.phoneNumber,
      p_provider_request_id: normalized.providerRequestId,
      p_provider_result_code: normalized.resultCode,
      p_provider_result_desc: normalized.resultDescription,
      p_provider_transaction_ref: normalized.transactionReference,
      p_request_id: asUuid(normalized.requestId),
    });

    if (rpcResponse.error) {
      throw rpcResponse.error;
    }

    sendJson(response, 200, { flow, ok: true });
  } catch (error) {
    console.error("Mobile money callback processing failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to process mobile money callback",
    });
  }
}
