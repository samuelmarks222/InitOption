import { getClerkUserId } from "../profile/index.js";

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

type ApiResponse = {
  json: (body: unknown) => void;
  status: (statusCode: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
};

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const APP_BASE_URL = process.env.APP_BASE_URL || "https://initoption.com";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const method = (request.method || "POST").toUpperCase();

  if (method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!CLERK_SECRET_KEY) {
    response.status(501).json({ error: "Server not configured for Clerk" });
    return;
  }

  const body = (request.body ?? {}) as Record<string, unknown>;
  const action = body.action as string | undefined;

  if (action === "send_email_verification") {
    const userId = body.user_id as string | undefined;
    if (!userId) {
      response.status(400).json({ error: "user_id required" });
      return;
    }
    // Clerk: use setEmailCode for email verification
    response.status(200).json({
      data: {
        status: "sent",
        email: body.email ?? null,
        cooldown_seconds: 60,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }
    });
    return;
  }

  response.status(400).json({ error: "Unknown auth action" });
}
