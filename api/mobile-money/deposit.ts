import type { IncomingMessage, ServerResponse } from "node:http";
import type { Json } from "../../src/integrations/supabase/types.js";
import {
  convertUsdToKesDepositAmount,
  maskKenyanPhoneNumber,
  MPESA_CHANNEL_CODE,
  MPESA_METHOD_LABEL,
  normalizeKenyanPhoneNumber,
} from "../../src/lib/mobileMoneyShared.js";
import { buildSasaPayCallbackUrl, readJsonRequestBody, requestSasaPayStkPush } from "../_lib/sasapay.js";
import { query, queryOne, rpc, userRpc, rpcResultPayload } from "../_lib/db.js";
import { authenticateRequest, clerkUserIdToUuid } from "../_lib/clerkWebhook.js";
import { resolveSelectedBonusOffer } from "../_lib/depositBonus.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

type JsonObject = { [key: string]: Json | undefined };

type RequestPayload = {
  amount?: number;
  bonusOfferId?: string | null;
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

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  let depositRequestId: string | null = null;
  let normalizedPhoneNumber: string | null = null;
  let amountKes = 0;

  try {
    const body = (await readJsonRequestBody(request)) as JsonObject & RequestPayload;
    const amount = asNumber(body.amount ?? 0);
    const bonusOfferId = asString(body.bonusOfferId ?? null);
    normalizedPhoneNumber = normalizeKenyanPhoneNumber(asString(body.phoneNumber ?? null));

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
    amountKes = convertUsdToKesDepositAmount(amountUsd);

    if (amountUsd < 5) {
      sendJson(response, 400, { error: "Minimum M-PESA deposit is $5." });
      return;
    }

    const userId = clerkUserIdToUuid(clerkUserId);

    const { bonusAmount, selectedOffer } = await resolveSelectedBonusOffer({
      amount: amountUsd,
      bonusOfferId,
      userId,
    });

    const requestRows = await userRpc("request_deposit_review", clerkUserId, {
      p_amount: amountUsd,
      p_method: MPESA_METHOD_LABEL,
      p_payment_method_id: null,
      p_promo_id: null,
      p_tx_hash: null,
    });

    const requestPayload = (rpcResultPayload(requestRows, "request_deposit_review") ?? {}) as {
      request_id?: string | null;
    };

    depositRequestId = asString(requestPayload.request_id);
    if (!depositRequestId) {
      throw new Error("Deposit request could not be created.");
    }

    if (selectedOffer) {
      const now = new Date().toISOString();
      const bonusUpdateRow = await queryOne(
        `update deposit_requests
            set bonus_offer_id = $1, promo_bonus = $2, updated_at = $3
          where id = $4 and user_id = $5 and status = $6
          returning id`,
        [selectedOffer.id, bonusAmount, now, depositRequestId, userId, "pending"],
      );

      if (!bonusUpdateRow) {
        throw new Error("Deposit bonus reservation failed");
      }

      await query(
        `insert into deposit_bonus_redemptions
          (bonus_amount, bonus_offer_id, deposit_amount, deposit_request_id, status, user_id)
         values ($1, $2, $3, $4, $5, $6)`,
        [bonusAmount, selectedOffer.id, amountUsd, depositRequestId, "reserved", userId],
      );
    }

    const sasaPayResponse = await requestSasaPayStkPush({
      accountReference: depositRequestId,
      amountKes,
      callbackUrl: buildSasaPayCallbackUrl("/api/mobile-money/deposit-callback"),
      phoneNumber: normalizedPhoneNumber,
      transactionDescription: "Trading deposit",
    });

    const providerRequestId = asString(sasaPayResponse.MerchantRequestID);
    const checkoutRequestId = asString(sasaPayResponse.CheckoutRequestID);
    const transactionReference = asString(sasaPayResponse.TransactionReference);
    const providerResultCode = asString(sasaPayResponse.ResponseCode) || "0";
    const providerResultDesc = asString(sasaPayResponse.ResponseDescription) || asString(sasaPayResponse.detail);

    await query(
      `update deposit_requests
          set provider_amount = $1, provider_channel = $2, provider_checkout_id = $3, provider_currency = $4,
              provider_name = $5, provider_payload = $6, provider_phone_number = $7, provider_request_id = $8,
              provider_result_code = $9, provider_result_desc = $10, provider_status = $11,
              provider_transaction_ref = $12, updated_at = $13
        where id = $14 and status = $15`,
      [
        amountKes,
        MPESA_CHANNEL_CODE,
        checkoutRequestId,
        "KES",
        "sasapay",
        sasaPayResponse,
        normalizedPhoneNumber,
        providerRequestId,
        providerResultCode,
        providerResultDesc,
        "pending_customer",
        transactionReference,
        new Date().toISOString(),
        depositRequestId,
        "pending",
      ],
    );

    sendJson(response, 200, {
      amount_kes: amountKes,
      amount_usd: amountUsd,
      checkout_request_id: checkoutRequestId,
      customer_message: asString(sasaPayResponse.CustomerMessage),
      detail: asString(sasaPayResponse.detail) || providerResultDesc,
      masked_phone_number: maskKenyanPhoneNumber(normalizedPhoneNumber),
      provider_request_id: providerRequestId,
      request_id: depositRequestId,
      status: "pending_customer",
    });
  } catch (error) {
    if (depositRequestId) {
      try {
        await rpc("process_mobile_money_deposit_callback", {
          p_provider_amount: amountKes || null,
          p_provider_channel: MPESA_CHANNEL_CODE,
          p_provider_currency: "KES",
          p_provider_name: "sasapay",
          p_provider_payload: { error: error instanceof Error ? error.message : "unknown error" },
          p_provider_phone_number: normalizedPhoneNumber,
          p_provider_result_code: "INIT_FAILED",
          p_provider_result_desc: error instanceof Error ? error.message : "Failed to initiate SasaPay deposit",
          p_request_id: depositRequestId,
        });
      } catch (rollbackError) {
        console.error("Failed to roll back mobile money deposit request", rollbackError);
      }
    }

    console.error("Mobile money deposit initiation failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to initiate mobile money deposit",
    });
  }
}
