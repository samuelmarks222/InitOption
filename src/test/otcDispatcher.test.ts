import {describe,it,expect,vi,beforeEach} from 'vitest';
const state=vi.hoisted(()=>({query:vi.fn(async(_sql?:string,_args?:unknown[])=>({rows:[]})),verify:vi.fn(),fallback:vi.fn()}));
vi.mock('../../api/_lib/db.js',()=>({query:vi.fn(),queryOne:vi.fn(),transaction:async(work:any)=>work({query:state.query})}));
vi.mock('../../api/_lib/clerkWebhook.js',()=>({authenticateVerifiedRequest:state.verify}));
vi.mock('../../api/_lib/systemHandler.js',()=>({default:state.fallback}));
vi.mock('../../api/_lib/newApi.js',()=>({
  handleDb:vi.fn(),handleProfile:vi.fn(),handlePlatformSettings:vi.fn(),handleCloudinaryUpload:vi.fn(),
  handleCloudinaryDelete:vi.fn(),handleCloudinaryExists:vi.fn(),handleCloudinaryPublicUrl:vi.fn(),
  handlePusherAuth:vi.fn(),handleRpc:vi.fn(),testDbConnection:vi.fn(async()=>({ok:true})),
}));
import handler from '../../api/system';
function response(){
  const res:any={statusCode:0,headersSent:false,body:undefined,setHeader:vi.fn(),end(value:string){this.body=JSON.parse(value);}};
  return res;
}
beforeEach(()=>{vi.clearAllMocks();state.verify.mockReset();});
describe('OTC through existing system Function',()=>{
  it('dispatches rewritten /api/otc health to the actual pricing helper',async()=>{
    const res=response();
    await handler({method:'GET',url:'/api/otc?action=health',query:{route:'otc',action:'health'}} as any,res);
    expect(res.statusCode).toBe(200);expect(res.body).toMatchObject({healthy:true,storage:'postgresql'});
    expect(state.query).toHaveBeenCalled();expect(state.fallback).not.toHaveBeenCalled();
  });
  it('preserves legacy rewrite action parameters and unknown symbol errors',async()=>{
    const res=response();
    await handler({method:'GET',url:'/otc/price?symbol=UNKNOWN',query:{route:'otc',action:'price',symbol:'UNKNOWN'}} as any,res);
    expect(res.statusCode).toBe(400);expect(res.body.error).toBe('Unknown OTC symbol');
    expect(state.query).not.toHaveBeenCalled();
  });
  it('keeps the pricing route read-only',async()=>{
    const res=response();await handler({method:'POST',url:'/api/otc',query:{route:'otc'}} as any,res);
    expect(res.statusCode).toBe(405);expect(state.fallback).not.toHaveBeenCalled();
  });
  it('dispatches history pages through the same Function without generating ticks',async()=>{
    state.query.mockImplementation(async(sql?:string)=>({rows:sql?.includes('SELECT symbol FROM')?[{symbol:'AAPL'}]:sql?.includes('SELECT config,secret')?[{secret:'test',config:{price:212,precision:8,historyBootstrapV1:{anchor:0,price:212}}}]:sql?.includes('clock_timestamp')?[{ms:600000}]:sql?.includes('min(bucket_slot)')?[{first:null}]:[]} as any));
    const res=response();
    await handler({method:'GET',url:'/api/otc?action=history&symbol=AAPL&seconds=60&before=600&limit=2',query:{route:'otc'}} as any,res);
    expect(res.statusCode).toBe(200);expect(res.body).toMatchObject({type:'history',seconds:60,candles:[],hasMore:false});
    expect(state.query.mock.calls.some(([sql])=>String(sql).includes('INSERT INTO public.otc_markets'))).toBe(false);
  });
  it('fails closed for collection without a configured secret and rejects unauthenticated callers',async()=>{
    const previous=process.env.CRON_SECRET;
    try{
      delete process.env.CRON_SECRET;
      let res=response();await handler({method:'GET',url:'/api/otc?action=collect',headers:{},query:{route:'otc'}} as any,res);
      expect(res.statusCode).toBe(503);expect(state.query).not.toHaveBeenCalled();
      process.env.CRON_SECRET='test-only-collector-secret';
      res=response();await handler({method:'GET',url:'/api/otc?action=collect&secret=test-only-collector-secret',headers:{},query:{route:'otc'}} as any,res);
      expect(res.statusCode).toBe(401);expect(state.query).not.toHaveBeenCalled();
    }finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
  });
  it('rejects anonymous collection administration before any database access',async()=>{
    state.verify.mockResolvedValue(null);
    for(const [action,method] of [['collection-settings','GET'],['collection-settings','POST'],['collection-run','POST']]){
      const res=response();await handler({method,url:`/api/otc?action=${action}`,headers:{},query:{route:'otc'},body:{enabled:true}} as any,res);
      expect(res.statusCode).toBe(401);
    }
    expect(state.query).not.toHaveBeenCalled();
  });
  it('requires the server-side admin role, not just a verified session',async()=>{
    state.verify.mockResolvedValue('00000000-0000-4000-8000-000000000001');
    state.query.mockResolvedValue({rows:[]});
    const res=response();await handler({method:'POST',url:'/api/otc?action=collection-settings',headers:{},query:{route:'otc'},body:{enabled:true}} as any,res);
    expect(res.statusCode).toBe(403);expect(state.query.mock.calls.every(([sql])=>String(sql).includes('user_roles'))).toBe(true);
  });
  it('rejects non-boolean settings before mutating collection state',async()=>{
    state.verify.mockResolvedValue('00000000-0000-4000-8000-000000000001');
    state.query.mockResolvedValue({rows:[{admin:true}]});
    const res=response();await handler({method:'POST',url:'/api/otc?action=collection-settings',headers:{},query:{route:'otc'},body:{enabled:'true'}} as any,res);
    expect(res.statusCode).toBe(400);expect(state.query.mock.calls.some(([sql])=>String(sql).includes('UPDATE'))).toBe(false);
  });
  it('persists and reads the global setting through the admin dispatcher without creating market ticks',async()=>{
    const userId='00000000-0000-4000-8000-000000000001';state.verify.mockResolvedValue(userId);
    let enabled=false;
    state.query.mockImplementation(async(sql?:string,args?:unknown[])=>{
      if(sql?.includes('user_roles'))return {rows:[{admin:true}]} as any;
      if(sql?.includes('SET enabled=$1'))enabled=args?.[0] as boolean;
      if(sql?.includes('SELECT *, clock_timestamp'))return {rows:[{enabled,server_now:new Date(),updated_at:new Date()}]} as any;
      return {rows:[]};
    });
    for(const setting of [true,false]){
      let res=response();await handler({method:'POST',url:'/api/otc?action=collection-settings',headers:{},query:{route:'otc'},body:{enabled:setting}} as any,res);
      expect(res.statusCode).toBe(200);expect(res.body.enabled).toBe(setting);expect(res.body.totalAssets).toBeGreaterThan(0);
      res=response();await handler({method:'GET',url:'/api/otc?action=collection-settings',headers:{},query:{route:'otc'}} as any,res);
      expect(res.body.enabled).toBe(setting);expect(res.body.uninitializedAssets).toBe(res.body.totalAssets);
    }
    expect(state.query.mock.calls.some(([sql,args])=>String(sql).includes('SET enabled=$1') && args?.[1]===userId)).toBe(true);
    expect(state.query.mock.calls.some(([sql])=>String(sql).includes('INSERT INTO public.otc_markets'))).toBe(false);
  });
  it('the scheduler cannot bypass a disabled global switch',async()=>{
    const previous=process.env.CRON_SECRET;
    try{
      process.env.CRON_SECRET='test-only-collector-secret';state.query.mockResolvedValue({rows:[]});
      const res=response();await handler({method:'GET',url:'/api/otc?action=collect',headers:{authorization:'Bearer test-only-collector-secret'},query:{route:'otc'}} as any,res);
      expect(res.statusCode).toBe(200);expect(res.body).toMatchObject({skipped:true,reason:'disabled-or-running'});
      expect(state.query.mock.calls.some(([sql])=>String(sql).includes('INSERT INTO public.otc_markets'))).toBe(false);
    }finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
  });
  it('does not replace the existing system health route',async()=>{
    const res=response();await handler({method:'GET',url:'/api/system?route=health',query:{route:'health'}} as any,res);
    expect(res.statusCode).toBe(200);expect(res.body).toEqual({ok:true,db:'connected'});
    expect(state.query).not.toHaveBeenCalled();
  });
});
