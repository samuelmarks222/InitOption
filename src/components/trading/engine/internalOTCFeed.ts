import { observedHistory } from './native/observedHistory';
import { publishOTCQuote } from '@/lib/otcMarket';
import type { MarketDataFeed, MarketFeedCallbacks, MarketFeedStatus, MarketTick } from './marketDataFeed';

interface Stream {
  listeners: Set<MarketFeedCallbacks>; socket?: WebSocket; status: MarketFeedStatus;
  ticks: MarketTick[]; sequence: number; timestamp: number; attempt: number; stopped: boolean;
  retry?: ReturnType<typeof setTimeout>; dispose?: ReturnType<typeof setTimeout>; session?: string;
}
const streams = new Map<string, Stream>();
/** Native WebSocket transport shared by source+symbol, never by chart interval. */
export function createInternalOTCFeed(url: string, symbol: string, callbacks: MarketFeedCallbacks): MarketDataFeed {
  const key = JSON.stringify([url,symbol]); let attached: Stream | undefined;
  const status = (stream: Stream, next: MarketFeedStatus) => {
    stream.status = next; for (const listener of stream.listeners) listener.onStatusChange?.(next);
  };
  const parse = (raw: any): MarketTick | null => {
    if (raw?.source !== 'internal-otc' || raw.symbol !== symbol || typeof raw.t !== 'string' || !/^\d{1,16}$/.test(raw.t) || typeof raw.p !== 'string' || !/^\d+(\.\d{1,12})?$/.test(raw.p)) return null;
    const micros = Number(raw.t), price = Number(raw.p);
    if (!Number.isSafeInteger(micros) || !Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(raw.sequence) || raw.sequence < 1 || micros/1e6 > Date.now()/1000+30) return null;
    return {symbol,price,timestamp:micros/1e6,sequence:raw.sequence,source:'internal-otc'};
  };
  function open(stream: Stream) {
    if (stream.stopped) return;
    status(stream, stream.attempt ? 'reconnecting' : 'connecting');
    let socket: WebSocket;
    const retry = () => {
      if (stream.stopped) return;
      status(stream,'reconnecting');
      clearTimeout(stream.retry); stream.retry = setTimeout(() => open(stream), Math.min(10000,500*2**Math.min(stream.attempt++,5)));
    };
    try { socket = new WebSocket(url); } catch { retry(); return; }
    stream.socket = socket;
    let initialized = false;
    socket.onopen = () => { if (!stream.stopped && stream.socket === socket) socket.send(JSON.stringify({type:'subscribe',symbol})); };
    socket.onmessage = event => {
      if (stream.stopped || stream.socket !== socket) return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'snapshot') {
          if (message.source !== 'internal-otc' || message.symbol !== symbol || typeof message.session !== 'string' || !Array.isArray(message.ticks) || message.ticks.length > 50000) throw new Error('Invalid OTC snapshot');
          const ticks = message.ticks.map(parse);
          if (ticks.some(tick => !tick)) throw new Error('Invalid OTC history');
          for (let i=1;i<ticks.length;i++) if (ticks[i].sequence! <= ticks[i-1].sequence! || ticks[i].timestamp <= ticks[i-1].timestamp) throw new Error('Unordered OTC history');
          // Atomically replace a session snapshot; restart never appends a second price path.
          observedHistory.reset(url,symbol); stream.ticks = ticks; stream.session = message.session;
          stream.sequence = 0; stream.timestamp = -Infinity;
          for (const tick of ticks) { observedHistory.record(url,symbol,tick); stream.sequence=tick.sequence!; stream.timestamp=tick.timestamp; }
          initialized = true; stream.attempt = 0;
          const last = ticks.at(-1); if (last) publishOTCQuote({...last,sequence:last.sequence!,session:stream.session});
          for (const listener of stream.listeners) listener.onHistory?.();
          status(stream,'live'); return;
        }
        const tick = parse(message);
        if (!initialized || !tick || tick.sequence! <= stream.sequence || tick.timestamp <= stream.timestamp) return;
        stream.sequence = tick.sequence!; stream.timestamp = tick.timestamp;
        if (!observedHistory.record(url,symbol,tick)) return;
        stream.ticks.push(tick); if (stream.ticks.length > 50000) stream.ticks.shift();
        publishOTCQuote({...tick,sequence:tick.sequence!,session:stream.session});
        for (const listener of stream.listeners) listener.onTick(tick);
      } catch (error) { for (const listener of stream.listeners) listener.onError?.(error instanceof Error ? error : new Error(String(error))); socket.close(); }
    };
    socket.onerror = () => socket.close();
    socket.onclose = () => { if (stream.socket === socket) retry(); };
  }
  return {
    connect() {
      if (attached) return;
      let stream = streams.get(key); const fresh = !stream;
      if (!stream) { stream = {listeners:new Set(),status:'connecting',ticks:[],sequence:0,timestamp:-Infinity,attempt:0,stopped:false}; streams.set(key,stream); }
      attached = stream; clearTimeout(stream.dispose); stream.listeners.add(callbacks);
      callbacks.onStatusChange?.(stream.status);
      if (stream.ticks.length) callbacks.onHistory?.();
      if (fresh) open(stream);
    },
    disconnect() {
      if (!attached) return;
      const stream = attached; attached = undefined; stream.listeners.delete(callbacks);
      if (!stream.listeners.size) stream.dispose = setTimeout(() => {
        if (stream.listeners.size) return;
        stream.stopped = true; clearTimeout(stream.retry);
        if (stream.socket) { stream.socket.onclose = null; stream.socket.close(); }
        streams.delete(key);
      },1000);
    },
  };
}
