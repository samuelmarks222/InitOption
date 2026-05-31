import type { IncomingMessage, ServerResponse } from "node:http";
import { getHeaderValue } from "../../src/lib/cryptoWebhook.js";
import { readJsonRequestBody } from "../_lib/sasapay.js";
import { getSupabaseAdminClient, getSupabaseUserClient } from "../_lib/supabaseAdmin.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const parseBearerToken = (authorizationHeader: string) => {
  const trimmed = authorizationHeader.trim();
  if (!trimmed) return null;
  const [scheme, token] = trimmed.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const maybeMessage = "message" in error && typeof error.message === "string" ? error.message : null;
    const maybeDetails = "details" in error && typeof error.details === "string" ? error.details : null;
    const maybeHint = "hint" in error && typeof error.hint === "string" ? error.hint : null;
    return [maybeMessage, maybeDetails, maybeHint].filter(Boolean).join(" ");
  }
  return typeof error === "string" ? error : "";
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = (await readJsonRequestBody(request)) as { requestId?: string };
    const requestId = body.requestId?.trim();
    const accessToken = parseBearerToken(getHeaderValue(request.headers, "authorization"));

    if (!accessToken) {
      sendJson(response, 401, { error: "Missing Bearer token." });
      return;
    }

    if (!requestId) {
      sendJson(response, 400, { error: "requestId is required." });
      return;
    }

    const userClient = getSupabaseUserClient(accessToken);
    const authResponse = await userClient.auth.getUser();

    if (authResponse.error || !authResponse.data.user?.id) {
      sendJson(response, 401, { error: "Invalid authentication token." });
      return;
    }

    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient.rpc("cancel_withdrawal", {
      p_request_id: requestId,
    });

    if (error) {
      sendJson(response, 400, { error: getErrorMessage(error) || "Failed to cancel withdrawal." });
      return;
    }

    sendJson(response, 200, data as Record<string, unknown>);
  } catch (error) {
    console.error("Withdrawal cancellation failed", error);
    sendJson(response, 500, {
      error: getErrorMessage(error) || "Failed to cancel withdrawal.",
    });
  }
}
