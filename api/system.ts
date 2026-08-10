import type { IncomingMessage, ServerResponse } from "node:http";
import systemHandler from "./_lib/systemHandler.js";
import {
  handleDb,
  handleRpc,
  handleProfile,
  handlePlatformSettings,
  handleCloudinaryUpload,
  handleCloudinaryDelete,
  handleCloudinaryExists,
  handleCloudinaryPublicUrl,
   handlePusherAuth,
} from "./_lib/newApi.js";

type ApiRequest = IncomingMessage & {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = ServerResponse<IncomingMessage>;

const firstOf = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const res = response;
  const route = (firstOf(request.query?.route) ?? "").toLowerCase();

  try {
    switch (route) {
      case "db":
        await handleDb(request, res);
        return;
      case "rpc":
        await handleRpc(request, res);
        return;
      case "profile":
        await handleProfile(request, res);
        return;
      case "platform-settings":
        await handlePlatformSettings(request, res);
        return;
      case "cloudinary-upload":
        await handleCloudinaryUpload(request, res);
        return;
      case "cloudinary-delete":
        await handleCloudinaryDelete(request, res);
        return;
      case "cloudinary-exists":
        await handleCloudinaryExists(request, res);
        return;
      case "cloudinary-public-url":
        await handleCloudinaryPublicUrl(request, res);
        return;
        return;
      case "pusher-auth":
        await handlePusherAuth(request, res);
        return;
      default:
        // Legacy /api/system?resource=... behaviour
        await systemHandler(request as never, res as never);
    }
  } catch (error) {
    console.error("api dispatcher failed", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  }
}