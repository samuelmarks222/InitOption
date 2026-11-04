// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {requestOTCQuote} from '@/lib/otcMarket';
const receipt=()=>({symbol:'EUR/USD',source:'internal-otc',price:1.12345678,timestamp:600,quotedAt:600.05,sequence:6000,session:'one'});
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(600000);});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
function respond(payload=receipt(),status=200){
  const fetch=vi.fn(async(_url: RequestInfo | URL, _options?: RequestInit)=>({ok:status===200,status,json:async()=>payload}));vi.stubGlobal('fetch',fetch);return fetch;
}
describe('OTC execution quote receipts',()=>{
  for(const skew of [-300000,0,300000])it(`accepts a fresh server receipt with device clock offset ${skew}ms`,async()=>{
    vi.setSystemTime(600000+skew);const fetch=respond();
    expect((await requestOTCQuote('EUR/USD')).price).toBe(1.12345678);
    const [url,options]=fetch.mock.calls[0] as unknown as [URL,RequestInit];
    expect(url.searchParams.get('action')).toBe('price');expect(url.searchParams.get('symbol')).toBe('EUR/USD');
    expect(options.cache).toBe('no-store');
  });
  for(const change of [{quotedAt:601},{quotedAt:599},{quotedAt:undefined},{symbol:'GBP/USD'},{price:0},{sequence:-1}]){
    it(`rejects invalid current receipt ${JSON.stringify(change)}`,async()=>{
      respond({...receipt(),...change} as any);await expect(requestOTCQuote('EUR/USD')).rejects.toThrow('Invalid OTC price receipt');
    });
  }
  it('uses the exact requested expiry rather than device time',async()=>{
    vi.setSystemTime(900000);const fetch=respond();
    expect((await requestOTCQuote('EUR/USD',600.1)).timestamp).toBe(600);
    expect(String(fetch.mock.calls[0]?.[0])).toContain('at=600.1');
    await expect(requestOTCQuote('EUR/USD',599.9)).rejects.toThrow('Invalid OTC price receipt');
    await expect(requestOTCQuote('EUR/USD',601)).rejects.toThrow('Invalid OTC price receipt');
  });
  it('explains catch-up and unavailable storage instead of substituting a chart price',async()=>{
    respond(receipt(),409);await expect(requestOTCQuote('EUR/USD')).rejects.toThrow('catching up');
    respond(receipt(),503);await expect(requestOTCQuote('EUR/USD')).rejects.toThrow('storage is unavailable');
  });
  it('times out stalled quotes and provides a visible actionable error',async()=>{
    vi.stubGlobal('fetch',vi.fn((_url,options)=>new Promise((_resolve,reject)=>{
      options.signal.addEventListener('abort',()=>reject(new Error('aborted')));
    })));
    const assertion=expect(requestOTCQuote('EUR/USD')).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(8000);await assertion;
  });
});
