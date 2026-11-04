import type { OHLCCandle } from '@/components/trading/engine/priceEngine';
export function mergeCandleHistory(older: readonly OHLCCandle[], newer: readonly OHLCCandle[], limit=5000): OHLCCandle[] {
  const rows = new Map<number,OHLCCandle>();
  for(const bar of [...older,...newer]) {
    // Reject old in-memory bootstrap/mixed candles across asset/timeframe switches.
    if ('origin' in bar && bar.origin !== undefined && bar.origin !== 'recorded') continue;
    rows.set(bar.time,{...bar});
  }
  return [...rows.values()].sort((a,b)=>a.time-b.time).slice(-limit);
}
export async function requestOTCHistory(symbol: string, seconds: number, before: number, signal: AbortSignal) {
  const url=new URL(import.meta.env.VITE_OTC_API_URL?.trim() || '/api/otc',window.location.href);
  for(const [key,value] of Object.entries({action:'history',symbol,seconds,before,limit:300}))url.searchParams.set(key,String(value));
  const response=await fetch(url,{signal,cache:'no-store'});
  if(!response.ok)throw new Error('Earlier candle history could not be loaded. Please retry.');
  const page=await response.json();
  if(page?.type!=='history'||page.source!=='internal-otc'||page.symbol!==symbol||page.seconds!==seconds||
    !Array.isArray(page.candles)||page.candles.length>300||typeof page.hasMore!=='boolean'||(page.generated!==undefined && page.generated!==false))throw new Error('Invalid candle history response');
  for(let i=0;i<page.candles.length;i++){
    const bar=page.candles[i];
    if(![bar.time,bar.open,bar.high,bar.low,bar.close,bar.volume].every(Number.isFinite)||bar.time<0||bar.time%seconds!==0||bar.time>=before||
      bar.low<=0||bar.high<Math.max(bar.open,bar.close)||bar.low>Math.min(bar.open,bar.close)||bar.volume<=0||
      (i>0&&bar.time<=page.candles[i-1].time)||(bar.origin!==undefined && bar.origin!=='recorded' ))throw new Error('Invalid historical candle');
  }
  return page as {candles:OHLCCandle[];hasMore:boolean;earliest:number|null;generated?:false};
}
