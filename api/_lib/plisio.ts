import type { Json } from "../../src/integrations/supabase/types.js";

type JsonObject = { [key: string]: Json | undefined };

import { createHmac, timingSafeEqual } from "node:crypto";

let cachedPlisioApiKey: string | null = null;

const getPlisioApiKey = () => {
  if (cachedPlisioApiKey) return cachedPlisioApiKey;
  const key = process.env.PLISIO_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing required environment variable: PLISIO_API_KEY");
  }
  cachedPlisioApiKey = key;
  return key;
};

const getPlisioBaseUrl = () => "https://api.plisio.net/api/v1";

// Build an absolute Plisio URL that preserves the /api/v1 prefix. Passing a
// path to new URL() against a base that already has a path (e.g. ".../api/v1")
// silently replaces the whole path, producing ".../currencies/USD" instead of
// ".../api/v1/currencies/USD". Always append instead.
const buildPlisioUrl = (path: string) => {
  const url = new URL(`${getPlisioBaseUrl()}${path}`);
  url.searchParams.set("json", "true");
  return url;
};

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
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

const parseJsonResponse = async (response: Response) => {
  try {
    return (await response.json()) as JsonObject;
  } catch {
    return null;
  }
};

const sendPlisioRequest = async (path: string, payload: Record<string, unknown>) => {
  const apiKey = getPlisioApiKey();
  const url = buildPlisioUrl(path);
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);

  const status = asString(data?.status);
  const error = asString(data?.error) || asString(data?.message);

  if (!response.ok || status !== "success") {
    throw new Error(error || `Plisio returned HTTP ${response.status}`);
  }

  return data?.data as JsonObject ?? {};
};

export const requestPlisioPayout = async ({
  amount,
  currency,
  address,
  memo,
  orderId,
  callbackUrl,
}: {
  amount: number;
  currency: string;
  address: string;
  memo?: string | null;
  orderId: string;
  callbackUrl: string;
}) => {
  const payload: Record<string, unknown> = {
    amount: amount.toFixed(8),
    currency,
    address: address.trim(),
    order_number: orderId,
    callback_url: callbackUrl,
  };

  if (memo) {
    payload.memo = memo.trim();
  }

  return sendPlisioRequest("/operations/withdraw", payload);
};

export const checkPlisioOperationStatus = async (operationId: string) => {
  const apiKey = getPlisioApiKey();
  const url = buildPlisioUrl(`/operations/${operationId}`);
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), { method: "GET" });
  const data = await parseJsonResponse(response);

  const status = asString(data?.status);
  const error = asString(data?.error) || asString(data?.message);

  if (!response.ok || status !== "success") {
    throw new Error(error || `Plisio status check returned HTTP ${response.status}`);
  }

  return data?.data as JsonObject ?? {};
};

// -------------------------------------------------------------------
// Plisio supported-currency info (minimums + live USD rates + official icons)
// -------------------------------------------------------------------
let cachedPlisioCurrencies: { at: number; byCode: Record<string, JsonObject> } | null = null;
const PLISIO_CURRENCIES_TTL_MS = 10 * 60 * 1000;

export const fetchPlisioCurrencies = async (): Promise<Record<string, JsonObject>> => {
  if (cachedPlisioCurrencies && Date.now() - cachedPlisioCurrencies.at < PLISIO_CURRENCIES_TTL_MS) {
    return cachedPlisioCurrencies.byCode;
  }

  const apiKey = getPlisioApiKey();
  const url = buildPlisioUrl("/currencies/USD");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), { method: "GET" });
  const payload = await parseJsonResponse(response);

  const status = asString(payload?.status);
  if (!response.ok || status !== "success") {
    const error =
      asString(payload?.error) || asString(payload?.message) || `Plisio returned HTTP ${response.status}`;
    throw new Error(error);
  }

  const list = payload?.data;
  if (!Array.isArray(list)) {
    throw new Error("Plisio returned an unexpected currencies payload.");
  }

  const byCode: Record<string, JsonObject> = {};
  for (const entry of list) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as JsonObject;
    const code = (asString(row.cid) ?? asString(row.currency))?.toUpperCase();
    if (code) byCode[code] = row;
  }

  cachedPlisioCurrencies = { at: Date.now(), byCode };
  return byCode;
};

export const fetchPlisioCurrencyInfo = async (plisioCode: string): Promise<JsonObject> => {
  const byCode = await fetchPlisioCurrencies();
  const row = byCode[plisioCode.toUpperCase()];
  if (!row) {
    throw new Error(`Plisio does not support the ${plisioCode.toUpperCase()} currency.`);
  }
  return row;
};

export const verifyPlisioCallback = (payload: Record<string, unknown>, secret: string) => {
  const normalizedPayload = { ...payload };
  delete normalizedPayload.verify_hash;

  const expected = createHmac("sha1", secret).update(JSON.stringify(normalizedPayload)).digest("hex");

  const received = asString(payload.verify_hash)?.replace(/^sha1=/i, "");
  if (!received) return false;

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(received, "hex");

  return expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf);
};

export const buildPlisioCallbackUrl = (path: string) => {
  const baseUrl = process.env.PLISIO_CALLBACK_BASE_URL?.trim() || process.env.APP_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("Set PLISIO_CALLBACK_BASE_URL or APP_BASE_URL before using Plisio callbacks.");
  }
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL(path.replace(/^\//, ""), normalizedBase);
  return url.toString();
};

export const fetchPlisioDeposit = async ({
  apiKey,
  psysCid,
  uid,
  callbackUrl,
}: {
  apiKey: string;
  psysCid: string;
  uid: string;
  callbackUrl: string;
}) => {
  const url = new URL("https://api.plisio.net/api/v1/shops/deposit/new");
  url.searchParams.set("json", "true");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("psys_cid", psysCid);
  url.searchParams.set("uid", uid);
  url.searchParams.set("callback_url", callbackUrl);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const rawText = await response.text();
  let data: JsonObject | null = null;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = null;
  }

  if (!response.ok || !data || asString(data.status) !== "success") {
    const errorMsg =
      asString(data?.error) || asString(data?.message) || `Plisio returned HTTP ${response.status}`;
    console.error("Plisio deposit request failed", { httpStatus: response.status, body: rawText.slice(0, 500) });
    throw new Error(errorMsg || "Plisio returned an unexpected response");
  }

  return data;
};

export const normalizePlisioPayoutPayload = (payload: Record<string, unknown>) => {
  const data = (payload.data as JsonObject) ?? {};
  const dataId = asString(data.id) ?? asString(payload.id);
  const dataStatus = asString(data.status) ?? asString(payload.status);
  const dataAmount = asNumber(data.amount) ?? asNumber(payload.amount);
  const dataCurrency = asString(data.currency) ?? asString(payload.currency);
  const dataAddress = asString(data.address) ?? asString(payload.address);
  const dataFee = asNumber(data.fee) ?? asNumber(payload.fee);
  const dataTxHash = asString(data.tx_hash) ?? asString(data.hash);
  const dataOrderNumber = asString(data.order_number) ?? asString(payload.order_number);

  return {
    operationId: dataId,
    status: dataStatus,
    amount: dataAmount,
    currency: dataCurrency,
    address: dataAddress,
    fee: dataFee,
    txHash: dataTxHash,
    orderNumber: dataOrderNumber,
    rawPayload: payload,
  };
};