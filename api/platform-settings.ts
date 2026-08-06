import { getClerkUserId } from "../profile/index.js";

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

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const method = (request.method || "GET").toUpperCase();
  const route = Array.isArray(request.query?.route) ? request.query.route[0] : request.query?.route;

  if (method === "GET" && route === "/public") {
    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    response.status(200).json({
      data: {
        id: "default",
        feature_flags: "{}",
        branding: "{}",
        site_name: "InitOption",
        tagline: "Trading Platform",
      }
    });
    return;
  }

  const userId = getClerkUserId(request);

  if (method === "POST") {
    const body = (request.body ?? {}) as Record<string, unknown>;

    if (route === "signup" || body.email) {
      // Signup handled by Clerk client-side; this route is for custom email/password
      // that's managed by Clerk's backend API
      response.status(200).json({ data: { ok: true } });
      return;
    }

    if (route === "signin") {
      response.status(200).json({ data: { ok: true } });
      return;
    }

    if (route === "reset-password") {
      response.status(200).json({ data: { ok: true } });
      return;
    }
  }

  response.setHeader("Allow", "GET, POST");
  response.status(405).json({ error: "Method not allowed" });
}
