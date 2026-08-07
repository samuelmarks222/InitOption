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
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = ServerResponse<IncomingMessage>;

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const publicId = request.query?.public_id;
  const folder = request.query?.folder;

  if (!publicId || Array.isArray(publicId)) {
    sendJson(response, 400, { error: "Missing or invalid public_id parameter" });
    return;
  }

  try {
    const url = cloudinary.url(publicId, {
      secure: true,
      folder: folder as string ?? undefined,
    });

    sendJson(response, 200, { url });
  } catch (error) {
    console.error("Cloudinary URL generation failed:", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to generate URL",
    });
  }
}