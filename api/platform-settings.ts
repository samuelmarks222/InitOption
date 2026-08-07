import type { IncomingMessage, ServerResponse } from "node:http";
import { queryOne } from "./_lib/db.js";
import {
  DEFAULT_PLATFORM_SETTINGS,
  normalizePlatformSettings,
} from "../src/lib/platformMetadataShared.js";

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
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const row = await queryOne("select * from public.platform_settings order by created_at asc limit 1");
    const settings = row ? normalizePlatformSettings(row) : DEFAULT_PLATFORM_SETTINGS;
    sendJson(response, 200, { data: settings });
  } catch (error) {
    console.error("Platform settings fetch failed. Falling back to defaults.", error);
    sendJson(response, 200, { data: DEFAULT_PLATFORM_SETTINGS });
  }
}