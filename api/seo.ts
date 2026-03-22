import { buildSeoPayload } from "./_lib/platformSettings";

type ApiRequest = {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  end: (body?: string) => void;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => ApiResponse;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const payload = await buildSeoPayload(request);

    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store, max-age=0");

    if (request.method === "HEAD") {
      response.status(200);
      response.end();
      return;
    }

    response.status(200).json(payload);
  } catch (error) {
    console.error("Failed to return SEO payload", error);
    response.status(500).json({
      error: "Failed to read SEO settings.",
    });
  }
}
