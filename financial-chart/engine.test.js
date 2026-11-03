import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TickBuffer,TickProcessor,aggregateTicks,intervals,heikinAshi,ChartTypeManager} from './ticks.js';
import {SimulationMarket} from '../server/market-data/simulation.js';
import {createSimulationServer} from '../server/market-data/server.js';
import {MarketDataAdapter} from './adapter.js';
import {WebSocket} from 'ws';
const tick = (timestamp,price,sequence) => ({symbol:'DEMO/USD',timestamp,price,sequence});
test('every rapid reversal commits immediately with exact extrema and precision', () => {
  const engine = new TickProcessor(); let calls = 0; engine.subscribe(() => calls++);
  const prices = [100,102.123456789,99,103,98,100,97,101];
  prices.forEach((price,i) => { assert.equal(engine.ingest(tick(600+i*.1,price,i)),true); const bar = engine.candles(5)[0]; assert.equal(bar.close,price); assert.equal(bar.high,Math.max(...prices.slice(0,i+1))); assert.equal(bar.low,Math.min(...prices.slice(0,i+1))); });
  assert.equal(calls,8); assert.equal(engine.candles(5)[0].open,100);
  assert.equal(engine.ingest(tick(601,999,7)),false); assert.equal(calls,8);
});
test('5 second and 4 hour boundaries and every supported timeframe rebuild exactly', () => {
  const buffer = new TickBuffer(); [tick(0,100,0),tick(4.999,103,1),tick(5,99,2),tick(14399.9,106,3),tick(14400,102,4)].forEach(t => buffer.insert(t));
  assert.deepEqual(aggregateTicks(buffer.snapshot(),5).map(b => b.time),[0,5,14395,14400]);
  assert.deepEqual(aggregateTicks(buffer.snapshot(),14400).map(b => [b.time,b.open,b.high,b.low,b.close]),[[0,100,106,99,106],[14400,102,102,102,102]]);
  for (const seconds of Object.values(intervals)) assert.equal(aggregateTicks(buffer.snapshot(),seconds).at(-1).close,102);
});
test('late history reconstructs OHLC without rewinding current price; deduplicates and bounds memory', () => {
  const engine = new TickProcessor({maxTicks:3}); engine.ingest(tick(601,101,2)); engine.candles(5);
  engine.ingest(tick(600,99,1)); assert.equal(engine.buffer.latest.price,101); assert.equal(engine.candles(5)[0].open,99);
  assert.equal(engine.ingest(tick(600,1000,1)),false);
  assert.equal(engine.ingest(tick(602,NaN,3)),false);
  engine.ingest(tick(602,102,3)); engine.ingest(tick(603,103,4)); assert.equal(engine.buffer.rows.length,3);
});
test('Area locks 5s and restores prior timeframe; HA has recursive math without mutating raw candles', () => {
  const manager = new ChartTypeManager(); manager.setTimeframe('4h'); manager.setType('area'); manager.setTimeframe('1m'); assert.equal(manager.timeframe,'5s'); manager.setType('bars'); assert.equal(manager.timeframe,'4h');
  const bars = aggregateTicks([tick(0,100,1),tick(1,104,2),tick(5,98,3),tick(6,102,4)],5);
  const ha = heikinAshi(bars); assert.equal(ha[0].close,102); assert.equal(ha[1].open,(ha[0].open+ha[0].close)/2); assert.equal(bars[1].open,98);
});
test('simulation is tagged, timestamped, precise and configurable with bounded valid outputs', () => {
  const market = new SimulationMarket({precision:3,volatility:1});
  for (let i=0;i<5000;i++) { const value = market.next(i*.1); assert.equal(value.source,'simulated'); assert.equal(value.sequence,i+1); assert.equal(value.timestamp,i*.1); assert.equal(value.price,Number(value.price.toFixed(3))); assert.ok(value.price>0); }
  assert.throws(() => new SimulationMarket({volatility:-1}));
});
test('real WebSocket simulation stream merges historical ticks, updates at 100ms, and disconnects cleanly', async () => {
  const server = createSimulationServer({port:0}); await new Promise(resolve => server.server.once('listening',resolve));
  const origin = `http://127.0.0.1:${server.server.address().port}`;
  let adapter;
  try {
    await new Promise((resolve,reject) => {
      const timeout = setTimeout(() => reject(new Error('No simulation ticks received')),3000); let count=0;
      adapter = new MarketDataAdapter({url:origin.replace('http:','ws:')+'/ticks',historyUrl:origin+'/history',mode:'simulation',symbol:'DEMO/USD',WebSocketImpl:WebSocket,onTick:() => { if (++count === 3) {clearTimeout(timeout);resolve();} }}); adapter.connect();
    });
    const price = adapter.buffer.latest.price; adapter.disconnect(); await new Promise(resolve => setTimeout(resolve,200)); assert.equal(adapter.buffer.latest.price,price);
    const history = await (await fetch(origin+'/history?symbol=DEMO/USD')).json(); assert.ok(history.ticks.length>=3); assert.equal(history.mode,'simulation');
  } finally { adapter?.disconnect(); await server.close(); }
});
class FakeSocket {
  static instances=[];
  constructor() { FakeSocket.instances.push(this); }
  send() {} close() { this.onclose?.(); }
  message(value) { this.onmessage?.({data:JSON.stringify(value)}); }
}
test('history/live race merges once; live mode rejects simulated ticks and never fabricates during outage', async () => {
  let finish;
  const fetchImpl = () => new Promise(resolve => {finish=resolve;});
  const statuses=[];
  const adapter = new MarketDataAdapter({url:'wss://test/ticks',historyUrl:'https://test/history',symbol:'DEMO/USD',mode:'live',fetchImpl,WebSocketImpl:FakeSocket,onStatus:s => statuses.push(s)});
  adapter.connect(); const socket=FakeSocket.instances.at(-1); const opening = socket.onopen();
  socket.message(tick(601,101,2)); socket.message({...tick(602,999,3),source:'simulated'});
  finish({ok:true,json:async()=>({ticks:[tick(600,100,1),tick(601,101,2)]})}); await opening;
  assert.equal(adapter.buffer.rows.length,2); assert.equal(adapter.buffer.latest.price,101); assert.equal(statuses.at(-1),'live'); adapter.disconnect();
});
test('automatic reconnect retains tick identity and manual disconnect cancels retry', async () => {
  const adapter = new MarketDataAdapter({url:'wss://test/ticks',symbol:'DEMO/USD',WebSocketImpl:FakeSocket});
  adapter.connect(); let socket = FakeSocket.instances.at(-1); await socket.onopen(); socket.message(tick(600,100,1));
  const start = FakeSocket.instances.length; socket.close(); await new Promise(resolve => setTimeout(resolve,550));
  assert.equal(FakeSocket.instances.length,start+1); socket = FakeSocket.instances.at(-1); await socket.onopen();
  socket.message(tick(600,100,1)); socket.message(tick(601,101,2)); assert.equal(adapter.buffer.rows.length,2);
  socket.close(); adapter.disconnect(); const end=FakeSocket.instances.length;
  await new Promise(resolve => setTimeout(resolve,550)); assert.equal(FakeSocket.instances.length,end);
});
test('incremental cache equals a complete rebuild under 20000 continuous ticks and late corrections', () => {
  const engine = new TickProcessor(); engine.candles(5); engine.candles(14400);
  for (let i=0;i<20000;i++) engine.ingest(tick(i*.1,100+(i%37)*.001,i));
  engine.ingest(tick(200.55,99.123456789,30000));
  for (const seconds of [5,14400]) assert.deepEqual(engine.candles(seconds),aggregateTicks(engine.buffer.snapshot(),seconds));
});
