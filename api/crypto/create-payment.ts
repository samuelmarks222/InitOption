import type { IncomingMessage, ServerResponse } from "node:http";
import type { Json, Tables } from "../../src/integrations/supabase/types.js";
import { getHeaderValue } from "../../src/lib/cryptoWebhook.js";
import { buildPlisioInstructionAddress, mapCryptoMethodToPlisioCurrency } from "../../src/lib/plisio.js";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { query, queryOne, rpc } from "../_lib/db.js";
import { authenticateRequest, clerkUserIdToUuid } from "../_lib/clerkWebhook.js";
import { resolveSelectedBonusOffer } from "../_lib/depositBonus.js";
import { fetchPlisioCurrencies } from "../_lib/plisio.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

type JsonObject = { [key: string]: Json | undefined };

type RequestPayload = {
  amount?: number;
  bonusOfferId?: string | null;
  instructionId?: string;
  paymentMethodId?: string;
  promoId?: string | null;
  useHostedCheckout?: boolean;
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

// Plisio returns provider-side minimum-amount rejections as opaque payloads like
// {"amount":"Invalid minimal amount attribute value, it must be greater than: 67114093.959731543625000000 SHIB"}.
// Detect that and surface a friendly, actionable message instead of the raw JSON.
// For any other failure, prefer Plisio's own data.message / data.name fields, then
// fall back to the raw response body so the real cause is never hidden.
const formatPlisioCheckoutError = (
  payload: JsonObject | null,
  rawText: string,
  httpStatus: number,
): string => {
  const payloadData = payload && typeof payload.data === "object" && payload.data && !Array.isArray(payload.data)
    ? (payload.data as JsonObject)
    : null;

  const raw =
    (payloadData &&
      (asString(payloadData.message) || asString(payloadData.error) || asString(payloadData.name))) ||
    asString(payload?.message) ||
    asString(payload?.error) ||
    (rawText && rawText.trim() ? rawText.trim().slice(0, 600) : "") ||
    `Plisio returned HTTP ${httpStatus}`;

  const minimalMatch = raw.match(/must be greater than:\s*([0-9]+(?:\.[0-9]+)?)\s+([A-Za-z0-9_]+)/i);
  if (minimalMatch) {
    const amount = Number(minimalMatch[1]);
    const symbol = minimalMatch[2].toUpperCase();
    const formattedAmount =
      Number.isFinite(amount) && amount > 0
        ? amount.toLocaleString("en-US", { maximumFractionDigits: 2 })
        : minimalMatch[1];
    return `The minimum deposit for ${symbol} is ${formattedAmount} ${symbol}. Please increase the deposit amount and try again.`;
  }

  if (httpStatus >= 500) {
    return `Plisio is currently unavailable (HTTP ${httpStatus}). Please try again in a few minutes.`;
  }

  return `Plisio hosted checkout creation failed (HTTP ${httpStatus}): ${raw}`;
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

  const rawText = await response.text();
  let payload: JsonObject | null = null;
  try {
    payload = JSON.parse(rawText) as JsonObject;
  } catch {
    payload = null;
  }

  const payloadData = payload && typeof payload.data === "object" && payload.data && !Array.isArray(payload.data)
    ? (payload.data as JsonObject)
    : null;

  if (!response.ok || !payload || asString(payload.status) !== "success") {
    console.error("Plisio hosted checkout creation failed", {
      httpStatus: response.status,
      responseBody: rawText,
    });
    throw new Error(formatPlisioCheckoutError(payload, rawText, response.status));
  }

  if (!payloadData) {
    throw new Error("Plisio hosted checkout returned an unexpected response.");
  }

  return payloadData;
};

// -------------------------------------------------------------------
// Plisio deposit callback / webhook
// -------------------------------------------------------------------
const findPlisioDepositInstruction = async (lookupValue: string, byDepositAddress = false) => {
  const rows = await query(
    `select ci.*, pm.symbol as method_symbol, pm.network as method_network
       from crypto_deposit_instructions ci
       left join crypto_payment_methods pm on pm.id = ci.payment_method_id
      where ${byDepositAddress ? "ci.deposit_address" : "ci.memo_value"} = $1
      order by ci.created_at desc
      limit 1`,
    [lookupValue],
  );
  return rows[0];
};

const handlePlisioDepositCallback = async (request: ApiRequest, response: ApiResponse) => {
  try {
    const rawBody = await readRawBody(request);

    let rawPayloadObj: Record<string, unknown>;
    try {
      rawPayloadObj = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      sendJson(response, 400, { error: "Invalid callback payload" });
      return;
    }

    const plisioSecret = process.env.PLISIO_IPN_SECRET?.trim() || process.env.PLISIO_API_KEY?.trim();
    if (!plisioSecret) {
      console.error("PLISIO_IPN_SECRET/PLISIO_API_KEY not configured for deposit callback verification");
      sendJson(response, 500, { error: "Server configuration error" });
      return;
    }

    const normalizedPayload = { ...rawPayloadObj };
    delete normalizedPayload.verify_hash;
    const expected = createHmac("sha1", plisioSecret).update(JSON.stringify(normalizedPayload)).digest("hex");
    const received = asString(rawPayloadObj.verify_hash)?.replace(/^sha1=/i, "");
    if (!received) {
      sendJson(response, 401, { error: "Invalid Plisio callback signature" });
      return;
    }

    const expectedBuf = Buffer.from(expected, "hex");
    const receivedBuf = Buffer.from(received, "hex");
    if (expectedBuf.length !== receivedBuf.length || !timingSafeEqual(expectedBuf, receivedBuf)) {
      sendJson(response, 401, { error: "Invalid Plisio callback signature" });
      return;
    }

    // Extract deposit data from callback (inline normalization)
    const data = (
      typeof rawPayloadObj.data === "object" && rawPayloadObj.data !== null ? rawPayloadObj.data : {}
    ) as Record<string, unknown>;
    const operationId = asString(data.id) ?? asString(rawPayloadObj.id);
    const invoiceId = asString(data.invoice_id) ?? asString(rawPayloadObj.invoice_id);
    const orderNumber = asString(data.order_number) ?? asString(rawPayloadObj.order_number);
    const status = asString(data.status) ?? asString(rawPayloadObj.status);
    const txHash = asString(data.tx_hash) ?? asString(rawPayloadObj.hash) ?? asString(rawPayloadObj.tx_hash);

    // Find the deposit instruction. Hosted-checkout callbacks may reference the
    // transaction id, the invoice id, or our own order number.
    let depositInstruction: Awaited<ReturnType<typeof query>>[number] | undefined;

    if (operationId) {
      depositInstruction = await findPlisioDepositInstruction(operationId);
    }

    if (!depositInstruction && invoiceId) {
      depositInstruction = await findPlisioDepositInstruction(invoiceId);
    }

    if (!depositInstruction && orderNumber) {
      depositInstruction = await findPlisioDepositInstruction(
        buildPlisioInstructionAddress(orderNumber),
        true,
      );
    }

    if (!depositInstruction) {
      console.warn("Plisio deposit callback: deposit instruction not found", { operationId, invoiceId, orderNumber });
      sendJson(response, 200, { ok: true, message: "Instruction not found, callback acknowledged" });
      return;
    }

    const requestId = String(depositInstruction.id);
    const now = new Date().toISOString();
    const lowerStatus = String(status ?? "").toLowerCase();
    const storedStatus = String(depositInstruction.instruction_status ?? "").toLowerCase();
    const plisioIds = operationId ?? invoiceId ?? orderNumber ?? null;

    // Prevent duplicate processing once the deposit has already been credited.
    if (storedStatus === "credited") {
      await query(
        `update crypto_deposit_instructions
           set updated_at = $1,
             detected_tx_hash = coalesce(nullif($2, ''), detected_tx_hash)
         where id = $3`,
        [now, txHash ?? "", requestId],
      );
      sendJson(response, 200, { ok: true, status: "already_processed", request_id: requestId });
      return;
    }

    const plisioCompletedStatuses = ["completed", "finished", "confirmed"];
    const plisioFailedStatuses = ["error", "rejected", "failed"];

    if (plisioCompletedStatuses.includes(lowerStatus)) {
      // Payment completed - credit the user
      const userId = String(depositInstruction.user_id);
      const cryptoCurrency = String(depositInstruction.method_symbol ?? "");
      const network = String(depositInstruction.method_network ?? "");
      const requestedAmount = Number(depositInstruction.expected_amount_usd ?? 0);

      // Update deposit status (idempotent: never re-credit)
      await query(
        `update crypto_deposit_instructions
           set instruction_status = $1,
             credited_at = $2,
             updated_at = $3,
             detected_tx_hash = $4
         where id = $5
           and instruction_status <> $6`,
        ["credited", now, now, txHash ?? null, requestId, "credited"],
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
          plisio_operation_id: plisioIds,
          tx_hash: txHash,
          deposit_id: requestId,
        },
        p_external_key: `deposit:${requestId}:completed`,
        p_link_url: "/deposit",
        p_message: `Your deposit of $${requestedAmount.toFixed(2)} has been completed successfully. Transaction: ${txHash ?? operationId ?? orderNumber}`,
        p_title: "Deposit completed",
        p_type: "deposit_completed",
        p_user_id: userId,
      });

      sendJson(response, 200, { ok: true, status: "credited", request_id: requestId });
      return;
    }

    if (lowerStatus === "expired" || lowerStatus === "cancelled" || plisioFailedStatuses.includes(lowerStatus)) {
      // Payment failed / cancelled / expired
      await query(
        `update crypto_deposit_instructions
           set instruction_status = $1,
             updated_at = $2
         where id = $3`,
        [lowerStatus === "expired" ? "expired" : "cancelled", now, requestId],
      );

      sendJson(response, 200, { ok: true, status: lowerStatus, request_id: requestId });
      return;
    }

    // Update status to processing or other pending state
    const detectedStatuses = ["payment_detected", "mempool", "underpaid"];
    const confirmingStatuses = ["confirming", "processing", "proceed"];
    let mappedStatus = "awaiting_payment";
    if (detectedStatuses.includes(lowerStatus)) {
      mappedStatus = "payment_detected";
    } else if (confirmingStatuses.includes(lowerStatus)) {
      mappedStatus = "confirming";
    }

    await query(
      `update crypto_deposit_instructions
         set instruction_status = $1,
           updated_at = $2,
           detected_tx_hash = coalesce(nullif($3, ''), detected_tx_hash)
       where id = $4`,
      [mappedStatus, now, txHash ?? "", requestId],
    );

    sendJson(response, 200, { ok: true, status: mappedStatus, request_id: requestId });
  } catch (error) {
    console.error("Plisio deposit callback failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to process deposit callback",
    });
  }
};

const handlePlisioMethods = async (request: ApiRequest, response: ApiResponse) => {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const clerkUserId = await authenticateRequest(request.headers);
  if (!clerkUserId) {
    sendJson(response, 401, { error: "Missing or invalid Bearer token." });
    return;
  }

  const url = new URL(request.url ?? "/", "http://localhost");
  const symbols = (url.searchParams.get("symbols") ?? "")
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  const networks = (url.searchParams.get("networks") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    sendJson(response, 400, { error: "symbols is required (comma-separated coin symbols)." });
    return;
  }

  if (networks.length !== symbols.length) {
    sendJson(response, 400, { error: "networks must list one entry per symbol." });
    return;
  }

  try {
    const byCode = await fetchPlisioCurrencies();

    const methods: Array<Record<string, unknown>> = [];
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const network = networks[i];

      const plisioCode = mapCryptoMethodToPlisioCurrency({ network, symbol });
      if (!plisioCode) continue;

      const info = byCode[plisioCode.toUpperCase()];
      if (!info) continue;

      const minAmountCoin = asNumber(info.min_sum_in);
      const priceUsd = asNumber(info.price_usd) ?? asNumber(info.fiat_rate);
      const rateUsd = asNumber(info.rate_usd) ?? (priceUsd && priceUsd > 0 ? 1 / priceUsd : null);

      const maintenance = asString(info.maintenance) === "true" || asNumber(info.maintenance) === 1;
      if (maintenance) continue;

      methods.push({
        symbol,
        network,
        plisio_code: plisioCode,
        name: asString(info.name) ?? plisioCode,
        icon: asString(info.icon) ?? null,
        precision: asNumber(info.precision),
        price_usd: priceUsd,
        rate_usd: rateUsd,
        min_amount_coin: minAmountCoin,
        min_amount_usd: minAmountCoin != null && priceUsd != null ? minAmountCoin * priceUsd : null,
        hidden_in_shop: asString(info.hidden) === "true" || asNumber(info.hidden) === 1,
      });
    }

    sendJson(response, 200, { ok: true, methods });
  } catch (error) {
    console.error("Failed to load Plisio currency information", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to load Plisio currency information.",
    });
  }
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  const urlPath = (request.url ?? "").replace(/^\/api/, "");

  // vercel.json rewrites /api/crypto/plisio-methods -> /api/crypto/create-payment?route=plisio-methods.
  if (
    requestUrl.searchParams.get("route") === "plisio-methods" ||
    urlPath.endsWith("/plisio-methods") ||
    urlPath === "/api/crypto/plisio-methods"
  ) {
    await handlePlisioMethods(request, response);
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  // Plisio callbacks must be handled before any deposit-creation logic so the
  // callback body is never mistaken for a new deposit request. vercel.json rewrites
  // /api/crypto/deposit-callback -> /api/crypto/create-payment?__callback=1, and the
  // direct path is also accepted so both routings resolve here.
  const isPlisioCallback = requestUrl.searchParams.get("__callback") === "1";
  if (isPlisioCallback || urlPath.endsWith("/deposit-callback") || urlPath === "/api/crypto/deposit-callback") {
    await handlePlisioDepositCallback(request, response);
    return;
  }

  // Read and parse request body once at the top level
  const rawBody = await readRawBody(request);
  const body = parseJsonBody(rawBody) as RequestPayload;

  const clerkUserId = await authenticateRequest(request.headers);
  if (!clerkUserId) {
    sendJson(response, 401, { error: "Missing or invalid Bearer token." });
    return;
  }
  const userId = clerkUserIdToUuid(clerkUserId);

  try {

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
        provider_payment_status: asString(plisioCheckout.status) || asString(instruction.instruction_status) || "new",
      },
    });
    return;
  }

  // -------------------------------------------------------------------
  // BRANCH 2: New deposit via Plisio hosted checkout (invoice redirect)
  // -------------------------------------------------------------------
  if (body.useHostedCheckout === true) {
    const { amount, paymentMethodId, cryptoCurrency, cryptoNetwork, bonusOfferId } = body as {
      amount?: number;
      paymentMethodId?: string;
      cryptoCurrency?: string;
      cryptoNetwork?: string;
      bonusOfferId?: string | null;
    };

    if (!amount || !Number.isFinite(amount) || Number(amount) <= 0) {
      sendJson(response, 400, { error: "Amount must be a positive number." });
      return;
    }

    if (!paymentMethodId) {
      sendJson(response, 400, { error: "Payment method is required." });
      return;
    }

    if (!cryptoCurrency || !cryptoNetwork) {
      sendJson(response, 400, { error: "Crypto currency and network are required." });
      return;
    }

    const plisioCurrency = mapCryptoMethodToPlisioCurrency({ network: cryptoNetwork, symbol: cryptoCurrency });
    if (!plisioCurrency) {
      sendJson(response, 400, { error: "Unsupported cryptocurrency/network combination." });
      return;
    }

    const paymentMethod = await queryOne(
      "select * from crypto_payment_methods where id = $1 and status = $2",
      [paymentMethodId, "active"],
    );
    if (!paymentMethod) {
      sendJson(response, 400, { error: "Selected crypto payment method is not active." });
      return;
    }

    const appBaseUrl = process.env.APP_BASE_URL?.trim() || getBaseAppUrl(request);
    const orderId = randomUUID();

    const plisioCheckout = await createPlisioHostedCheckout({
      allowedCurrencies: [plisioCurrency],
      amountUsd: Number(amount),
      callbackUrl: getPlisioCallbackUrl(request),
      currency: plisioCurrency,
      failInvoiceUrl: `${appBaseUrl}/deposit?checkout=plisio&status=failed`,
      orderId,
      successInvoiceUrl: `${appBaseUrl}/deposit?checkout=plisio&status=success`,
      userEmail: null,
    });

    const invoiceUrl = asString(plisioCheckout.invoice_url);
    if (!invoiceUrl) {
      throw new Error("Plisio did not return a hosted invoice URL.");
    }

    const plisioInvoiceId =
      asString(plisioCheckout.invoice_id) ?? asString(plisioCheckout.id) ?? asString(plisioCheckout.txn_id) ?? orderId;

    const now = new Date().toISOString();

    // Create the parent deposit request (crypto_deposit_instructions.deposit_request_id
    // is NOT NULL and references deposit_requests.id). The request id doubles as the
    // Plisio order number so callbacks always resolve back to this record.
    const depositRequestRow = await queryOne(
      `insert into deposit_requests (id, user_id, amount, method, payment_method_id, status)
       values ($1, $2, $3, $4, $5, $6)
       returning id`,
      [
        orderId,
        userId,
        Number(amount),
        `CRYPTO ${cryptoCurrency.toUpperCase()} (${cryptoNetwork.toUpperCase()})`,
        paymentMethodId,
        "pending",
      ],
    );
    if (!depositRequestRow) {
      throw new Error("Deposit request could not be created.");
    }

    const { bonusAmount, selectedOffer } = await resolveSelectedBonusOffer({
      amount: Number(amount),
      bonusOfferId: asString(bonusOfferId ?? null),
      userId,
    });

    if (selectedOffer) {
      const bonusUpdateRow = await queryOne(
        `update deposit_requests
            set bonus_offer_id = $1, promo_bonus = $2, updated_at = $3
          where id = $4 and user_id = $5 and status = $6
          returning id`,
        [selectedOffer.id, bonusAmount, now, orderId, userId, "pending"],
      );

      if (!bonusUpdateRow) {
        throw new Error("Deposit bonus reservation failed");
      }

      await query(
        `insert into deposit_bonus_redemptions
          (bonus_amount, bonus_offer_id, deposit_amount, deposit_request_id, status, user_id)
         values ($1, $2, $3, $4, $5, $6)`,
        [bonusAmount, selectedOffer.id, Number(amount), orderId, "reserved", userId],
      );
    }

    const inserted = await query(
      `insert into crypto_deposit_instructions (
         user_id, deposit_request_id, payment_method_id, instruction_status, deposit_address,
         expected_amount_usd, memo_value, required_confirmations, created_at, updated_at
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning id, created_at`,
      [
        userId,
        orderId,
        paymentMethodId,
        "awaiting_payment",
        buildPlisioInstructionAddress(orderId),
        Number(amount),
        plisioInvoiceId,
        Number(paymentMethod.confirmations_required ?? 1),
        now,
        now,
      ],
    );

    const instructionId = asString(inserted?.[0]?.id) ?? "";
    const createdAt = asString(inserted?.[0]?.created_at) ?? now;

    sendJson(response, 200, {
      ok: true,
      instruction: {
        address: buildPlisioInstructionAddress(orderId),
        amount: Number(amount),
        created_at: createdAt,
        deposit_request_id: orderId,
        hosted_checkout_url: invoiceUrl,
        instruction_id: instructionId,
        instruction_status: "awaiting_payment",
        memo_label: null,
        memo_value: null,
        payment_method_id: paymentMethodId,
        promo_bonus: bonusAmount,
        provider_name: "plisio",
        provider_order_id: orderId,
        provider_pay_amount: asNumber(plisioCheckout.invoice_total_sum) ?? Number(amount),
        provider_pay_currency:
          asString(plisioCheckout.currency) ||
          asString(plisioCheckout.psys_cid) ||
          plisioCurrency,
        provider_payment_id: plisioInvoiceId,
        provider_payment_status: asString(plisioCheckout.status) || "new",
      },
    });
    return;
  }

  // -------------------------------------------------------------------
  // BRANCH 3: New deposit via Plisio "Create a Deposit" API (no hosted checkout)
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

  if (!paymentMethodId) {
    sendJson(response, 400, { error: "Payment method is required." });
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
    "select deposit_address, memo_value as plisio_uid, updated_at from crypto_deposit_instructions where user_id = $1 and payment_method_id = $2 and instruction_status in ('awaiting_payment', 'payment_detected', 'confirming') order by created_at desc limit 1",
    [userId, paymentMethodId],
  );

  let plisioAddress: string;
  let operationId: string;

  if (existingAddress) {
    // Reuse existing address
    plisioAddress = asString(existingAddress.deposit_address) ?? "";
    operationId = asString(existingAddress.plisio_uid) || "";
    // Update the updated_at timestamp
    await query(
      "update crypto_deposit_instructions set updated_at = $1 where id = $2",
      [new Date().toISOString(), existingAddress.id],
    );
  } else {
    // Call Plisio Create a Deposit API inline (NO hosted checkout)
    const plisioCallbackUrl = `${process.env.APP_BASE_URL || getBaseAppUrl(request)}/api/crypto/deposit-callback`;

    const plisioUrl = new URL("/shops/deposit/new", "https://api.plisio.net/api/v1");
    plisioUrl.searchParams.set("api_key", getPlisioApiKey());
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
      sendJson(response, 500, { error: errorMsg });
      return;
    }

    // Extract address and operation ID from Plisio response
    plisioAddress = String(plisioData?.address ?? "");
    operationId = String(plisioData?.operation_id ?? "");

    if (!plisioAddress) {
      sendJson(response, 500, { error: "Plisio did not return a deposit address" });
      return;
    }

    // Save the deposit request and instruction record
    const depositRequestId = randomUUID();
    const now = new Date().toISOString();

    await queryOne(
      `insert into deposit_requests (id, user_id, amount, method, payment_method_id, status)
       values ($1, $2, $3, $4, $5, $6)
       returning id`,
      [
        depositRequestId,
        userId,
        Number(amount),
        `CRYPTO ${cryptoCurrency.toUpperCase()} (${cryptoNetwork.toUpperCase()})`,
        paymentMethodId,
        "pending",
      ],
    );

    await query(
      `insert into crypto_deposit_instructions (
         user_id, deposit_request_id, payment_method_id, instruction_status, deposit_address,
         expected_amount_usd, memo_value, created_at, updated_at
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        depositRequestId,
        paymentMethodId,
        "awaiting_payment",
        plisioAddress,
        Number(amount),
        operationId,
        now,
        now,
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
  return;
  } catch (error) {
    console.error("Crypto deposit request failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to process deposit request",
    });
  }
}
