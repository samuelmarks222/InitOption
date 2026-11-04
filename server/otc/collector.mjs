import { performance } from 'node:perf_hooks';
/** Bounded, fair catalog work. Only the shared authoritative tick writer prices assets. */
export function createOTCCollector({ transaction, assets, read, now=()=>performance.now(), budgetMs=10000, concurrency=1, shouldContinue=async()=>true }) {
  if (!Number.isFinite(budgetMs)||budgetMs<=0||!Number.isInteger(concurrency)||concurrency<1||concurrency>8) throw new Error('Invalid collection execution limits');
  return async function collect() {
    const started=now();
    const stored=await transaction(async client=>(await client.query('SELECT symbol,last_slot FROM public.otc_markets')).rows);
    const slots=new Map(stored.map(row=>[row.symbol,Number(row.last_slot)]));
    const symbols=Object.keys(assets).sort((a,b)=>(slots.get(a)??-Infinity)-(slots.get(b)??-Infinity)||a.localeCompare(b));
    const processed=[],errors=[];
    let index=0;
    while(index<symbols.length && now()-started<budgetMs) {
      // Recheck the durable admin switch between waves, not from a browser timer.
      if(!await shouldContinue())break;
      if(now()-started>=budgetMs)break;
      const wave=symbols.slice(index,index+concurrency);index+=wave.length;
      const results=await Promise.all(wave.map(async symbol=>{
        try { const result=await read({symbol,action:'ticks',after:slots.get(symbol)});
          if(!result || !Number.isSafeInteger(result.cursor) || typeof result.catchingUp!=='boolean')throw new Error('Invalid collection tick result');
          return {symbol,result}; }
        catch(error){return {symbol,error:error instanceof Error?error:new Error(String(error))};}
      }));
      for(const {symbol,result,error} of results) {
        if(error)errors.push({symbol,message:error instanceof Error?error.message:String(error)});
        else processed.push({symbol,cursor:result.cursor,catchingUp:result.catchingUp});
      }
    }
    return {assets:symbols.length,processed,errors,remaining:symbols.length-processed.length-errors.length,
      complete:processed.length===symbols.length&&errors.length===0&&processed.every(row=>!row.catchingUp)};
  };
}
