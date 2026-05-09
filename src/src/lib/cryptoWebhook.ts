import { createHmac, timingSafeEqual } from "node:crypto";
import { buildPlisioInstructionAddress } from "./plisio.js";

type HeaderMap = Record<string, string | string[] | undefined>;

export interface NormalizedCryptoWebhookPayload {
  address: string;
  amountAsset: number | null;
  amountAssetSymbol: string | null;
  amountUsd: number | null;
  confirmations: number;
  eventStatus: string;
  externalEventId: string | null;
  memoValue: string | null;
  paymentMethodId: string | null;
  providerName: string | null;
  txHash: string;
}

const getFirstValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

const asIdString = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return asString(value);
};

const parseJsonRecord = (value: string | null) => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readPath = (payload: Record<string, unknown>, path: string): unknown => {
  const segments = path.split(".");
  let current: unknown = payload;

  for (const segment of segments) {
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
};

const findFirstValue = (payload: Record<string, unknown>, paths: string[]) => {
  for (const path of paths) {
    const value = readPath(payload, path);
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
};

const buildHexBuffer = (value: string, prefixPattern: RegExp) => {
  const normalized = value.trim().replace(prefixPattern, "");
  if (!normalized || normalized.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(normalized)) {
    return null;
  }

  return Buffer.from(normalized, "hex");
};

const buildBase64Buffer = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;

  try {
    const buffer = Buffer.from(normalized, "base64");
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
};

const signaturesMatch = (expected: Buffer, received: Buffer | null) =>
  Boolean(received && expected.length === received.length && timingSafeEqual(expected, received));

const isCoinPaymentsLegacyPayload = (payload: Record<string, unknown>) =>
  Boolean(
    asString(payload.ipn_type) ||
      asString(payload.ipn_mode) ||
      asString(payload.deposit_id) ||
      asString(payload.merchant),
  );

const mapCoinPaymentsLegacyStatus = (value: unknown) => {
  const numericStatus = asNumber(value);
  if (numericStatus === null) return null;
  if (numericStatus < 0) return "rejected";
  if (numericStatus >= 100 || numericStatus === 2) return "confirmed";
  if (numericStatus > 0) return "confirming";
  return "detected";
};

const getCoinPaymentsCustomPayload = (payload: Record<string, unknown>) => {
  return (
    parseJsonRecord(asString(payload.custom)) ||
    parseJsonRecord(asString(payload.invoice)) ||
    parseJsonRecord(asString(payload.item_number))
  );
};

const isNowPaymentsPayload = (payload: Record<string, unknown>) =>
  Boolean(
    asString(payload.pay_address) ||
      asString(payload.payment_status) ||
      (asIdString(payload.payment_id) && asString(payload.pay_currency)),
  );

const isPlisioPayload = (payload: Record<string, unknown>) =>
  Boolean(
    asString(payload.verify_hash) ||
      ((asString(payload.ipn_type) === "invoice" || asIdString(payload.txn_id)) &&
        asString(payload.order_number)),
  );

const mapNowPaymentsStatus = (value: unknown) => {
  const status = asString(value)?.toLowerCase();
  if (!status) return null;

  if (status === "waiting") return "detected";
  if (status === "confirming") return "confirming";
  if (status === "confirmed" || status === "finished" || status === "partially_paid" || status === "sending") {
    return "confirmed";
  }
  if (status === "failed" || status === "expired" || status === "refunded" || status === "rejected") {
    return "rejected";
  }

  return status;
};

const mapPlisioStatus = (value: unknown) => {
  const status = asString(value)?.toLowerCase();
  if (!status) return null;

  if (status === "new") return "detected";
  if (status === "pending") return "confirming";
  if (status === "pending internal" || status === "completed" || status === "mismatch") {
    return "confirmed";
  }
  if (status === "expired" || status === "error" || status === "cancelled" || status === "cancelled duplicate") {
    return "rejected";
  }

  return status;
};

const sortObjectKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => sortObjectKeysDeep(entry));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = sortObjectKeysDeep(value[key]);
      return result;
    }, {});
};

export const getHeaderValue = (headers: HeaderMap, name: string) => {
  const direct = headers[name];
  if (direct) return getFirstValue(direct);

  const matchedKey = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  return matchedKey ? getFirstValue(headers[matchedKey]) : "";
};

export const signCryptoWebhookPayload = (rawBody: string, secret: string) =>
  createHmac("sha256", secret).update(rawBody).digest("hex");

export const verifyCryptoWebhookSignature = (rawBody: string, signature: string, secret: string) => {
  if (!secret) return false;

  const expected = Buffer.from(signCryptoWebhookPayload(rawBody, secret), "hex");
  const received = buildHexBuffer(signature, /^sha256=/i);
  return signaturesMatch(expected, received);
};

export const signCoinPaymentsLegacyIpnPayload = (rawBody: string, secret: string) =>
  createHmac("sha512", secret).update(rawBody).digest("hex");

export const verifyCoinPaymentsLegacyIpnSignature = (rawBody: string, signature: string, secret: string) => {
  if (!secret) return false;

  const expected = Buffer.from(signCoinPaymentsLegacyIpnPayload(rawBody, secret), "hex");
  const received = buildHexBuffer(signature, /^sha512=/i);
  return signaturesMatch(expected, received);
};

export const signCoinPaymentsPayload = ({
  clientId,
  method,
  rawBody,
  secret,
  timestamp,
  url,
}: {
  clientId: string;
  method: string;
  rawBody: string;
  secret: string;
  timestamp: string;
  url: string;
}) => {
  const message = `\ufeff${method.toUpperCase()}${url}${clientId}${timestamp}${rawBody}`;
  return createHmac("sha256", secret).update(message).digest("base64");
};

export const verifyCoinPaymentsPayloadSignature = ({
  clientId,
  method,
  rawBody,
  secret,
  signature,
  timestamp,
  url,
}: {
  clientId: string;
  method: string;
  rawBody: string;
  secret: string;
  signature: string;
  timestamp: string;
  url: string;
}) => {
  if (!clientId || !secret || !timestamp) return false;

  const expected = Buffer.from(
    signCoinPaymentsPayload({
      clientId,
      method,
      rawBody,
      secret,
      timestamp,
      url,
    }),
    "base64",
  );
  const received = buildBase64Buffer(signature);
  return signaturesMatch(expected, received);
};

export const signNowPaymentsPayload = (payload: Record<string, unknown>, secret: string) => {
  const sortedPayload = sortObjectKeysDeep(payload);
  return createHmac("sha512", secret).update(JSON.stringify(sortedPayload)).digest("hex");
};

export const verifyNowPaymentsSignature = (
  payload: Record<string, unknown>,
  signature: string,
  secret: string,
) => {
  if (!secret) return false;

  const expected = Buffer.from(signNowPaymentsPayload(payload, secret), "hex");
  const received = buildHexBuffer(signature, /^sha512=/i);
  return signaturesMatch(expected, received);
};

export const signPlisioPayload = (payload: Record<string, unknown>, secret: string) => {
  const normalizedPayload = { ...payload };
  delete normalizedPayload.verify_hash;
  return createHmac("sha1", secret).update(JSON.stringify(normalizedPayload)).digest("hex");
};

export const verifyPlisioSignature = (
  payload: Record<string, unknown>,
  signature: string,
  secret: string,
) => {
  if (!secret) return false;

  const expected = Buffer.from(signPlisioPayload(payload, secret), "hex");
  const received = buildHexBuffer(signature, /^sha1=/i);
  return signaturesMatch(expected, received);
};

export const parseFormEncodedWebhookBody = (rawBody: string) =>
  Object.fromEntries(new URLSearchParams(rawBody).entries());

export const normalizeCryptoWebhookPayload = (payload: Record<string, unknown>): NormalizedCryptoWebhookPayload => {
  const coinPaymentsCustomPayload = getCoinPaymentsCustomPayload(payload);
  const nowPaymentsPayload = isNowPaymentsPayload(payload);
  const plisioPayload = isPlisioPayload(payload);
  const nowPaymentsStatus = nowPaymentsPayload
    ? mapNowPaymentsStatus(findFirstValue(payload, ["payment_status", "status"]))
    : null;
  const plisioStatus = plisioPayload ? mapPlisioStatus(findFirstValue(payload, ["status"])) : null;
  const plisioOrderNumber = asString(findFirstValue(payload, ["order_number"]));
  const providerNameFromPayload =
    asString(findFirstValue(payload, ["providerName", "provider", "gateway"])) ||
    asString(findFirstValue(coinPaymentsCustomPayload ?? {}, ["providerName", "provider", "gateway"]));

  const address =
    asString(
      findFirstValue(payload, [
        "address",
        "depositAddress",
        "destination",
        "walletAddress",
        "networkAddress",
        "pay_address",
        "wallet_hash",
        "data.address",
        "data.networkAddress",
        "transaction.address",
        "transaction.networkAddress",
      ]),
    ) ||
    asString(findFirstValue(coinPaymentsCustomPayload ?? {}, ["address", "depositAddress", "networkAddress"])) ||
    (plisioOrderNumber ? buildPlisioInstructionAddress(plisioOrderNumber) : null);
  const txHash =
    asString(
      findFirstValue(payload, [
        "txHash",
        "transactionHash",
        "hash",
        "txn_id",
        "txid",
        "txId",
        "send_tx",
        "payin_hash",
        "txn_id",
        "data.txHash",
        "data.hash",
        "transaction.txHash",
        "transaction.hash",
      ]),
    ) ||
    asString(findFirstValue(coinPaymentsCustomPayload ?? {}, ["txHash", "transactionHash", "hash", "txn_id"])) ||
    (nowPaymentsPayload
      ? (() => {
          const syntheticId = asIdString(findFirstValue(payload, ["payment_id", "purchase_id", "invoice_id"]));
          return syntheticId ? `nowpayments:${syntheticId}` : null;
        })()
      : plisioPayload
        ? (() => {
            const syntheticId = asIdString(findFirstValue(payload, ["txn_id", "switch_id", "id"]));
            return syntheticId ? `plisio:${syntheticId}` : null;
          })()
      : null);

  if (!address || !txHash) {
    throw new Error("Webhook payload must include both a destination address and a transaction hash.");
  }

  const legacyStatus =
    mapCoinPaymentsLegacyStatus(findFirstValue(payload, ["status"])) ||
    mapCoinPaymentsLegacyStatus(findFirstValue(payload, ["received_status"]));
  const nowPaymentsPriceCurrency = asString(findFirstValue(payload, ["price_currency"]))?.toLowerCase();
  const nowPaymentsPriceAmount = asNumber(findFirstValue(payload, ["price_amount"]));
  const nowPaymentsPaidAtFiat = asNumber(
    findFirstValue(payload, ["actually_paid_at_fiat", "amount_received_fiat", "payin_amount_fiat"]),
  );
  const nowPaymentsUsdAmount =
    nowPaymentsPaidAtFiat !== null && nowPaymentsPaidAtFiat > 0
      ? nowPaymentsPaidAtFiat
      : nowPaymentsPriceCurrency === "usd"
        ? nowPaymentsPriceAmount
        : null;
  const parsedConfirmations =
    asNumber(
      findFirstValue(payload, [
        "confirmations",
        "confirmationsCount",
        "confirms",
        "received_confirms",
        "payin_confirmations",
        "data.confirmations",
        "transaction.confirmations",
      ]),
    ) ?? asNumber(findFirstValue(coinPaymentsCustomPayload ?? {}, ["confirmations", "confirmationsCount"]));
  const nowPaymentsFinalStatus = nowPaymentsStatus === "confirmed";
  const plisioSourceCurrency = asString(findFirstValue(payload, ["source_currency"]))?.toLowerCase();
  const plisioSourceAmount = asNumber(findFirstValue(payload, ["source_amount"]));
  const plisioUsdAmount = plisioSourceCurrency === "usd" ? plisioSourceAmount : null;
  const resolvedConfirmations =
    parsedConfirmations ?? (nowPaymentsFinalStatus || plisioStatus === "confirmed" ? 1000 : 0);

  return {
    address,
    amountAsset:
      asNumber(
        findFirstValue(payload, [
          "amountAsset",
          "assetAmount",
          "actually_paid",
          "pay_amount",
          "outcome_amount",
          "amount",
          "amount2",
          "received_amount",
          "data.amount",
          "transaction.amount",
        ]),
      ) ??
      asNumber(findFirstValue(coinPaymentsCustomPayload ?? {}, ["amountAsset", "assetAmount", "amount"])) ??
      null,
    amountAssetSymbol:
      asString(
        findFirstValue(payload, [
          "amountAssetSymbol",
          "assetSymbol",
          "pay_currency",
          "outcome_currency",
          "currency",
          "currency2",
          "symbol",
          "data.currency",
          "transaction.currency",
        ]),
      ) ||
      asString(findFirstValue(coinPaymentsCustomPayload ?? {}, ["amountAssetSymbol", "assetSymbol", "currency", "symbol"])),
    amountUsd:
      asNumber(
        findFirstValue(payload, [
          "amountUsd",
          "usdAmount",
          "creditedAmountUsd",
          "fiat_amount",
          "amount1",
          "data.amountUsd",
          "transaction.amountUsd",
        ]),
      ) ??
      plisioUsdAmount ??
      nowPaymentsUsdAmount ??
      asNumber(findFirstValue(coinPaymentsCustomPayload ?? {}, ["amountUsd", "usdAmount", "creditedAmountUsd"])) ??
      null,
    confirmations: resolvedConfirmations,
    eventStatus:
      plisioStatus ||
      nowPaymentsStatus ||
      legacyStatus ||
      asString(findFirstValue(payload, ["eventStatus", "status", "status_text", "data.status", "transaction.status"])) ||
      "detected",
    externalEventId:
      asIdString(
        findFirstValue(payload, [
          "externalEventId",
          "eventId",
          "deposit_id",
          "ipn_id",
          "txn_id",
          "id",
          "payment_id",
          "purchase_id",
          "parent_payment_id",
          "invoice_id",
        ]),
      ) || asIdString(findFirstValue(coinPaymentsCustomPayload ?? {}, ["externalEventId", "eventId", "id"])),
    memoValue:
      asString(
        findFirstValue(payload, [
          "memoValue",
          "memo",
          "payin_extra_id",
          "destinationTag",
          "tag",
          "dest_tag",
          "data.tag",
          "transaction.tag",
        ]),
      ) ||
      asString(findFirstValue(coinPaymentsCustomPayload ?? {}, ["memoValue", "memo", "destinationTag", "tag", "dest_tag"])),
    paymentMethodId:
      asString(findFirstValue(payload, ["paymentMethodId", "cryptoPaymentMethodId"])) ||
      asString(findFirstValue(coinPaymentsCustomPayload ?? {}, ["paymentMethodId", "cryptoPaymentMethodId"])),
    providerName:
      providerNameFromPayload ||
      (plisioPayload
        ? "plisio"
        : nowPaymentsPayload
          ? "nowpayments"
          : isCoinPaymentsLegacyPayload(payload)
            ? "coinpayments"
            : null),
    txHash,
  };
};
