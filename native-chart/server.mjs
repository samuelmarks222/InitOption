import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {BrownianMarket} from './simulation.mjs';
import {acceptWebSocket} from './websocket.mjs';

export function createChartServer({port = 8091, host = '0.0.0.0', origin, market = new BrownianMarket(), depth = 50000, warmup = 3000} = {}) {
  if (!Number.isInteger(depth) || depth < 1 || depth > 1000000 || !Number.isInteger(warmup) || warmup < 0 || warmup > depth) throw new Error('Invalid retention');
  const peers = new Set(), ticks = [];
  const epoch = BigInt(Date.now())*1000n, monotonic = process.hrtime.bigint();
  const clock = () => epoch+(process.hrtime.bigint()-monotonic)/1000n;
  let lastTime = epoch-1n;
  // Explicit synthetic warmup, from the same model; never presented as live market history.
  for (let i=warmup;i>0;i--) ticks.push({t:String(epoch-BigInt(i)*100000n),p:market.next()});
  const server = createServer(async (req,res) => {
    let path;
    try { path = new URL(req.url,'http://chart.local').pathname; }
    catch { res.writeHead(400); res.end(); return; }
    if (req.method !== 'GET') { res.writeHead(405,{'Allow':'GET'}); res.end(); return; }
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    if (path === '/' || path === '/chart.html') {
      try { res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(await readFile(new URL('./chart.html',import.meta.url))); }
      catch { res.writeHead(500); res.end('Unable to load chart'); }
    } else if (path === '/health') { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({mode:'simulation',clients:peers.size,retained:ticks.length})); }
    else { res.writeHead(404); res.end(); }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  server.on('upgrade',(req,socket,head) => {
    socket.on('error',() => socket.destroy());
    if (peers.size >= 200) { socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); return; }
    const peer = acceptWebSocket(req,socket,head,{origin}); if (!peer) return;
    peers.add(peer);
    peer.send({type:'snapshot',mode:'simulation',precision:market.precision,ticks});
    peer.on('close',() => peers.delete(peer));
    peer.on('message',() => peer.close(1008,'Read-only stream'));
  });
  const timer = setInterval(() => {
    let now = clock(); if (now <= lastTime) now = lastTime+1n; lastTime = now;
    const tick = {t:String(now),p:market.next()}; ticks.push(tick); if (ticks.length > depth) ticks.splice(0,ticks.length-depth);
    const payload = JSON.stringify(tick);
    for (const peer of peers) peer.send(payload);
  },100);
  const heartbeat = setInterval(() => {
    for (const peer of peers) { if (!peer.alive) peer.terminate(); else { peer.alive = false; peer.ping(); } }
  },20000);
  server.listen(port,host);
  return {server,peers,close:() => new Promise(resolve => {
    clearInterval(timer); clearInterval(heartbeat); for (const peer of peers) peer.terminate(); server.close(resolve);
  })};
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const numeric = (name,fallback) => process.env[name] === undefined ? fallback : Number(process.env[name]);
  const app = createChartServer({port:numeric('PORT',8091),origin:process.env.CHART_ORIGIN,depth:numeric('TICK_DEPTH',50000),warmup:numeric('WARMUP_TICKS',3000),market:new BrownianMarket({price:numeric('PRICE',100),drift:numeric('DRIFT',0),volatility:numeric('VOLATILITY',.06),precision:numeric('PRECISION',8),support:numeric('SUPPORT',98),resistance:numeric('RESISTANCE',102),boundaryStrength:numeric('BOUNDARY_STRENGTH',.08)})});
  app.server.on('listening',() => console.log(`Dependency-free Canvas chart — SIMULATION ONLY — port ${app.server.address().port}`));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal,() => app.close().then(() => process.exit(0)));
}
