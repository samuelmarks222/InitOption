import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonRequestBody } from "../_lib/sasapay.js";
import { rpc } from "../_lib/db.js";
import { authenticateRequest, clerkUserIdToUuid } from "../_lib/clerkWebhook.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

type RequestPayload = {
  withdrawal_request_id?: string;
  code?: string;
};

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
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

  try {
    const body = (await readJsonRequestBody(request)) as Record<string, unknown> & RequestPayload;
    const withdrawalRequestId = asString(body.withdrawal_request_id ?? null);
    const code = asString(body.code ?? null);

    const clerkUserId = await authenticateRequest(request.headers);
    if (!clerkUserId) {
      sendJson(response, 401, { error: "Missing or invalid Bearer token." });
      return;
    }

    if (!withdrawalRequestId) {
      sendJson(response, 400, { error: "withdrawal_request_id is required." });
      return;
    }

    if (!code) {
      sendJson(response, 400, { error: "code is required." });
      return;
    }

    const rows = await rpc("verify_withdrawal_code", {
      p_withdrawal_request_id: withdrawalRequestId,
      p_code: code,
    });

    sendJson(response, 200, rows[0] ?? { status: "verified" });
  } catch (error) {
    console.error("Verify withdrawal code failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to verify code.",
    });
  }
}

const asString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};