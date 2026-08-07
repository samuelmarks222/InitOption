import type { IncomingMessage, ServerResponse } from "node:http";
import { pusherServer } from "../../src/lib/pusherServer.js";

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

const readRawBody = async (request: ApiRequest): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const rawBody = await readRawBody(request);
    const body = JSON.parse(rawBody);
    const { socket_id, channel_name } = body;

    if (!socket_id || !channel_name) {
      sendJson(response, 400, { error: "Missing socket_id or channel_name" });
      return;
    }

    const auth = pusherServer.authenticate(socket_id, channel_name);

    sendJson(response, 200, auth as unknown as Record<string, unknown>);
  } catch (error) {
    console.error("Pusher auth failed:", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Auth failed",
    });
  }
}