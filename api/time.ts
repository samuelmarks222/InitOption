import type { IncomingMessage, ServerResponse } from "node:http";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = ServerResponse<IncomingMessage>;

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const timestamp = Math.floor(Date.now() / 1000);
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  response.setHeader("Content-Type", "application/json");
  response.statusCode = 200;
  response.end(JSON.stringify({ timestamp }));
}
