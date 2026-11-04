import { performance } from 'node:perf_hooks';
/** Called by a trusted frequent scheduler, never a browser timer. Uses exactly
 * the same serialized tick writer as the live feed, not a candle simulator. */
export function createOTCCollector({ transaction, assets, read, now=()=>performance.now(), budgetMs=10000 }) {
  return async function collect() {
    const started=now();
    const stored=await transaction(async client=>(await client.query('SELECT symbol,last_slot FROM public.otc_markets')).rows);
    const slots=new Map(stored.map(row=>[row.symbol,Number(row.last_slot)]));
    // Missing assets first, then least advanced. This resumes fairly across
    // short serverless invocations rather than restarting at asset zero.
    const symbols=Object.keys(assets).sort((a,b)=>(slots.get(a)??-Infinity)-(slots.get(b)??-Infinity)||a.localeCompare(b));
    const processed=[],errors=[];
    for(const symbol of symbols){
      if(now()-started>=budgetMs)break;
      try{
        const result=await read({symbol,action:'ticks',after:slots.get(symbol)});
        processed.push({symbol,cursor:result.cursor,catchingUp:result.catchingUp});
      }catch(error){errors.push({symbol,message:error instanceof Error?error.message:String(error)});}
    }
    return {assets:symbols.length,processed,errors,remaining:symbols.length-processed.length-errors.length,
      complete:processed.length===symbols.length&&errors.length===0&&processed.every(row=>!row.catchingUp)};
  };
}
