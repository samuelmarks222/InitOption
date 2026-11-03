import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,rmSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createOTCService} from './service.mjs';
const assets={AAPL:{price:100,volatility:.06,precision:8,support:95,resistance:105},'EUR/USD':{price:1.1,volatility:.0006,precision:8,support:1,resistance:1.2}};
async function start(options={}){
  const service=createOTCService({assets,warmup:20,...options});
  const server=createServer((req,res)=>{if(!service.request(req,res)){res.writeHead(404);res.end();}});
  server.on('upgrade',(req,socket,head)=>{if(!service.upgrade(req,socket,head))socket.destroy();});
  server.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  return {service,origin,close:async()=>{service.close();await new Promise(resolve=>server.close(resolve));}};
}
async function client(origin,symbol,extra={}){
  const socket=new WebSocket(origin.replace('http:','ws:')+'/otc/ticks'),messages=[];
  let ready;const wait=new Promise((resolve,reject)=>{ready=resolve;setTimeout(()=>reject(new Error('OTC snapshot timeout')),2000).unref();});
  socket.onopen=()=>socket.send(JSON.stringify({type:'subscribe',symbol,...extra}));
  socket.onmessage=event=>{const message=JSON.parse(event.data);messages.push(message);if(message.type==='snapshot')ready(message);};
  const snapshot=await wait;return {socket,messages,snapshot};
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('two clients and all view intervals observe the identical server-owned asset stream',async()=>{
  const app=await start();try{
    const one=await client(app.origin,'AAPL',{basePrice:999999,balance:0,direction:'higher'});
    const two=await client(app.origin,'AAPL',{timeframe:'4h',basePrice:.01});
    assert.deepEqual(one.snapshot.ticks,two.snapshot.ticks);assert.equal(one.snapshot.source,'internal-otc');assert.equal(app.service.streams.size,1);
    assert.ok(Number(one.snapshot.ticks.at(-1).p)>90&&Number(one.snapshot.ticks.at(-1).p)<110);
    await pause(350);
    const shared=one.messages.filter(message=>message.sequence&&two.messages.some(other=>other.sequence===message.sequence));assert.ok(shared.length>=2);
    for(const tick of shared)assert.deepEqual(tick,two.messages.find(other=>other.sequence===tick.sequence));
    const before=app.service.streams.get('AAPL').sequence;one.socket.close();two.socket.close();await pause(220);assert.ok(app.service.streams.get('AAPL').sequence>before);
  }finally{await app.close();}
});
test('expiry quote is exact-symbol last tick at/before expiry, independent of request time and selected asset',async()=>{
  const app=await start();try{
    await client(app.origin,'AAPL');await client(app.origin,'EUR/USD');await pause(250);
    const ticks=app.service.streams.get('AAPL').ticks,target=ticks[ticks.length-2],at=Number(target.t)/1e6+.02;
    const first=await(await fetch(app.origin+'/otc/price?symbol=AAPL&at='+at)).json();await pause(150);
    const next=await(await fetch(app.origin+'/otc/price?symbol=AAPL&at='+at)).json();assert.equal(first.sequence,target.sequence);assert.equal(next.p,first.p);assert.equal(first.price,Number(target.p));
    assert.equal((await fetch(app.origin+'/otc/price?symbol=UNKNOWN')).status,400);
    assert.equal((await fetch(app.origin+'/otc/price?symbol=AAPL&at=0')).status,409);
    assert.equal((await fetch(app.origin+'/otc/price?symbol=AAPL&at='+(Date.now()/1000+60))).status,425);
  }finally{await app.close();}
});
test('journal recovery preserves stream prices, ticks and sequences; corruption fails closed',async()=>{
  const dataDir=mkdtempSync(join(tmpdir(),'otc-journal-'));let app;
  try{
    app=await start({dataDir});await client(app.origin,'AAPL');await pause(150);const previous=app.service.streams.get('AAPL').ticks.at(-1);await app.close();app=null;
    app=await start({dataDir});const restored=app.service.streams.get('AAPL').ticks.at(-1);assert.deepEqual(restored,previous);
    await pause(150);assert.ok(app.service.streams.get('AAPL').sequence>previous.sequence);await app.close();app=null;
    const path=join(dataDir,readdirSync(dataDir)[0]);const text=readFileSync(path,'utf8');writeFileSync(path,text.replace('"p":"100','"p":"999'));
    // Alter the hash explicitly even if the Brownian first price does not start with 100.
    const lines=readFileSync(path,'utf8').split('\n');const entry=JSON.parse(lines[0]);entry.hash='invalid';lines[0]=JSON.stringify(entry);writeFileSync(path,lines.join('\n'));
    assert.throws(()=>createOTCService({assets,dataDir,warmup:20}),/integrity/);
  }finally{if(app)await app.close();rmSync(dataDir,{recursive:true,force:true});}
});
