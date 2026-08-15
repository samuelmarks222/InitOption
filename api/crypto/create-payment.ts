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
import { query, queryOne, rpcResultPayload, userRpc } from "../_lib/db.js";
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

  return withJsonResponseFlag(`${getBaseAppUrl(request)}/api/crypto/deposit-callback`);
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

  // Read and parse request body once at the top level
  const rawBody = await readRawBody(request);
  const body = parseJsonBody(rawBody) as RequestPayload;

  const clerkUserId = await authenticateRequest(request.headers);
  const userId = clerkUserIdToUuid(clerkUserId ?? "");

  // -------------------------------------------------------------------
  // BRANCH 1: Recover existing deposit by instruction ID
  // -------------------------------------------------------------------
  if (body.instructionId) {
    const instructionId = asString(body.instructionId);

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

    const appBaseUrl = process.env.APP_BASE_URL?.trim() || getBaseAppUrl(request);

    const plisioCheckout = await createPlisioHostedCheckout({
      allowedCurrencies: [],
      amountUsd: Number(instruction.expected_amount_usd ?? 0),
      callbackUrl: getPlisioCallbackUrl(request),
      currency: plisioCurrency,
      failInvoiceUrl: `${appBaseUrl}/deposit`,
      orderId: instruction.deposit_request_id,
      successInvoiceUrl: `${appBaseUrl}/trade`,
      userEmail: null,
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

  // -------------------------------------------------------------------
  // BRANCH 2: New deposit via Plisio "Create a Deposit" API (no hosted checkout)
  // -------------------------------------------------------------------
  const { amount, paymentMethodId, cryptoCurrency, cryptoNetwork } = body as {
    amount?: number;
    paymentMethodId?: string;
    cryptoCurrency?: string;
    cryptoNetwork?: string;
  };

  if (!amount || !Number.isFinite(amount) || Number(amount) <= 0) {
    sendJson(response, 400, { error: "Amount must be a positive number." });
    return;
  }

  if (!cryptoCurrency || !cryptoNetwork) {
    sendJson(response, 400, { error: "Crypto currency and network are required." });
    return;
  }

  // Map the crypto method to Plisio currency code using coin symbol and network
  const plisioCurrency = mapCryptoMethodToPlisioCurrency({ network: cryptoNetwork, symbol: cryptoCurrency });
  if (!plisioCurrency) {
    sendJson(response, 400, { error: "Unsupported cryptocurrency/network combination." });
    return;
  }

  // Check if user already has a Plisio deposit address for this crypto method
  const existingAddress = await queryOne(
    "select deposit_address, plisio_uid, updated_at from crypto_deposit_instructions where user_id = $1 and payment_method_id = $2 and instruction_status in ('awaiting_payment', 'payment_detected', 'confirming') order by created_at desc limit 1",
    [userId, paymentMethodId],
  );

  let plisioAddress: string;
  let operationId: string;

  if (existingAddress) {
    // Reuse existing address
    plisioAddress = existingAddress.deposit_address;
    operationId = existingAddress.plisio_uid || "";
    // Update the updated_at timestamp
    await query(
      "update crypto_deposit_instructions set updated_at = $1 where id = $2",
      [new Date().toISOString(), existingAddress.id],
    );
  } else {
    // Call Plisio Create a Deposit API inline (NO hosted checkout)
    const plisioCallbackUrl = `${process.env.APP_BASE_URL || getBaseAppUrl(request)}/api/crypto/deposit-callback`;

    const plisioApiKey = process.env.PLISIO_API_KEY ?? "";
    const plisioUrl = new URL("/shops/deposit/new", "https://api.plisio.net/api/v1");
    plisioUrl.searchParams.set("api_key", plisioApiKey);
    plisioUrl.searchParams.set("psys_cid", plisioCurrency);
    plisioUrl.searchParams.set("uid", userId);
    plisioUrl.searchParams.set("callback_url", plisioCallbackUrl);

    const plisioResponse = await fetch(plisioUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const plisioData = await plisioResponse.json();

    if (!plisioResponse.ok) {
      const errorMsg = plisioData?.error ? String(plisioData.error) : `Plisio returned HTTP ${plisioResponse.status}`;
      await query(
        `insert into crypto_deposit_instructions (
           user_id, payment_method_id, cryptocurrency, network, deposit_address, requested_amount, status, plisio_txn_id, callback_payload, created_at, updated_at
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          paymentMethodId,
          cryptoCurrency,
          cryptoNetwork,
          "",
          amount,
          "failed",
          "",
          JSON.stringify({ error: errorMsg }),
          new Date().toISOString(),
          new Date().toISOString(),
        ],
      );

      sendJson(response, 500, { error: errorMsg });
      return;
    }

    // Extract address and operation ID from Plisio response
    plisioAddress = String(plisioData?.address ?? plisioResponse?.address ?? "");
    operationId = String(plisioData?.operation_id ?? plisioResponse?.id ?? "");

    if (!plisioAddress) {
      sendJson(response, 500, { error: "Plisio did not return a deposit address" });
      return;
    }

    // Save the deposit instruction record
    const depositRequestId = `dep_${userId.replace(/-/g, "")}_${Date.now()}`;

    await query(
      `insert into crypto_deposit_instructions (
         user_id, payment_method_id, cryptocurrency, network, deposit_address, requested_amount, status, plisio_txn_id, callback_payload, created_at, updated_at
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        paymentMethodId,
        cryptoCurrency,
        cryptoNetwork,
        plisioAddress,
        amount,
        "pending",
        operationId,
        JSON.stringify({ plisioCurrency, createdAt: new Date().toISOString() }),
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
  }

  // Return the deposit address to the frontend
  sendJson(response, 200, {
    address: plisioAddress,
    cryptocurrency: cryptoCurrency,
    network: cryptoNetwork,
    plisioUid: operationId,
    amount,
    instructions: `Send ${amount} $${cryptoCurrency.toUpperCase()} (${cryptoNetwork.toUpperCase()}) to the address above.`,
    qrCode: `plisio:${plisioAddress}`,
  });
}

// -------------------------------------------------------------------
// BRANCH 3: Handle Plisio deposit callback/webhook
// -------------------------------------------------------------------
  const urlString = request.url ?? "";
  const path = typeof urlString === "string" ? urlString.replace(/^\/api/, "") : "";

  if (path.endsWith("/deposit-callback") || path === "/api/crypto/deposit-callback") {
    const rawPayload = await readRawBody(request);
    const rawPayloadObj = JSON.parse(rawBody) as Record<string, unknown>;

    const plisioSecret = process.env.PLISIO_API_KEY?.trim();
    if (!plisioSecret) {
      console.error("PLISIO_API_KEY not configured for deposit callback verification");
      sendJson(response, 500, { error: "Server configuration error" });
      return;
    }

    const crypto = require("node:crypto");
    const normalizedPayload = { ...rawPayloadObj };
    delete normalizedPayload.verify_hash;
    const expected = crypto.createHmac("sha1", plisioSecret).update(JSON.stringify(normalizedPayload)).digest("hex");
    const received = asString(rawPayloadObj.verify_hash)?.replace(/^sha1=/i, "");
    if (!received) {
      sendJson(response, 401, { error: "Invalid Plisio callback signature" });
      return;
    }

    const expectedBuf = Buffer.from(expected, "hex");
    const receivedBuf = Buffer.from(received, "hex");
    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      sendJson(response, 401, { error: "Invalid Plisio callback signature" });
      return;
    }

    // Extract deposit data from callback (inline normalization)
    const data = typeof rawPayloadObj.data === "object" && rawPayloadObj.data !== null ? rawPayloadObj.data : {};
    const operationId = asString(data.id) ?? asString(rawPayloadObj.id);
    const status = asString(data.status) ?? asString(rawPayloadObj.status);
    const amount = asNumber(data.amount) ?? asNumber(rawPayloadObj.amount);
    const currency = asString(data.currency) ?? asString(rawPayloadObj.currency);
    const address = asString(data.address) ?? asString(rawPayloadObj.address);
    const fee = asNumber(data.fee) ?? asNumber(rawPayloadObj.fee);
    const txHash = asString(data.tx_hash) ?? asString(rawPayloadObj.hash) ?? asString(rawPayloadObj.tx_hash);

    if (!operationId) {
      sendJson(response, 400, { error: "Missing operation ID in callback" });
      return;
    }

    // Find the deposit instruction by Plisio operation ID
    const depositRows = await query(
      "select * from crypto_deposit_instructions where plisio_txn_id = $1 order by created_at desc limit 1",
      [operationId],
    );

    const depositInstruction = depositRows[0];
    if (!depositInstruction) {
      console.warn("Plisio deposit callback: deposit instruction not found", { operationId });
      sendJson(response, 200, { ok: true, message: "Instruction not found, callback acknowledged" });
      return;
    }

    const requestId = String(depositInstruction.id);
    const now = new Date().toISOString();
    const lowerStatus = String(status ?? "").toLowerCase();

    const plisioCompletedStatuses = ["completed", "finished", "confirmed"];
    const plisioFailedStatuses = ["error", "expired", "cancelled", "rejected", "failed"];

    // Prevent duplicate processing
    if (lowerStatus === "credited" || lowerStatus === "completed") {
      // Already processed - just acknowledge
      await query(
        `update crypto_deposit_instructions
           set callback_received_at = $1,
             status = $2,
             updated_at = $3,
             plisio_txn_id = $4,
             transaction_hash = $5,
             callback_payload = $6
         where id = $7`,
        [now, lowerStatus, now, operationId, txHash ?? null, rawPayloadObj, requestId],
      );
      sendJson(response, 200, { ok: true, status: "already_processed", request_id: requestId });
      return;
    }

    if (plisioCompletedStatuses.includes(lowerStatus)) {
      // Payment completed - credit the user
      const userId = String(depositInstruction.user_id);
      const cryptoCurrency = String(depositInstruction.cryptocurrency ?? "");
      const network = String(depositInstruction.network ?? "");
      const requestedAmount = Number(depositInstruction.requested_amount ?? 0);

      // Update deposit status
      await query(
        `update crypto_deposit_instructions
           set completed_at = $1,
             status = $2,
             updated_at = $3,
             plisio_txn_id = $4,
             transaction_hash = $5,
             callback_payload = $6
         where id = $7`,
        [now, lowerStatus, now, operationId, txHash ?? null, rawPayloadObj, requestId],
      );

      // Credit the user's balance
      await query(
        `update profiles
           set balance = balance + $1,
             total_deposit = total_deposit + $1,
             updated_at = $2
         where id = $3`,
        [requestedAmount, now, userId],
      );

      // Create notification
      await rpc("create_notification_internal", {
        p_data: {
          amount: requestedAmount,
          method: `CRYPTO ${cryptoCurrency.toUpperCase()} (${network.toUpperCase()})`,
          plisio_operation_id: operationId,
          tx_hash: txHash,
          deposit_id: requestId,
        },
        p_external_key: `deposit:${requestId}:completed`,
        p_link_url: "/deposit",
        p_message: `Your deposit of $${requestedAmount.toFixed(2)} has been completed successfully. Transaction: ${txHash ?? operationId}`,
        p_title: "Deposit completed",
        p_type: "deposit_completed",
        p_user_id: userId,
      });

      sendJson(response, 200, { ok: true, status: "completed", request_id: requestId });
      return;
    }

    if (plisioFailedStatuses.includes(lowerStatus)) {
      // Payment failed
      await query(
        `update crypto_deposit_instructions
           set failed_at = $1,
             status = $2,
             updated_at = $3,
             plisio_txn_id = $4,
             callback_payload = $5
         where id = $6`,
        [now, lowerStatus, now, operationId, rawPayloadObj, requestId],
      );

      sendJson(response, 200, { ok: true, status: "failed", request_id: requestId });
      return;
    }

    // Update status to processing or other pending state
    await query(
      `update crypto_deposit_instructions
         set status = $1,
           updated_at = $2,
           plisio_txn_id = $3,
           callback_payload = $4
       where id = $5`,
      [lowerStatus, now, operationId, rawPayloadObj, requestId],
    );

    sendJson(response, 200, { ok: true, status: "pending", request_id: requestId });
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}