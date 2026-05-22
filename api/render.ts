import { loadHtmlTemplate, renderSeoHtml } from "./_lib/platformSettings.js";

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

const setHtmlHeaders = (response: ApiResponse) => {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, max-age=0");
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const html = await renderSeoHtml(request);

    setHtmlHeaders(response);

    if (request.method === "HEAD") {
      response.status(200);
      response.end();
      return;
    }

    response.status(200).send(html);
  } catch (error) {
    console.error("Failed to render SEO shell", error);

    try {
      const fallbackHtml = await loadHtmlTemplate(request);
      setHtmlHeaders(response);

      if (request.method === "HEAD") {
        response.status(200);
        response.end();
        return;
      }

      response.status(200).send(fallbackHtml);
    } catch (fallbackError) {
      console.error("Failed to render fallback app shell", fallbackError);
      response.status(500).send("Failed to render app shell.");
    }
  }
}
