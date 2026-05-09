import type { IncomingMessage, ServerResponse } from "node:http";
import type { Json, Tables } from "../../src/integrations/supabase/types.js";
import { getHeaderValue } from "../../src/lib/cryptoWebhook.js";
import {
  buildDepositBonusCatalog,
  calculateDepositBonusAmountFromOffer,
  doesDepositAmountMatchBonusOffer,
  formatDepositBonusOfferRange,
} from "../../src/lib/depositBonusOffers.js";
import { buildPlisioInstructionAddress, mapCryptoMethodToPlisioCurrency } from "../../src/lib/plisio.js";
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
  instructionId?: string;
  paymentMethodId?: string;
  promoId?: string | null;
};

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

const parseJsonBody = (rawBody: string): JsonObject => {
  try {
    const parsed = JSON.parse(rawBody) as Json;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("Request body must be a JSON object.");
    }

    return parsed as JsonObject;
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
};

const asString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const asIdString = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return asString(value);
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

const parseBearerToken = (authorizationHeader: string) => {
  const trimmed = authorizationHeader.trim();
  if (!trimmed) return null;

  const [scheme, token] = trimmed.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
};

const getBaseAppUrl = (request: ApiRequest) => {
  const protocol = getHeaderValue(request.headers, "x-forwarded-proto") || "https";
  const host = getHeaderValue(request.headers, "x-forwarded-host") || getHeaderValue(request.headers, "host");

  if (!host) {
    throw new Error(
      "Unable to resolve the request host. Set APP_BASE_URL or PLISIO_CALLBACK_URL explicitly in environment variables.",
    );
  }

  return `${protocol}://${host}`;
};

const withJsonResponseFlag = (urlString: string) => {
  const url = new URL(urlString);
  if (!url.searchParams.has("json")) {
    url.searchParams.set("json", "true");
  }
  return url.toString();
};

const getPlisioCallbackUrl = (request: ApiRequest) => {
  const configured = process.env.PLISIO_CALLBACK_URL?.trim();
  if (configured) {
    return withJsonResponseFlag(configured);
  }

  return withJsonResponseFlag(`${getBaseAppUrl(request)}/api/crypto/webhook`);
};

const getPlisioApiKey = () => {
  const key = process.env.PLISIO_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing required environment variable: PLISIO_API_KEY");
  }
  return key;
};

const releasePendingBonusRedemption = async ({ requestId }: { requestId: string }) => {
  const adminClient = getSupabaseAdminClient();
  const now = new Date().toISOString();

  await adminClient
    .from("deposit_bonus_redemptions")
    .update({
      credited_at: null,
      released_at: now,
      status: "released",
      updated_at: now,
    })
    .eq("deposit_request_id", requestId)
    .eq("status", "reserved");
};

const rejectPendingDepositRequest = async ({
  reason,
  requestId,
}: {
  reason: string;
  requestId: string;
}) => {
  const adminClient = getSupabaseAdminClient();
  const now = new Date().toISOString();

  await adminClient
    .from("deposit_requests")
    .update({
      admin_note: reason,
      processed_at: now,
      processed_by: null,
      status: "rejected",
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("status", "pending");

  await releasePendingBonusRedemption({ requestId });
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
    adminClient
      .from("profiles")
      .select("total_deposit")
      .eq("id", userId)
      .maybeSingle(),
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

  if (profileResponse.error) {
    throw profileResponse.error;
  }

  if (offersResponse.error) {
    throw offersResponse.error;
  }

  if (redemptionsResponse.error) {
    throw redemptionsResponse.error;
  }

  const bonusCatalog = buildDepositBonusCatalog({
    offers: (offersResponse.data ?? []) as DepositBonusOfferRow[],
    redemptions: (redemptionsResponse.data ?? []) as Pick<DepositBonusRedemptionRow, "bonus_offer_id" | "created_at" | "status">[],
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

const createPlisioHostedCheckout = async ({
  allowedCurrencies,
  amountUsd,
  callbackUrl,
  currency,
  orderId,
  successInvoiceUrl,
  failInvoiceUrl,
  userEmail,
}: {
  allowedCurrencies: string[];
  amountUsd: number;
  callbackUrl: string;
  currency: string;
  failInvoiceUrl: string;
  orderId: string;
  successInvoiceUrl: string;
  userEmail: string | null;
}) => {
  const requestUrl = new URL("https://api.plisio.net/api/v1/invoices/new");
  requestUrl.searchParams.set("api_key", getPlisioApiKey());
  if (allowedCurrencies.length > 0) {
    requestUrl.searchParams.set("allowed_psys_cids", allowedCurrencies.join(","));
  }
  requestUrl.searchParams.set("callback_url", callbackUrl);
  requestUrl.searchParams.set("currency", currency);
  requestUrl.searchParams.set("description", "Platform deposit");
  requestUrl.searchParams.set("expire_min", "1440");
  requestUrl.searchParams.set("fail_invoice_url", failInvoiceUrl);
  requestUrl.searchParams.set("order_name", "Platform deposit");
  requestUrl.searchParams.set("order_number", orderId);
  requestUrl.searchParams.set("plugin", "digital-gemini-trade");
  requestUrl.searchParams.set("return_existing", "true");
  requestUrl.searchParams.set("source_amount", amountUsd.toFixed(2));
  requestUrl.searchParams.set("source_currency", "USD");
  requestUrl.searchParams.set("success_invoice_url", successInvoiceUrl);
  requestUrl.searchParams.set("version", "1.0.0");
  if (userEmail) {
    requestUrl.searchParams.set("email", userEmail);
  }

  const response = await fetch(requestUrl, {
    method: "GET",
  });

  let payload: JsonObject | null = null;
  try {
    payload = (await response.json()) as JsonObject;
  } catch {
    payload = null;
  }

  const payloadData = payload && typeof payload.data === "object" && payload.data && !Array.isArray(payload.data)
    ? (payload.data as JsonObject)
    : null;

  if (!response.ok || !payload || asString(payload.status) !== "success" || !payloadData) {
    const plisioError =
      (payloadData && (asString(payloadData.message) || asString(payloadData.error))) ||
      asString(payload?.message) ||
      asString(payload?.error) ||
      `Plisio returned HTTP ${response.status}`;

    throw new Error(`Plisio hosted checkout creation failed: ${plisioError}`);
  }

  return payloadData;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const rawBody = await readRawBody(request);
    const body = parseJsonBody(rawBody) as RequestPayload;

    const amount = Number(body.amount ?? 0);
    const bonusOfferId = asString(body.bonusOfferId ?? null);
    const instructionId = asString(body.instructionId);
    const paymentMethodId = asString(body.paymentMethodId);
    const promoId = asString(body.promoId ?? null);
    const authHeader = getHeaderValue(request.headers, "authorization");
    const accessToken = parseBearerToken(authHeader);

    if (!accessToken) {
      sendJson(response, 401, { error: "Missing Bearer token." });
      return;
    }

    if (!instructionId && !paymentMethodId) {
      sendJson(response, 400, { error: "paymentMethodId is required." });
      return;
    }

    if (!instructionId && (!Number.isFinite(amount) || amount <= 0)) {
      sendJson(response, 400, { error: "amount must be a positive number." });
      return;
    }

    if (promoId && bonusOfferId) {
      sendJson(response, 400, {
        error: "Promo codes cannot be combined with deposit bonus offers.",
      });
      return;
    }

    const userClient = getSupabaseUserClient(accessToken);
    const authResponse = await userClient.auth.getUser();

    if (authResponse.error || !authResponse.data.user?.id) {
      sendJson(response, 401, { error: "Invalid authentication token." });
      return;
    }

    const userId = authResponse.data.user.id;
    const userEmail = authResponse.data.user.email?.trim() || null;
    const adminClient = getSupabaseAdminClient();

    const supportedMethodsResponse = await adminClient
      .from("crypto_payment_methods")
      .select("symbol, network, confirmations_required, attribution_mode")
      .eq("status", "active");

    if (supportedMethodsResponse.error) {
      throw supportedMethodsResponse.error;
    }

    const supportedPlisioCurrencies = Array.from(
      new Set(
        (supportedMethodsResponse.data ?? []).reduce<string[]>((currencies, entry) => {
          if (entry.attribution_mode === "static") {
            return currencies;
          }

          const currency = mapCryptoMethodToPlisioCurrency({
            network: entry.network,
            symbol: entry.symbol,
          });

          if (currency) {
            currencies.push(currency);
          }

          return currencies;
        }, []),
      ),
    );
    const appBaseUrl = process.env.APP_BASE_URL?.trim() || getBaseAppUrl(request);

    if (instructionId) {
      const instructionResponse = await adminClient
        .from("crypto_deposit_instructions")
        .select("*, payment_method:crypto_payment_methods(*)")
        .eq("id", instructionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (instructionResponse.error) {
        throw instructionResponse.error;
      }

      const instruction = instructionResponse.data;
      const paymentMethod = instruction?.payment_method;

      if (!instruction || !paymentMethod) {
        sendJson(response, 404, { error: "Deposit instruction not found." });
        return;
      }

      if (!instruction.deposit_address.startsWith("plisio:")) {
        sendJson(response, 400, {
          error: "Hosted checkout recovery is only available for Plisio-backed deposit requests.",
        });
        return;
      }

      const plisioCurrency = mapCryptoMethodToPlisioCurrency({
        network: paymentMethod.network,
        symbol: paymentMethod.symbol,
      });

      if (!plisioCurrency) {
        sendJson(response, 400, {
          error: `${paymentMethod.coin_name} (${paymentMethod.symbol} ${paymentMethod.network}) is not supported by the current Plisio configuration.`,
        });
        return;
      }

      const plisioCheckout = await createPlisioHostedCheckout({
        allowedCurrencies: supportedPlisioCurrencies,
        amountUsd: Number(instruction.expected_amount_usd ?? 0),
        callbackUrl: getPlisioCallbackUrl(request),
        currency: plisioCurrency,
        failInvoiceUrl: `${appBaseUrl}/deposit`,
        orderId: instruction.deposit_request_id,
        successInvoiceUrl: `${appBaseUrl}/trade`,
        userEmail,
      });

      const invoiceUrl = asString(plisioCheckout.invoice_url);
      if (!invoiceUrl) {
        throw new Error("Plisio did not return a hosted invoice URL.");
      }

      sendJson(response, 200, {
        ok: true,
        instruction: {
          address: instruction.deposit_address,
          amount: Number(instruction.expected_amount_usd ?? 0),
          confirmations_required: Number(instruction.required_confirmations ?? 0),
          created_at: instruction.created_at,
          deposit_request_id: instruction.deposit_request_id,
          hosted_checkout_url: invoiceUrl,
          instruction_id: instruction.id,
          instruction_status: instruction.instruction_status,
          memo_label: instruction.memo_label,
          memo_value: instruction.memo_value,
          payment_method_id: instruction.payment_method_id,
          promo_bonus: Number(instruction.promo_bonus ?? 0),
          provider_name: "plisio",
          provider_order_id: instruction.deposit_request_id,
          provider_pay_amount:
            asNumber(plisioCheckout.invoice_total_sum) ??
            asNumber(plisioCheckout.amount) ??
            asNumber(plisioCheckout.pending_amount),
          provider_pay_currency:
            asString(plisioCheckout.currency) ||
            asString(plisioCheckout.psys_cid) ||
            plisioCurrency,
          provider_payment_id: asIdString(plisioCheckout.txn_id),
          provider_payment_status: asString(plisioCheckout.status) || "new",
        },
      });
      return;
    }

    const methodResponse = await adminClient
      .from("crypto_payment_methods")
      .select("*")
      .eq("id", paymentMethodId)
      .eq("status", "active")
      .maybeSingle();

    if (methodResponse.error) {
      throw methodResponse.error;
    }

    const paymentMethod = methodResponse.data;
    if (!paymentMethod) {
      sendJson(response, 400, { error: "Selected crypto payment method is not active." });
      return;
    }

    const plisioCurrency = mapCryptoMethodToPlisioCurrency({
      network: paymentMethod.network,
      symbol: paymentMethod.symbol,
    });

    if (!plisioCurrency) {
      sendJson(response, 400, {
        error: `${paymentMethod.coin_name} (${paymentMethod.symbol} ${paymentMethod.network}) is not supported by the current Plisio configuration.`,
      });
      return;
    }

    if (
      Number(paymentMethod.minimum_deposit_amount ?? 0) > 0 &&
      amount < Number(paymentMethod.minimum_deposit_amount ?? 0)
    ) {
      sendJson(response, 400, {
        error: `Minimum deposit for ${paymentMethod.symbol} is ${Number(paymentMethod.minimum_deposit_amount).toFixed(2)} USD.`,
      });
      return;
    }

    if (paymentMethod.attribution_mode === "static") {
      sendJson(response, 400, {
        error:
          "Selected method is still in static/manual mode. Switch it to an automated crypto mode before using Plisio hosted checkout.",
      });
      return;
    }

    const { bonusAmount: selectedBonusAmount, selectedOffer } = await resolveSelectedBonusOffer({
      adminClient,
      amount,
      bonusOfferId,
      userId,
    });

    const requestResponse = await userClient.rpc("request_deposit_review", {
      p_amount: amount,
      p_method: "CRYPTO",
      p_payment_method_id: paymentMethod.id,
      p_promo_id: promoId,
      p_tx_hash: null,
    });

    if (requestResponse.error) {
      throw requestResponse.error;
    }

    const requestPayload = (requestResponse.data ?? {}) as {
      promo_bonus?: number | string | null;
      request_id?: string | null;
    };
    const depositRequestId = asString(requestPayload.request_id);

    if (!depositRequestId) {
      throw new Error("Deposit request could not be created.");
    }

    const requestedPromoBonus = Number(requestPayload.promo_bonus ?? 0);
    const effectivePromoBonus = promoId ? requestedPromoBonus : Number(selectedBonusAmount ?? 0);

    if (selectedOffer) {
      const now = new Date().toISOString();
      const bonusUpdateResponse = await adminClient
        .from("deposit_requests")
        .update({
          bonus_offer_id: selectedOffer.id,
          promo_bonus: effectivePromoBonus,
          updated_at: now,
        })
        .eq("id", depositRequestId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (bonusUpdateResponse.error) {
        await rejectPendingDepositRequest({
          reason: `Deposit bonus reservation failed: ${bonusUpdateResponse.error.message || "unknown error"}`,
          requestId: depositRequestId,
        });
        throw bonusUpdateResponse.error;
      }

      const redemptionInsertResponse = await adminClient
        .from("deposit_bonus_redemptions")
        .insert({
          bonus_amount: effectivePromoBonus,
          bonus_offer_id: selectedOffer.id,
          deposit_amount: amount,
          deposit_request_id: depositRequestId,
          status: "reserved",
          user_id: userId,
        });

      if (redemptionInsertResponse.error) {
        await rejectPendingDepositRequest({
          reason: `Deposit bonus reservation failed: ${redemptionInsertResponse.error.message || "unknown error"}`,
          requestId: depositRequestId,
        });
        throw redemptionInsertResponse.error;
      }
    }

    const requiredConfirmations = Math.max(
      Number(paymentMethod.confirmations_required ?? 0),
      ...(supportedMethodsResponse.data ?? [])
        .filter((entry) => entry.attribution_mode !== "static")
        .map((entry) => Number(entry.confirmations_required ?? 0)),
    );

    let plisioCheckout: JsonObject;
    try {
      plisioCheckout = await createPlisioHostedCheckout({
        allowedCurrencies: supportedPlisioCurrencies,
        amountUsd: amount,
        callbackUrl: getPlisioCallbackUrl(request),
        currency: plisioCurrency,
        failInvoiceUrl: `${appBaseUrl}/deposit`,
        orderId: depositRequestId,
        successInvoiceUrl: `${appBaseUrl}/trade`,
        userEmail,
      });
    } catch (error) {
      await rejectPendingDepositRequest({
        reason: `Plisio hosted checkout creation failed: ${error instanceof Error ? error.message : "unknown error"}`,
        requestId: depositRequestId,
      });
      throw error;
    }

    const invoiceUrl = asString(plisioCheckout.invoice_url);
    if (!invoiceUrl) {
      await rejectPendingDepositRequest({
        reason: "Plisio did not return a hosted invoice URL.",
        requestId: depositRequestId,
      });
      throw new Error("Plisio did not return a hosted invoice URL.");
    }

    const instructionResponse = await adminClient
      .from("crypto_deposit_instructions")
      .insert({
        deposit_address: buildPlisioInstructionAddress(depositRequestId),
        deposit_request_id: depositRequestId,
        expected_amount_usd: amount,
        instruction_status: "awaiting_payment",
        memo_label: null,
        memo_value: null,
        payment_method_id: paymentMethod.id,
        promo_bonus: effectivePromoBonus,
        required_confirmations: Math.max(requiredConfirmations, 0),
        user_id: userId,
      })
      .select("*")
      .single();

    if (instructionResponse.error || !instructionResponse.data) {
      await rejectPendingDepositRequest({
        reason: `Deposit instruction creation failed after Plisio checkout: ${
          instructionResponse.error?.message || "unknown error"
        }`,
        requestId: depositRequestId,
      });
      throw instructionResponse.error || new Error("Failed to create deposit instruction.");
    }

    const instruction = instructionResponse.data;

    sendJson(response, 200, {
      ok: true,
      instruction: {
        address: instruction.deposit_address,
        amount: Number(instruction.expected_amount_usd ?? amount),
        confirmations_required: Number(instruction.required_confirmations ?? 0),
        created_at: instruction.created_at,
        deposit_request_id: instruction.deposit_request_id,
        hosted_checkout_url: invoiceUrl,
        instruction_id: instruction.id,
        instruction_status: instruction.instruction_status,
        memo_label: instruction.memo_label,
        memo_value: instruction.memo_value,
        payment_method_id: instruction.payment_method_id,
        promo_bonus: effectivePromoBonus,
        provider_name: "plisio",
        provider_order_id: depositRequestId,
        provider_pay_amount:
          asNumber(plisioCheckout.invoice_total_sum) ??
          asNumber(plisioCheckout.amount) ??
          asNumber(plisioCheckout.pending_amount),
        provider_pay_currency:
          asString(plisioCheckout.currency) ||
          asString(plisioCheckout.psys_cid) ||
          plisioCurrency,
        provider_payment_id: asIdString(plisioCheckout.txn_id),
        provider_payment_status: asString(plisioCheckout.status) || "new",
      },
    });
  } catch (error) {
    console.error("Plisio hosted checkout creation failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to create Plisio hosted checkout",
    });
  }
}
