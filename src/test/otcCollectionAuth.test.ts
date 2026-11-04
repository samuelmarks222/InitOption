import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticateVerifiedRequest } from '../../api/_lib/clerkWebhook';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('privileged collection identity verification',()=>{
  it('rejects raw UUIDs and unsigned JWT claims when authentication is unconfigured',async()=>{
    for(const key of ['APPWRITE_ENDPOINT','VITE_APPWRITE_ENDPOINT','NEXT_PUBLIC_APPWRITE_ENDPOINT','APPWRITE_PROJECT_ID','VITE_APPWRITE_PROJECT_ID','NEXT_PUBLIC_APPWRITE_PROJECT_ID'])vi.stubEnv(key,'');
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    const id='00000000-0000-4000-8000-000000000001';
    const forged=`e30.${Buffer.from(JSON.stringify({sub:id,user_id:id})).toString('base64url')}.fake`;
    expect(await authenticateVerifiedRequest({authorization:`Bearer ${id}`})).toBeNull();
    expect(await authenticateVerifiedRequest({authorization:`Bearer ${forged}`})).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('requires a Bearer credential',async()=>{
    expect(await authenticateVerifiedRequest({})).toBeNull();
    expect(await authenticateVerifiedRequest({authorization:'not-a-bearer-token'})).toBeNull();
  });
});
