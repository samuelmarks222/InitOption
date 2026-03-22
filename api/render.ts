import { renderSeoHtml } from "./_lib/platformSettings";

type ApiRequest = {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  end: (body?: string) => void;
  send: (body: string) => void;
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => ApiResponse;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const html = await renderSeoHtml(request);

    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "no-store, max-age=0");

    if (request.method === "HEAD") {
      response.status(200);
      response.end();
      return;
    }

    response.status(200).send(html);
  } catch (error) {
    console.error("Failed to render SEO shell", error);
    response.status(500).send("Failed to render app shell.");
  }
}
