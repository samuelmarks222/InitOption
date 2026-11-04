// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {mergeCandleHistory,requestOTCHistory} from '@/lib/otcHistory';
const bar=(time:number,close=102)=>({time,open:100,high:108,low:95,close,volume:4});
function respond(candles=[bar(0),bar(60)],extra={}){
  const fetch=vi.fn(async(_url:unknown,_options?:unknown)=>({ok:true,json:async()=>({type:'history',source:'internal-otc',symbol:'AAPL',seconds:60,hasMore:true,earliest:0,candles,...extra})}));
  vi.stubGlobal('fetch',fetch);return fetch;
}
afterEach(()=>vi.unstubAllGlobals());
describe('server candle history transport',()=>{
  it('requests the exact symbol/interval and exclusive older boundary with cancellation and no cache',async()=>{
    const fetch=respond(),controller=new AbortController();
    const page=await requestOTCHistory('AAPL',60,120,controller.signal);
    expect(page.candles).toEqual([bar(0),bar(60)]);
    const [url,options]=fetch.mock.calls[0];expect(String(url)).toContain('action=history');expect(String(url)).toContain('before=120');
    expect(String(url)).toContain('seconds=60');expect(options).toEqual({signal:controller.signal,cache:'no-store'});
  });
  for(const change of [{symbol:'OTHER'},{seconds:300},{source:'browser'},{candles:[bar(120)]},{candles:[bar(60),bar(0)]},{candles:[{...bar(0),low:110}]},{candles:[bar(1)]}]){
    it(`rejects malformed or mismatched history ${JSON.stringify(change)}`,async()=>{
      respond(undefined,change);await expect(requestOTCHistory('AAPL',60,120,new AbortController().signal)).rejects.toThrow();
    });
  }
  it('rejects generated/mixed history and strips it from old browser caches',async()=>{
    for(const origin of ['generated-history','mixed']){
      respond([{...bar(0),origin}] as any,{generated:true});
      await expect(requestOTCHistory('AAPL',60,120,new AbortController().signal)).rejects.toThrow();
      respond([{...bar(0),origin}] as any,{generated:false});
      await expect(requestOTCHistory('AAPL',60,120,new AbortController().signal)).rejects.toThrow();
      expect(mergeCandleHistory([{...bar(0),origin}] as any,[bar(60)])).toEqual([bar(60)]);
    }
  });
  it('accepts a genuine empty earliest page without inventing history',async()=>{
    respond([],{hasMore:false,earliest:null});const page=await requestOTCHistory('AAPL',60,120,new AbortController().signal);
    expect(page.candles).toEqual([]);expect(page.hasMore).toBe(false);
  });
  it('surfaces network failures for the retry UI rather than creating placeholder candles',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:false})));await expect(requestOTCHistory('AAPL',60,120,new AbortController().signal)).rejects.toThrow('retry');
  });
  it('merges sorted archive/live history by timestamp without duplicates, respecting complete server corrections and memory limits',()=>{
    expect(mergeCandleHistory([bar(60),bar(0)],[bar(60,104),bar(120)])).toEqual([bar(0),bar(60,104),bar(120)]);
    expect(mergeCandleHistory([bar(0),bar(60)],[bar(120)],2)).toEqual([bar(60),bar(120)]);
  });
});
