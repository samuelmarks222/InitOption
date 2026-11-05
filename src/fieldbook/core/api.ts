/** A typed boundary for future server APIs. No credentials belong in this module. */
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, 'https://fieldbook.invalid');
  if (url.origin !== 'https://fieldbook.invalid' || !url.pathname.startsWith('/api/fieldbook/')) throw new Error('Invalid Fieldbook API path');
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  const response = await fetch(`${url.pathname}${url.search}`, { ...init, headers });
  if (!response.ok) throw new ApiError(response.status, 'Service unavailable. Please try again later.');
  return response.json() as Promise<T>;
}
