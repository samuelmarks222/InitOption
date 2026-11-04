import { createHmac } from 'node:crypto';
const DAY = 86400;
/** Explicitly synthetic pre-launch analysis history, NOT recorded/live quotes.
 * Random-access canonical 5s bars share one private, versioned profile per asset.
 * Every larger interval is an aggregation of these exact same base bars. */
export function generatedHistory({ secret, anchor, price, volatility = price*.0006, precision = 8, seconds, before, limit, days = 30, notBefore = 0 }) {
  if (![anchor,price,volatility,seconds,before,limit,days].every(Number.isFinite) || anchor<0 || anchor%5!==0 || price<=0 || volatility<0 || !Number.isInteger(precision) || precision<0 || precision>10 || !Number.isInteger(seconds) || seconds<5 || seconds%5!==0 || !Number.isInteger(limit) || limit<1 || limit>1001 || days<0 || days>30) throw new Error('Invalid synthetic history window');
  const since = Math.max(0, anchor-days*DAY, Math.ceil(notBefore/5)*5);
  const profile = createHmac('sha256',secret).update('analysis-history:v1:profile').digest();
  const periods=[45,300,1800,14400,86400];
  const relative=Math.min(.005,Math.max(0,volatility/price));
  const phases=periods.map((_,i)=>profile.readUInt16BE(i*2)/65536*Math.PI*2);
  const amplitudes=periods.map((period,i)=>relative*Math.sqrt(period)*(.06+profile[10+i]/255*.1));
  const endpoint=time=>price*Math.exp(periods.reduce((value,period,i)=>value+amplitudes[i]*(Math.sin((time-anchor)/period*Math.PI*2+phases[i])-Math.sin(phases[i])),0));
  const round=value=>Number(Math.max(10**-precision,value).toFixed(precision));
  const base=time=>{
    const random=createHmac('sha256',secret).update(`analysis-history:v1:bar:${time}`).digest();
    const open=endpoint(time),end=endpoint(time+5);
    const wick=price*relative*Math.sqrt(5)*.35;
    const high=Math.max(open,end)+wick*(.2+random[0]/255);
    const low=Math.max(10**-precision,Math.min(open,end)-wick*(.2+random[1]/255));
    // A canonical 10Hz piecewise-linear path: extrema occur on 100ms slots
    // (1.2s and 3.1s), final observation at 4.9s, next open at 5.0s.
    const lastExtreme=(random[2]&1)?high:low;
    const close=lastExtreme+(end-lastExtreme)*(1.8/1.9);
    return {time,open:round(open),high:round(high),low:round(low),close:round(close),volume:50,origin:'generated-history'};
  };
  const candles=[];
  for(let time=Math.floor((Math.min(before,Math.ceil(anchor/seconds)*seconds)-seconds)/seconds)*seconds;
      time+seconds>since && time>=0 && candles.length<limit+1;time-=seconds){
    let candle;
    for(let t=Math.max(time,since);t<Math.min(time+seconds,anchor);t+=5){
      const bar=base(t);
      if(!candle)candle={...bar,time};
      else {candle.high=Math.max(candle.high,bar.high);candle.low=Math.min(candle.low,bar.low);candle.close=bar.close;candle.volume+=bar.volume;}
    }
    if(candle)candles.push(candle);
  }
  return {candles:candles.slice(0,limit).reverse(),hasMore:candles.length>limit,earliest:since<anchor?since:null};
}

export function combineHistory(generated, recorded, limit) {
  const byTime=new Map(generated.map(bar=>[bar.time,{...bar}]));
  for(const bar of recorded){
    const prefix=byTime.get(bar.time);
    byTime.set(bar.time,prefix?{...prefix,high:Math.max(prefix.high,bar.high),low:Math.min(prefix.low,bar.low),close:bar.close,volume:prefix.volume+bar.volume,origin:'mixed'}:{...bar,origin:'recorded'});
  }
  return [...byTime.values()].sort((a,b)=>a.time-b.time).slice(-limit);
}
