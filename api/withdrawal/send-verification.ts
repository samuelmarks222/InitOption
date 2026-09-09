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
    const body = (await readJsonRequestBody(request)) as RequestPayload;
    const withdrawalRequestId = asString(body.withdrawal_request_id ?? null);

    const clerkUserId = await authenticateRequest(request.headers);
    if (!clerkUserId) {
      sendJson(response, 401, { error: "Missing or invalid Bearer token." });
      return;
    }

    if (!withdrawalRequestId) {
      sendJson(response, 400, { error: "withdrawal_request_id is required." });
      return;
    }

    const userId = clerkUserIdToUuid(clerkUserId);

    // Verify the withdrawal request belongs to the user
    const rows = await rpc("send_withdrawal_verification_code", {
      p_withdrawal_request_id: withdrawalRequestId,
    });

    sendJson(response, 200, rows[0] ?? { status: "sent" });
  } catch (error) {
    console.error("Send withdrawal verification failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to send verification code.",
    });
  }
}