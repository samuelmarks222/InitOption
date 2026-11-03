import {TickBuffer, validTick} from './ticks.js';
/** Browser-native WebSocket adapter. Connect first, buffer while fetching history,
 * merge by stable tick identity, then deliver one synchronized snapshot. */
export class MarketDataAdapter {
  constructor({url, historyUrl, symbol, mode = 'live', onTick = () => {}, onHistory = () => {}, onStatus = () => {}, buffer = new TickBuffer(), WebSocketImpl = globalThis.WebSocket, fetchImpl = globalThis.fetch}) {
    if (!['live','simulation'].includes(mode)) throw new Error('Explicit market mode required');
    Object.assign(this, {url, historyUrl, symbol, mode, onTick, onHistory, onStatus, buffer, WebSocketImpl, fetchImpl});
    this.generation = 0; this.retry = 0; this.pending = []; this.stopped = true;
  }
  connect() { this.disconnect(); this.stopped = false; this.open(); }
  open() {
    if (this.stopped) return;
    if (!this.url) { this.onStatus('unavailable'); return; }
    const generation = ++this.generation;
    this.loading = !!this.historyUrl; this.pending = [];
    this.onStatus(this.retry ? 'reconnecting' : 'connecting');
    let ws;
    try { ws = new this.WebSocketImpl(this.url); } catch { this.schedule(); return; }
    this.socket = ws;
    ws.onopen = async () => {
      if (this.stopped || generation !== this.generation) return;
      ws.send(JSON.stringify({type:'subscribe',channel:'ticks',symbol:this.symbol}));
      let historyFailed = false, historyTimer;
      try {
        if (this.historyUrl) {
          const url = new URL(this.historyUrl, globalThis.location?.href ?? this.url.replace(/^ws/, 'http'));
          url.searchParams.set('symbol', this.symbol);
          if (this.buffer.latest) url.searchParams.set('from', String(this.buffer.latest.timestamp));
          const abort = new AbortController(); this.abort = abort;
          historyTimer = setTimeout(() => abort.abort(), 15000); this.historyTimer = historyTimer;
          const response = await this.fetchImpl(url, {signal:abort.signal});
          if (!response.ok) throw new Error(`History HTTP ${response.status}`);
          const data = await response.json();
          if (!Array.isArray(data.ticks)) throw new Error('Expected {ticks: [...]} history');
          if (this.stopped || generation !== this.generation) return;
          for (const tick of data.ticks) this.accept(tick, false);
        }
      } catch { historyFailed = true; }
      finally { clearTimeout(historyTimer); }
      if (this.stopped || generation !== this.generation) return;
      this.loading = false;
      for (const tick of this.pending) this.accept(tick, false);
      this.pending = []; this.retry = 0;
      this.onHistory(this.buffer.snapshot());
      this.onStatus(historyFailed ? 'history-unavailable' : this.mode === 'simulation' ? 'simulation' : 'live');
    };
    ws.onmessage = event => {
      if (this.stopped || generation !== this.generation) return;
      try {
        const payload = JSON.parse(event.data), ticks = Array.isArray(payload.ticks) ? payload.ticks : [payload];
        for (const tick of ticks) {
          if (!this.validate(tick)) continue;
          if (this.loading) {
            if (this.pending.length >= this.buffer.maxTicks) { ws.close(1008, 'History synchronization overflow'); return; }
            this.pending.push(tick);
          } else this.accept(tick, true);
        }
      } catch { /* Invalid payload cannot change prices. */ }
    };
    ws.onerror = () => { if (generation === this.generation) ws.close(); };
    ws.onclose = () => {
      if (generation !== this.generation || this.stopped) return;
      this.generation++; this.abort?.abort(); clearTimeout(this.historyTimer); this.schedule();
    };
  }
  validate(tick) {
    return validTick(tick) && tick.symbol === this.symbol && tick.timestamp <= Date.now()/1000 + 30 &&
      (this.mode === 'simulation' ? tick.source === 'simulated' : tick.source !== 'simulated');
  }
  accept(tick, notify) { if (this.validate(tick) && this.buffer.insert(tick) && notify) this.onTick({...tick}, this.buffer); }
  schedule() {
    if (this.stopped) return;
    this.onStatus('reconnecting'); clearTimeout(this.timer);
    this.timer = setTimeout(() => this.open(), Math.min(10000, 500 * 2 ** Math.min(this.retry++, 5)));
  }
  disconnect() {
    this.stopped = true; this.generation++; clearTimeout(this.timer); clearTimeout(this.historyTimer); this.abort?.abort();
    if (this.socket) { this.socket.onclose = null; this.socket.close(); this.socket = null; }
    this.onStatus('disconnected');
  }
}
