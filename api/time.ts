import type { ApiRequest, ApiResponse } from '../_lib/newApi';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const timestamp = Math.floor(Date.now() / 1000);
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.setHeader('Content-Type', 'application/json');
  response.status(200).json({ timestamp });
}