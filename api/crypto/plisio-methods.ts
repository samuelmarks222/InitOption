import type { IncomingMessage, ServerResponse } from "node:http";
import type { Json } from "../../src/integrations/supabase/types.js";
import { mapCryptoMethodToPlisioCurrency } from "../../src/lib/plisio.js";
import { fetchPlisioCurrencies } from "../_lib/plisio.js";
import { authenticateRequest } from "../_lib/clerkWebhook.js";

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

const asString = (value: Json | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const asNumber = (value: Json | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
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
}