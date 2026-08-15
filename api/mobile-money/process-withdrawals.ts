import type { IncomingMessage, ServerResponse } from "node:http";
import { getHeaderValue } from "../../src/lib/cryptoWebhook.js";
import { processApprovedMobileMoneyWithdrawals } from "../_lib/mobileMoneyWithdrawalQueue.js";

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

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "GET" && request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const configuredSecret = process.env.CRON_SECRET?.trim();
  const authHeader = getHeaderValue(request.headers, "authorization");

  if (configuredSecret && authHeader !== `Bearer ${configuredSecret}`) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const results = await processApprovedMobileMoneyWithdrawals({ limit: 10 });
    sendJson(response, 200, { ok: true, ...results });
  } catch (error) {
    console.error("Scheduled mobile money withdrawal processing failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to process queued withdrawals.",
    });
  }
}
