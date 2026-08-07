import type { IncomingMessage, ServerResponse } from "node:http";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
  if (request.method !== "DELETE") {
    response.setHeader("Allow", "DELETE");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const rawBody = await readRawBody(request);
    const body = JSON.parse(rawBody);
    const { public_id } = body;

    if (!public_id || Array.isArray(public_id)) {
      sendJson(response, 400, { error: "Missing or invalid public_id" });
      return;
    }

    const result = await cloudinary.uploader.destroy(public_id);

    sendJson(response, 200, { result });
  } catch (error) {
    console.error("Cloudinary delete failed:", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Delete failed",
    });
  }
}