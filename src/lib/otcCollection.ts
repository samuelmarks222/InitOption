import { getAppwriteIdToken } from '@/integrations/appwrite/authService';
import type { OTCCollectionStatus, OTCCollectionCycle } from '@/types/otcCollection';
async function request<T>(action: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const send = async (refresh: boolean) => {
    const token = await getAppwriteIdToken(refresh);
    if (!token) throw new Error('Sign in with an administrator account to manage collection.');
    return fetch(`/api/otc?action=${action}`, {
      method, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };
  let response = await send(false);
  if (response.status === 401) response = await send(true);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Collection cycle failed. Refresh status for details.');
  return payload as T;
}
export const getOTCCollectionStatus = () => request<OTCCollectionStatus>('collection-settings', 'GET');
export const setOTCCollectionEnabled = (enabled: boolean) => request<OTCCollectionStatus>('collection-settings', 'POST', { enabled });
export const runOTCCollection = () => request<OTCCollectionCycle>('collection-run', 'POST');
