import { rpc, withUser } from "../_lib/db.js";
import { getClerkUserId } from "../profile.js";

type ApiRequest = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string>;
};

type ApiResponse = {
  json: (body: unknown) => void;
  status: (statusCode: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const method = (request.method || "GET").toUpperCase();
  const funcName = Array.isArray(request.query?.name) ? request.query.name[0] : request.query?.name;

  if (!funcName) {
    response.status(400).json({ error: "Missing function name" });
    return;
  }

  const userId = getClerkUserId(request);

  if (method === "GET") {
    const result = await withUser(userId, async (client) => {
      const res = await client.query(`SELECT * FROM ${funcName}()`);
      return res.rows;
    });
    response.status(200).json({ data: result });
    return;
  }

  if (method === "POST") {
    const payload = (request.body as Record<string, unknown>) ?? {};
    const result = await withUser(userId, async (client) => {
      const res = await rpc(funcName, payload);
      return res;
    });
    response.status(200).json({ data: result[0] ?? result });
    return;
  }

  response.setHeader("Allow", "GET, POST");
  response.status(405).json({ error: "Method not allowed" });
}
