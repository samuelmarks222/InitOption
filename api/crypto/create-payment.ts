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
import { query, queryOne, userRpc } from "../_lib/db.js";
import { authenticateRequest, clerkUserIdToUuid } from "../_lib/clerkWebhook.js";

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
  const now = new Date().toISOString();

  await query(
    "update deposit_bonus_redemptions set credited_at = $1, released_at = $2, status = $3, updated_at = $4 where deposit_request_id = $5 and status = $6",
    [null, now, "released", now, requestId, "reserved"],
  );
};

const rejectPendingDepositRequest = async ({
  reason,
  requestId,
}: {
  reason: string;
  requestId: string;
}) => {
  const now = new Date().toISOString();

  await query(
    `update deposit_requests set admin_note = $1, processed_at = $2, processed_by = $3, status = $4, updated_at = $5 where id = $6 and status = $7`,
    [reason, now, null, "rejected", now, requestId, "pending"],
  );

  await releasePendingBonusRedemption({ requestId });
};

const resolveSelectedBonusOffer = async ({
  amount,
  bonusOfferId,
  userId,
}: {
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

  const [profile, offers, redemptions] = await Promise.all([
    queryOne("select total_deposit from profiles where id = $1", [userId]),
    query(
      "select * from deposit_bonus_offers where status = $1 order by position asc, deposit_amount asc",
      ["active"],
    ),
    query("select bonus_offer_id, created_at, status from deposit_bonus_redemptions where user_id = $1", [userId]),
  ]);

  const bonusCatalog = buildDepositBonusCatalog({
    offers: (offers ?? []) as DepositBonusOfferRow[],
    redemptions: (redemptions ?? []) as Pick<DepositBonusRedemptionRow, "bonus_offer_id" | "created_at" | "status">[],
    totalDeposit: Number(profile?.total_deposit ?? 0),
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

    const clerkUserId = await authenticateRequest(request.headers);
    if (!clerkUserId) {
      sendJson(response, 401, { error: "Missing or invalid Bearer token." });
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

    const userId = clerkUserIdToUuid(clerkUserId);
    const userEmail = null;

    const supportedMethodsRows = await query(
      "select symbol, network, confirmations_required, attribution_mode from crypto_payment_methods where status = $1",
      ["active"],
    );

    const supportedPlisioCurrencies = Array.from(
      new Set(
        (supportedMethodsRows ?? []).reduce<string[]>((currencies, entry) => {
          const methodEntry = entry as Tables<"crypto_payment_methods">;
          if (methodEntry.attribution_mode === "static") {
            return currencies;
          }

          const currency = mapCryptoMethodToPlisioCurrency({
            network: methodEntry.network,
            symbol: methodEntry.symbol,
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
      const instructionRow = await queryOne(
        `select ci.*, pm as payment_method from crypto_deposit_instructions ci
           join crypto_payment_methods pm on pm.id = ci.payment_method_id
         where ci.id = $1 and ci.user_id = $2`,
        [instructionId, userId],
      );

      const instruction = instructionRow as Tables<"crypto_deposit_instructions"> & {
        payment_method?: Tables<"crypto_payment_methods">;
      };
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

    const paymentMethodRow = await queryOne(
      "select * from crypto_payment_methods where id = $1 and status = $2",
      [paymentMethodId, "active"],
    );

    const paymentMethod = paymentMethodRow as Tables<"crypto_payment_methods">;
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
      amount,
      bonusOfferId,
      userId,
    });

    const requestRows = await userRpc("request_deposit_review", clerkUserId, {
      p_amount: amount,
      p_method: "CRYPTO",
      p_payment_method_id: paymentMethod.id,
      p_promo_id: promoId,
      p_tx_hash: null,
    });

    const requestPayload = (requestRows?.[0] ?? {}) as {
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
      const bonusUpdateRow = await queryOne(
        `update deposit_requests
            set bonus_offer_id = $1, promo_bonus = $2, updated_at = $3
          where id = $4 and user_id = $5 and status = $6
          returning id`,
        [selectedOffer.id, effectivePromoBonus, now, depositRequestId, userId, "pending"],
      );

      if (!bonusUpdateRow) {
        await rejectPendingDepositRequest({
          reason: "Deposit bonus reservation failed: pending deposit request could not be updated",
          requestId: depositRequestId,
        });
        throw new Error("Deposit bonus reservation failed");
      }

      await query(
        `insert into deposit_bonus_redemptions
          (bonus_amount, bonus_offer_id, deposit_amount, deposit_request_id, status, user_id)
         values ($1, $2, $3, $4, $5, $6)`,
        [effectivePromoBonus, selectedOffer.id, amount, depositRequestId, "reserved", userId],
      );
    }

    const requiredConfirmations = Math.max(
      Number(paymentMethod.confirmations_required ?? 0),
      ...(supportedMethodsRows ?? [])
        .map((entry) => entry as Tables<"crypto_payment_methods">)
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

    const instructionRow = await queryOne(
      `insert into crypto_deposit_instructions
        (deposit_address, deposit_request_id, expected_amount_usd, instruction_status, memo_label, memo_value, payment_method_id, promo_bonus, required_confirmations, user_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning *`,
      [
        buildPlisioInstructionAddress(depositRequestId),
        depositRequestId,
        amount,
        "awaiting_payment",
        null,
        null,
        paymentMethod.id,
        effectivePromoBonus,
        Math.max(requiredConfirmations, 0),
        userId,
      ],
    );

    if (!instructionRow) {
      await rejectPendingDepositRequest({
        reason: "Deposit instruction creation failed after Plisio checkout: no row returned",
        requestId: depositRequestId,
      });
      throw new Error("Failed to create deposit instruction.");
    }

    const instruction = instructionRow as Tables<"crypto_deposit_instructions">;

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
