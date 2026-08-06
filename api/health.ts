// Simple health check endpoint
type ApiRequest = {
  method?: string;
};

type ApiResponse = {
  json: (body: unknown) => void;
  status: (statusCode: number) => ApiResponse;
};

export default async function handler(_request: ApiRequest, response: ApiResponse) {
  response.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
}
