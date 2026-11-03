import {readFileSync,appendFileSync,mkdirSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {BrownianMarket} from '../../native-chart/simulation.mjs';
import {acceptWebSocket} from '../../native-chart/websocket.mjs';
const defaultAssets=JSON.parse(readFileSync(new URL('./assets.json',import.meta.url),'utf8'));

/** One market per server-configured symbol; nothing here accepts trades, balances,
 * user IDs, client prices or outcome targets. All clients observe the same stream. */
export function createOTCService({assets=defaultAssets,depth=50000,warmup=3000,dataDir,origin}={}) {
  if(!Number.isInteger(depth)||depth<1||!Number.isInteger(warmup)||warmup<0||warmup>depth)throw new Error('Invalid retention');
  const streams=new Map(),peers=new Map(),session=randomUUID();let closed=false,fault=null,chain='';
  const epoch=BigInt(Date.now())*1000n,monotonic=process.hrtime.bigint();
  let lastMicros=epoch;const clock=()=>{const value=epoch+(process.hrtime.bigint()-monotonic)/1000n;lastMicros=value>lastMicros?value:lastMicros+1n;return lastMicros;};
  function make(symbol){
    if(!Object.hasOwn(assets,symbol))throw new Error('Unknown OTC symbol');
    const market=new BrownianMarket(assets[symbol]);return {symbol,market,ticks:[],sequence:0};
  }
  function retain(stream,tick){stream.ticks.push(tick);stream.sequence=tick.sequence;stream.market.price=Number(tick.p);if(stream.ticks.length>depth)stream.ticks.splice(0,stream.ticks.length-depth);}
  if(dataDir){
    mkdirSync(dataDir,{recursive:true});
    const files=readdirSync(dataDir).filter(name=>/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(name)).sort().slice(-2);
    for(const name of files){
      if(statSync(join(dataDir,name)).size>512*1024*1024)throw new Error('OTC journal exceeds startup recovery limit; archive/recover with operator tooling');
      let previous='';
      for(const line of readFileSync(join(dataDir,name),'utf8').split('\n')){
        if(!line)continue;
        // Fail closed on truncated/corrupt journals rather than silently reset prices.
        const record=JSON.parse(line),payload=JSON.stringify(record.ticks);
        const hash=createHash('sha256').update(previous+payload).digest('hex');
        if(record.previous!==previous||record.hash!==hash)throw new Error('OTC journal integrity check failed');
        previous=hash;
        for(const tick of record.ticks){
          if(!Object.hasOwn(assets,tick.symbol))continue;
          let stream=streams.get(tick.symbol);if(!stream){stream=make(tick.symbol);streams.set(tick.symbol,stream);}
          if(!Number.isSafeInteger(tick.sequence)||tick.sequence<=stream.sequence||!Number.isFinite(Number(tick.p))||Number(tick.p)<=0)throw new Error('Invalid recovered OTC tick');
          retain(stream,tick);
        }
      }
      if(name===new Date().toISOString().slice(0,10)+'.jsonl')chain=previous;
    }
  }
  let journalDay=new Date().toISOString().slice(0,10);
  function persist(ticks){
    if(!dataDir||!ticks.length)return;
    const day=new Date().toISOString().slice(0,10);if(day!==journalDay){chain='';journalDay=day;}
    const hash=createHash('sha256').update(chain+JSON.stringify(ticks)).digest('hex');
    appendFileSync(join(dataDir,day+'.jsonl'),JSON.stringify({previous:chain,hash,ticks})+'\n',{mode:0o600,flush:true});chain=hash;
  }
  function get(symbol){
    if(fault)throw new Error('OTC persistence unavailable');
    if(streams.has(symbol))return streams.get(symbol);
    const stream=make(symbol),now=clock(),initial=[];
    for(let i=warmup;i>0;i--)initial.push({symbol,t:String(now-BigInt(i)*100000n),p:stream.market.next(),sequence:++stream.sequence,source:'internal-otc'});
    try{persist(initial);}catch(error){fault=error;throw error;}stream.ticks=initial;streams.set(symbol,stream);return stream;
  }
  const request=(req,res)=>{
    let url;try{url=new URL(req.url,'http://otc.local');}catch{return false;}if(!url.pathname.startsWith('/otc/'))return false;
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    if(origin&&req.headers.origin===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
    const reply=(status,data)=>{res.writeHead(status);res.end(JSON.stringify(data));};
    if(req.method!=='GET'){reply(405,{error:'Read-only pricing service'});return true;}
    try{
      if(url.pathname==='/otc/health'){reply(fault?503:200,{mode:'internal-otc',session,streams:streams.size,healthy:!fault});return true;}
      if(url.pathname!=='/otc/price'&&url.pathname!=='/otc/history'){reply(404,{error:'Unknown OTC route'});return true;}
      const stream=get(url.searchParams.get('symbol'));
      if(url.pathname==='/otc/history'){reply(200,{source:'internal-otc',session,ticks:stream.ticks});return true;}
      const now=Number(clock())/1e6,at=url.searchParams.has('at')?Number(url.searchParams.get('at')):now;
      if(!Number.isFinite(at)||at<0){reply(400,{error:'Invalid expiry timestamp'});return true;}
      if(at>now){reply(425,{error:'Expiry has not occurred'});return true;}
      let left=0,right=stream.ticks.length;
      while(left<right){const mid=(left+right)>>>1;if(Number(stream.ticks[mid].t)/1e6<=at)left=mid+1;else right=mid;}
      const tick=stream.ticks[left-1];
      if(!tick||at-Number(tick.t)/1e6>.5){reply(409,{error:'No valid OTC price at requested time; settlement must wait for operator recovery'});return true;}
      reply(200,{...tick,session,timestamp:Number(tick.t)/1e6,price:Number(tick.p),quotedAt:at});
    }catch(error){reply(fault?503:400,{error:error.message});}
    return true;
  };
  const upgrade=(req,socket,head)=>{
    try{if(new URL(req.url,'http://otc.local').pathname!=='/otc/ticks')return false;}catch{socket.destroy();return true;}
    socket.on('error',()=>socket.destroy());
    if(peers.size>=200||fault){socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');return true;}
    const peer=acceptWebSocket(req,socket,head,{path:'/otc/ticks',origin});if(!peer)return true;
    peers.set(peer,null);peer.on('close',()=>peers.delete(peer));
    peer.on('message',text=>{
      try{
        const message=JSON.parse(text);
        if(message.type==='unsubscribe'){peers.set(peer,null);return;}
        if(message.type!=='subscribe'||typeof message.symbol!=='string')throw new Error('Subscribe by symbol only');
        const stream=get(message.symbol);peers.set(peer,message.symbol);
        peer.send({type:'snapshot',source:'internal-otc',symbol:stream.symbol,session,precision:stream.market.precision,ticks:stream.ticks});
      }catch(error){peer.send({type:'error',message:error.message});peer.close(1008,'Invalid OTC subscription');}
    });return true;
  };
  const timer=setInterval(()=>{
    if(closed||fault)return;
    const now=String(clock()),ticks=[];
    for(const stream of streams.values())ticks.push({symbol:stream.symbol,t:now,p:stream.market.next(),sequence:stream.sequence+1,source:'internal-otc'});
    try{persist(ticks);}catch(error){fault=error;for(const peer of peers.keys())peer.close(1011,'OTC persistence failed');return;}
    for(const tick of ticks){retain(streams.get(tick.symbol),tick);const payload=JSON.stringify(tick);for(const [peer,symbol]of peers)if(symbol===tick.symbol)peer.send(payload);}
  },100);
  const heartbeat=setInterval(()=>{for(const peer of peers.keys()){if(!peer.alive)peer.terminate();else{peer.alive=false;peer.ping();}}},20000);
  return {request,upgrade,streams,session,close(){closed=true;clearInterval(timer);clearInterval(heartbeat);for(const peer of peers.keys())peer.terminate();}};
}
