import type { IncomingMessage, ServerResponse } from "node:http";
import type { Json, Tables } from "../../src/integrations/supabase/types.js";
import { getHeaderValue } from "../../src/lib/cryptoWebhook.js";
import {
  buildDepositBonusCatalog,
  calculateDepositBonusAmountFromOffer,
  doesDepositAmountMatchBonusOffer,
  formatDepositBonusOfferRange,
} from "../../src/lib/depositBonusOffers.js";
import {
  convertUsdToKesDepositAmount,
  maskKenyanPhoneNumber,
  MPESA_CHANNEL_CODE,
  MPESA_METHOD_LABEL,
  normalizeKenyanPhoneNumber,
} from "../../src/lib/mobileMoneyShared.js";
import { buildSasaPayCallbackUrl, readJsonRequestBody, requestSasaPayStkPush } from "../_lib/sasapay.js";
import { getSupabaseAdminClient, getSupabaseUserClient } from "../_lib/supabaseAdmin.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

type JsonObject = { [key: string]: Json | undefined };
type DepositBonusOfferRow = Tables<"deposit_bonus_offers">;
type DepositBonusRedemptionRow = Tables<"deposit_bonus_redemptions">;

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

const parseBearerToken = (authorizationHeader: string) => {
  const trimmed = authorizationHeader.trim();
  if (!trimmed) return null;

  const [scheme, token] = trimmed.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
};

const resolveSelectedBonusOffer = async ({
  adminClient,
  amount,
  bonusOfferId,
  userId,
}: {
  adminClient: ReturnType<typeof getSupabaseAdminClient>;
  amount: number;
  bonusOfferId: string | null;
  userId: string;
}) => {
  if (!bonusOfferId) {
    return {
      bonusAmount: 0,
      selectedOffer: null as DepositBonusOfferRow | null,
    };
  }

  const [profileResponse, offersResponse, redemptionsResponse] = await Promise.all([
    adminClient.from("profiles").select("total_deposit").eq("id", userId).maybeSingle(),
    adminClient
      .from("deposit_bonus_offers")
      .select("*")
      .eq("status", "active")
      .order("position", { ascending: true })
      .order("deposit_amount", { ascending: true }),
    adminClient
      .from("deposit_bonus_redemptions")
      .select("bonus_offer_id, created_at, status")
      .eq("user_id", userId),
  ]);

  if (profileResponse.error) throw profileResponse.error;
  if (offersResponse.error) throw offersResponse.error;
  if (redemptionsResponse.error) throw redemptionsResponse.error;

  const bonusCatalog = buildDepositBonusCatalog({
    offers: (offersResponse.data ?? []) as DepositBonusOfferRow[],
    redemptions: (redemptionsResponse.data ?? []) as Pick<
      DepositBonusRedemptionRow,
      "bonus_offer_id" | "created_at" | "status"
    >[],
    totalDeposit: Number(profileResponse.data?.total_deposit ?? 0),
  });

  const selectedOffer = bonusCatalog.find((offer) => offer.id === bonusOfferId) ?? null;
  if (!selectedOffer) {
    throw new Error("Selected deposit bonus is not active.");
  }

  if (!selectedOffer.eligible) {
    if (selectedOffer.reason_code === "already_used") {
      throw new Error("This deposit bonus has already been used on this account.");
    }

    throw new Error("Selected deposit bonus is not available right now.");
  }

  if (!doesDepositAmountMatchBonusOffer({ amount, offer: selectedOffer })) {
    throw new Error(
      `Selected deposit bonus only applies to deposits in the ${formatDepositBonusOfferRange({ offer: selectedOffer })} range.`,
    );
  }

  return {
    bonusAmount: calculateDepositBonusAmountFromOffer({ amount, offer: selectedOffer }),
    selectedOffer,
  };
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
    amountKes = convertUsdToKesDepositAmount(amountUsd);

    if (amountUsd < 5) {
      sendJson(response, 400, { error: "Minimum M-PESA deposit is $5." });
      return;
    }

    const userClient = getSupabaseUserClient(accessToken);
    const authResponse = await userClient.auth.getUser();

    if (authResponse.error || !authResponse.data.user?.id) {
      sendJson(response, 401, { error: "Invalid authentication token." });
      return;
    }

    const userId = authResponse.data.user.id;
    const adminClient = getSupabaseAdminClient();

    const { bonusAmount, selectedOffer } = await resolveSelectedBonusOffer({
      adminClient,
      amount: amountUsd,
      bonusOfferId,
      userId,
    });

    const requestResponse = await userClient.rpc("request_deposit_review", {
      p_amount: amountUsd,
      p_method: MPESA_METHOD_LABEL,
      p_payment_method_id: null,
      p_promo_id: null,
      p_tx_hash: null,
    });

    if (requestResponse.error) {
      throw requestResponse.error;
    }

    const requestPayload = (requestResponse.data ?? {}) as {
      request_id?: string | null;
    };

    depositRequestId = asString(requestPayload.request_id);
    if (!depositRequestId) {
      throw new Error("Deposit request could not be created.");
    }

    if (selectedOffer) {
      const now = new Date().toISOString();
      const bonusUpdateResponse = await adminClient
        .from("deposit_requests")
        .update({
          bonus_offer_id: selectedOffer.id,
          promo_bonus: bonusAmount,
          updated_at: now,
        })
        .eq("id", depositRequestId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (bonusUpdateResponse.error) {
        throw bonusUpdateResponse.error;
      }

      const redemptionInsertResponse = await adminClient.from("deposit_bonus_redemptions").insert({
        bonus_amount: bonusAmount,
        bonus_offer_id: selectedOffer.id,
        deposit_amount: amountUsd,
        deposit_request_id: depositRequestId,
        status: "reserved",
        user_id: userId,
      });

      if (redemptionInsertResponse.error) {
        throw redemptionInsertResponse.error;
      }
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

    const providerUpdate = await adminClient
      .from("deposit_requests")
      .update({
        provider_amount: amountKes,
        provider_channel: MPESA_CHANNEL_CODE,
        provider_checkout_id: checkoutRequestId,
        provider_currency: "KES",
        provider_name: "sasapay",
        provider_payload: sasaPayResponse,
        provider_phone_number: normalizedPhoneNumber,
        provider_request_id: providerRequestId,
        provider_result_code: providerResultCode,
        provider_result_desc: providerResultDesc,
        provider_status: "pending_customer",
        provider_transaction_ref: transactionReference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", depositRequestId)
      .eq("status", "pending");

    if (providerUpdate.error) {
      console.error("Failed to persist SasaPay deposit provider metadata", providerUpdate.error);
    }

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
        const adminClient = getSupabaseAdminClient();
        await adminClient.rpc("process_mobile_money_deposit_callback", {
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
