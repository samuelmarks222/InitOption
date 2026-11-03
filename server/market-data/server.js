import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {WebSocketServer, WebSocket} from 'ws';
import {SimulationMarket} from './simulation.js';

export function createSimulationServer({port = 8090, host = '0.0.0.0', market = new SimulationMarket(), maxHistory = 200000} = {}) {
  const ticks = [], subscriptions = new Map();
  const server = createServer(async (req,res) => {
    const url = new URL(req.url, 'http://simulation.invalid');
    res.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/history') {
      if (url.searchParams.get('symbol') !== market.symbol) { res.writeHead(404); res.end('Unknown simulation symbol'); return; }
      const from = Number(url.searchParams.get('from') ?? 0);
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify({mode:'simulation',ticks:ticks.filter(t => t.timestamp >= from)})); return;
    }
    if (url.pathname === '/' || url.pathname === '/chart.html') {
      try { const html = await readFile(new URL('../../financial-chart/chart.html', import.meta.url)); res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(html); }
      catch { res.writeHead(503); res.end('Run npm run chart:bundle first.'); }
      return;
    }
    res.writeHead(404); res.end();
  });
  const wss = new WebSocketServer({server, path:'/ticks', maxPayload:4096});
  wss.on('connection', socket => {
    subscriptions.set(socket, null); socket.alive = true;
    socket.on('pong', () => { socket.alive = true; });
    socket.on('error', () => socket.terminate());
    socket.on('close', () => subscriptions.delete(socket));
    socket.on('message', bytes => {
      try { const message = JSON.parse(bytes.toString());
        if (message.type === 'subscribe' && message.symbol === market.symbol) subscriptions.set(socket, market.symbol);
        else if (message.type === 'unsubscribe') subscriptions.set(socket, null);
        else socket.send(JSON.stringify({type:'error',message:'Unknown simulation symbol or operation'}));
      } catch { socket.close(1008,'Invalid message'); }
    });
  });
  const timer = setInterval(() => {
    const tick = market.next(); ticks.push(tick); if (ticks.length > maxHistory) ticks.splice(0,ticks.length-maxHistory);
    const message = JSON.stringify(tick);
    for (const [socket,symbol] of subscriptions) if (symbol === market.symbol && socket.readyState === WebSocket.OPEN) {
      if (socket.bufferedAmount > 1024*1024) socket.close(1013,'Slow consumer'); else socket.send(message);
    }
  },100);
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) { if (!socket.alive) socket.terminate(); else { socket.alive = false; socket.ping(); } }
  },30000);
  server.listen(port,host);
  return {server,wss,ticks, close: () => new Promise(resolve => {
    clearInterval(timer); clearInterval(heartbeat); for (const socket of wss.clients) socket.terminate();
    wss.close(() => server.close(resolve));
  })};
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const number = (key, fallback) => process.env[key] === undefined ? fallback : Number(process.env[key]);
  const market = new SimulationMarket({symbol:process.env.SIM_SYMBOL ?? 'DEMO/USD',price:number('SIM_PRICE',100),drift:number('SIM_DRIFT',.02),volatility:number('SIM_VOLATILITY',.2),precision:number('SIM_PRECISION',5),support:number('SIM_SUPPORT',90),resistance:number('SIM_RESISTANCE',110),boundaryStrength:number('SIM_BOUNDARY_STRENGTH',.3)});
  const app = createSimulationServer({port:number('PORT',8090),market});
  app.server.on('listening', () => console.log(`SIMULATION ONLY — HTTP/chart/history and WebSocket /ticks on port ${app.server.address().port}`));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => app.close().then(() => process.exit(0)));
}
