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
  new_email?: string;
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
    const body = (await readJsonRequestBody(request)) as Record<string, unknown> & {
      new_email?: string;
      code?: string;
    };
    const newEmail = asString(body.new_email ?? null);
    const code = asString(body.code ?? null);

    const clerkUserId = await authenticateRequest(request.headers);
    if (!clerkUserId) {
      sendJson(response, 401, { error: "Missing or invalid Bearer token." });
      return;
    }

    if (!newEmail) {
      sendJson(response, 400, { error: "new_email is required." });
      return;
    }

    if (!body.code) {
      sendJson(response, 400, { error: "code is required." });
      return;
    }

    const rows = await rpc("verify_email_change_code", {
      p_new_email: newEmail,
      p_code: code,
    });

    sendJson(response, 200, rows[0] ?? { status: "verified" });
  } catch (error) {
    console.error("Verify email change code failed", error);
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