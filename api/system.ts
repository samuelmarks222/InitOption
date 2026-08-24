import type { IncomingMessage, ServerResponse } from "node:http";

export default async function handler(_request: IncomingMessage, response: ServerResponse) {
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify({ ok: true, trivial: true, ts: Date.now() }));
}
