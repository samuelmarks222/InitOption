import {describe,it,expect,vi,beforeEach} from 'vitest';
const state=vi.hoisted(()=>({query:vi.fn(async()=>({rows:[]})),fallback:vi.fn()}));
vi.mock('../../api/_lib/db.js',()=>({query:vi.fn(),queryOne:vi.fn(),transaction:async(work:any)=>work({query:state.query})}));
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
beforeEach(()=>{vi.clearAllMocks();});
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
  it('does not replace the existing system health route',async()=>{
    const res=response();await handler({method:'GET',url:'/api/system?route=health',query:{route:'health'}} as any,res);
    expect(res.statusCode).toBe(200);expect(res.body).toEqual({ok:true,db:'connected'});
    expect(state.query).not.toHaveBeenCalled();
  });
});
