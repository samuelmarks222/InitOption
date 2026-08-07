import type { IncomingMessage, ServerResponse } from "node:http";
import { transaction } from "./_lib/db.js";
import { clerkUserIdToUuid, authenticateRequest } from "./_lib/clerkWebhook.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = ServerResponse<IncomingMessage>;

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

const IS_VALID_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const extractFunctionName = (request: ApiRequest): string | null => {
  const fromQuery = request.query?.fn ?? request.query?.name;
  const qName = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
  if (typeof qName === "string" && qName.trim().length > 0) return qName.trim();

  const pathname = (request.url || "").split("?")[0];
  const prefixes = ["/api/rpc/", "/rpc/"];
  for (const prefix of prefixes) {
    if (pathname.startsWith(prefix)) {
      const segment = pathname.slice(prefix.length);
      const first = segment.split("/")[0];
      if (first) return first;
    }
  }

  return null;
};

const normalizeResult = (rows: Array<Record<string, unknown>>): unknown => {
  if (rows.length === 0) return null;
  if (rows.length === 1) {
    const record = rows[0];
    const keys = Object.keys(record);
    // Single-function set-returning rows typically expose one column (often a
    // jsonb value). Unwrap it so the client receives e.g. `{status: "sent"}`.
    return keys.length === 1 ? record[keys[0]] : record;
  }
  return rows;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const functionName = extractFunctionName(request);
    if (!functionName || !IS_VALID_IDENTIFIER.test(functionName)) {
      sendJson(response, 400, { error: "Invalid RPC function name" });
      return;
    }

    const clerkUserId = await authenticateRequest(request.headers);
    if (!clerkUserId) {
      sendJson(response, 401, { error: "Unauthorized" });
      return;
    }

    const rawBody = await readRawBody(request);
    let args: Record<string, unknown> = {};
    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          args = parsed as Record<string, unknown>;
        }
      } catch {
        // No JSON body; treat as no arguments.
      }
    }

    const mappedId = clerkUserIdToUuid(clerkUserId);
    const keys = Object.keys(args);

    const result = await transaction(async (client) => {
      await client.query("SET LOCAL app.current_user_id = $1", [mappedId]);

      let sql: string;
      const values: unknown[] = [];
      if (keys.length === 0) {
        sql = `SELECT * FROM ${functionName}()`;
      } else {
        const assignments = keys.map((key, index) => `${key} := $${index + 1}`).join(", ");
        values.push(...keys.map((key) => args[key]));
        sql = `SELECT * FROM ${functionName}(${assignments})`;
      }

      return client.query(sql, values);
    });

    sendJson(response, 200, { data: normalizeResult(result.rows) });
  } catch (error) {
    console.error("RPC failed", error);
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Failed to execute function",
    });
  }
}