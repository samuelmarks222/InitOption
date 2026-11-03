import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import {connect} from 'node:net';
import {createChartServer} from './server.mjs';
import {BrownianMarket} from './simulation.mjs';

const html=await readFile(new URL('./chart.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const sandbox=createContext({console,Date});runInContext(script,sandbox);
const {TickStore,Aggregator,INTERVALS,heikinAshi}=sandbox.NativeChartCore;
const tick=(seconds,price)=>({t:String(Math.round(seconds*1e6)),p:String(price)});
const plain=value=>JSON.parse(JSON.stringify(value));

test('standalone has no imports, build placeholders or external script/style requests',()=>{
  assert.equal(/\bimport\s|require\(|CHART_BUNDLE|src=["']https?:|href=["']https?:/.test(html),false);
  assert.match(html,/SIMULATION · NOT LIVE MARKET DATA/);
});
test('rapid reversals synchronously update exact OHLC, while originals retain decimal text',()=>{
  const store=new TickStore(),agg=new Aggregator();
  [100,102.12345678,99,103,98,101,97,100].forEach((price,i)=>{
    assert.equal(store.push(tick(600+i*.1,price)),true);agg.append(store.latest());
    assert.equal(agg.bars[0].close,price);
  });
  assert.deepEqual(plain(agg.bars[0]),{time:600000000,open:100,high:103,low:97,close:100,volume:8});
  assert.equal(store.at(1).decimal,'102.12345678');
  assert.equal(store.push(tick(600.7,999)),false);assert.equal(store.push(tick(599,999)),false);
  for(const bad of [{t:'bad',p:'100'},tick(700,-1),{t:'700000000',p:'NaN'},tick(Date.now()/1000+60,10)])assert.equal(store.push(bad),false);
});
test('raw ring retention is bounded and aggregation rebuilds all fifteen aligned timeframes',()=>{
  const store=new TickStore(4);for(const [i,time]of [0,4.999,5,14399.9,14400].entries())store.push(tick(time,100+i));
  assert.equal(store.length,4);assert.equal(store.at(0).time,4999000);
  for(const seconds of Object.values(INTERVALS)){
    const agg=new Aggregator(seconds);agg.rebuild(store);assert.equal(agg.bars.at(-1).close,104);
    for(const bar of agg.bars)assert.equal(bar.time%(seconds*1000000),0);
  }
  const four=new Aggregator(14400);four.rebuild(store);
  assert.deepEqual(plain(four.bars.map(b=>[b.time,b.open,b.high,b.low,b.close])),[[0,101,103,101,103],[14400000000,104,104,104,104]]);
});
test('eviction corrects oldest partially retained candle and HA uses recursive formulas',()=>{
  const store=new TickStore(3),agg=new Aggregator();
  for(const [i,price]of [90,100,110,105].entries()){store.push(tick(i,price));agg.append(store.latest());if(store.length===store.capacity)agg.trim(store);}
  assert.deepEqual(plain(agg.bars[0]),{time:0,open:100,high:110,low:100,close:105,volume:3});
  const ha=heikinAshi([{time:0,open:100,high:110,low:90,close:105},{time:5,open:105,high:115,low:101,close:111}]);
  assert.equal(ha[0].close,101.25);assert.equal(ha[1].open,(ha[0].open+ha[0].close)/2);
});
test('20000 continuous ticks give the same candles as raw-history reconstruction',()=>{
  const store=new TickStore(50000),agg=new Aggregator(5);
  for(let i=0;i<20000;i++){store.push(tick(i*.1,100+(i%37)*.0001));agg.append(store.latest());}
  const rebuilt=new Aggregator(5);rebuilt.rebuild(store);assert.deepEqual(plain(agg.bars),plain(rebuilt.bars));
});
test('Canvas fits visible extremes with exactly 10% padding, holds OHLC, and uses DPR backing pixels',()=>{
  const calls=[],ctx=new Proxy({measureText:text=>({width:text.length*6}),createLinearGradient:()=>({addColorStop(){}})}, {get:(target,key)=>target[key]??((...args)=>calls.push([key,...args]))});
  const rect={width:1000,height:500};
  const canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>rect,addEventListener(){},removeEventListener(){}};
  Object.assign(sandbox,{ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},devicePixelRatio:2,matchMedia:()=>({addEventListener(){},removeEventListener(){}})});
  const chart=new sandbox.NativeChartCore.CanvasChart(canvas);
  chart.follow=false;chart.count=12;chart.end=13;
  // First candle is deliberately offscreen and must not influence vertical scale.
  chart.bars=[{time:0,open:1,high:10000,low:1,close:2},...Array.from({length:13},(_,i)=>({time:(i+1)*5000000,open:100,high:110,low:90,close:105}))];
  const before=JSON.stringify(chart.bars);chart.draw();
  assert.equal(chart.min,88);assert.equal(chart.max,112);assert.equal(canvas.width,2000);assert.equal(canvas.height,1000);
  rect.width=390;rect.height=600;chart.draw();assert.equal(canvas.width,780);assert.equal(canvas.height,1200);
  assert.equal(JSON.stringify(chart.bars),before);assert.ok(calls.some(([name])=>name==='fillRect'));chart.dispose();
});
test('Brownian stream is positive and precise with configurable volatility and 2–8 second regimes',()=>{
  const market=new BrownianMarket({precision:8});let previous,changes=0;
  for(let i=0;i<10000;i++){const price=market.next();assert.match(price,/^\d+\.\d{8}$/);assert.ok(Number(price)>0);if(price!==previous)changes++;previous=price;assert.ok(market.remaining>=0&&market.remaining<=80);}
  assert.ok(changes>9900);assert.throws(()=>new BrownianMarket({volatility:-1}));
});
test('Node built-in WebSocket receives snapshot and microsecond 100ms ticks; shutdown is clean',async()=>{
  const app=createChartServer({port:0,warmup:20});await new Promise(resolve=>app.server.once('listening',resolve));
  const port=app.server.address().port;let socket;
  try{
    const messages=await new Promise((resolve,reject)=>{
      const received=[];socket=new WebSocket(`ws://127.0.0.1:${port}/ticks`);
      const timer=setTimeout(()=>reject(new Error('WebSocket timeout')),3000);
      socket.onmessage=e=>{received.push(JSON.parse(e.data));if(received.length===4){clearTimeout(timer);resolve(received);}};
      socket.onerror=()=>{clearTimeout(timer);reject(new Error('WebSocket connection failed'));};
    });
    assert.equal(messages[0].mode,'simulation');assert.equal(messages[0].ticks.length,20);
    const live=messages.slice(1);for(const value of live){assert.deepEqual(Object.keys(value),['t','p']);assert.match(value.t,/^\d{16}$/);assert.match(value.p,/^\d+\.\d{8}$/);}
    for(let i=1;i<live.length;i++){const delta=Number(BigInt(live[i].t)-BigInt(live[i-1].t));assert.ok(delta>50000&&delta<500000);}
    const response=await fetch(`http://127.0.0.1:${port}/`);assert.equal(response.status,200);assert.match(await response.text(),/NATIVE CANVAS 2D/);
    const health=await(await fetch(`http://127.0.0.1:${port}/health`)).json();assert.equal(health.mode,'simulation');
  }finally{socket?.close();await app.close();}
});
test('native WebSocket handshake rejects invalid keys and closes unmasked client frames',async()=>{
  const app=createChartServer({port:0,warmup:0});await new Promise(resolve=>app.server.once('listening',resolve));
  const port=app.server.address().port;
  async function exchange(key,unmasked=false){
    return new Promise((resolve,reject)=>{
      const socket=connect(port,'127.0.0.1'),parts=[];const timer=setTimeout(()=>{socket.destroy();reject(new Error('TCP test timeout'));},3000);
      socket.on('connect',()=>socket.write(`GET /ticks HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`));
      socket.on('data',chunk=>{parts.push(chunk);if(unmasked&&Buffer.concat(parts).includes(Buffer.from('\r\n\r\n'))){unmasked=false;socket.write(Buffer.from([0x81,1,65]));}});
      socket.on('error',reject);socket.on('close',()=>{clearTimeout(timer);resolve(Buffer.concat(parts));});
    });
  }
  try{assert.match((await exchange('invalid')).toString(),/400 Bad Request/);const bytes=await exchange('dGhlIHNhbXBsZSBub25jZQ==',true);assert.match(bytes.toString(),/101 Switching Protocols/);assert.ok(bytes.includes(Buffer.from([0x88,2,3,234])) || bytes.includes(Buffer.from([3,234])));}
  finally{await app.close();}
});
test('standalone boot handles Area interval restore, exact tick display, and outage hold',()=>{
  const elements=new Map(),canvasContext=new Proxy({measureText:()=>({width:80})},{get:(t,k)=>t[k]??(()=>{})});
  const element=id=>{
    if(!elements.has(id))elements.set(id,{value:id==='timeframe'?'5s':id==='type'?'candles':'',style:{},classList:{toggle(){}},add(){},getContext:()=>canvasContext,getBoundingClientRect:()=>({width:800,height:500}),addEventListener(){},removeEventListener(){}});
    return elements.get(id);
  };
  class FakeWebSocket{static instances=[];constructor(){FakeWebSocket.instances.push(this);}close(){this.onclose?.();}}
  const context=createContext({console,Date,document:{getElementById:element,addEventListener(){},removeEventListener(){}},window:{addEventListener(){}},location:{protocol:'https:',host:'preview.example'},Option:class{},WebSocket:FakeWebSocket,ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},devicePixelRatio:1,matchMedia:()=>({addEventListener(){},removeEventListener(){}}),setTimeout:()=>1,clearTimeout(){}});
  runInContext(script,context);const socket=FakeWebSocket.instances[0];socket.onopen();
  socket.onmessage({data:JSON.stringify({type:'snapshot',mode:'simulation',precision:8,ticks:[tick(600,'100.12345678')]})});assert.equal(element('price').textContent,'100.12345678');
  element('timeframe').value='1m';element('timeframe').onchange();element('type').value='area';element('type').onchange();assert.equal(element('timeframe').value,'5s');assert.equal(element('timeframe').disabled,true);
  element('type').value='candles';element('type').onchange();assert.equal(element('timeframe').value,'1m');assert.equal(element('timeframe').disabled,false);
  socket.onmessage({data:JSON.stringify(tick(600.1,'99.76543210'))});assert.equal(element('price').textContent,'99.76543210');socket.close();assert.equal(element('price').textContent,'99.76543210');
  assert.match(element('status').textContent,/holding price/);
});
