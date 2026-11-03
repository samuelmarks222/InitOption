/** Exchange timestamps are Unix seconds. Never round a received price. */
export const intervals = Object.freeze({'5s':5,'10s':10,'15s':15,'30s':30,'1m':60,'2m':120,'3m':180,'4m':240,'5m':300,'10m':600,'15m':900,'30m':1800,'1h':3600,'2h':7200,'4h':14400});
export function validTick(tick) {
  return tick && typeof tick.symbol === 'string' && tick.symbol.length > 0 &&
    Number.isFinite(tick.timestamp) && tick.timestamp >= 0 && Number.isFinite(tick.price) && tick.price > 0 &&
    (tick.sequence === undefined || Number.isSafeInteger(tick.sequence) && tick.sequence >= 0) &&
    (tick.volume === undefined || Number.isFinite(tick.volume) && tick.volume >= 0);
}
export function tickKey(t) { return t.sequence === undefined ? `t:${t.timestamp}:${t.price}:${t.volume ?? ''}` : `s:${t.sequence}`; }
/** Bounded ordered buffer; late historical ticks are inserted without rewinding latest price.
 * Sources/symbols must have separate buffers. Sequence IDs must be stable across reconnects. */
export class TickBuffer {
  constructor({maxTicks = 200000, maxAge = 7 * 86400} = {}) {
    if (!Number.isInteger(maxTicks) || maxTicks < 1 || !Number.isFinite(maxAge) || maxAge <= 0) throw new Error('Invalid tick retention');
    this.maxTicks = maxTicks; this.maxAge = maxAge; this.rows = []; this.keys = new Set(); this.symbol = null;
  }
  insert(tick) {
    if (!validTick(tick) || this.symbol && tick.symbol !== this.symbol) return false;
    const key = tickKey(tick), latest = this.rows.at(-1);
    if (this.keys.has(key) || latest && tick.timestamp < latest.timestamp - this.maxAge) return false;
    this.symbol = tick.symbol;
    const value = {...tick};
    let left = 0, right = this.rows.length;
    while (left < right) {
      const mid = (left + right) >>> 1, row = this.rows[mid];
      if (row.timestamp < value.timestamp || row.timestamp === value.timestamp && (row.sequence ?? 0) <= (value.sequence ?? 0)) left = mid + 1; else right = mid;
    }
    this.rows.splice(left, 0, value); this.keys.add(key);
    const cutoff = this.rows.at(-1).timestamp - this.maxAge;
    let remove = Math.max(0, this.rows.length - this.maxTicks);
    while (remove < this.rows.length && this.rows[remove].timestamp < cutoff) remove++;
    for (const row of this.rows.splice(0, remove)) this.keys.delete(tickKey(row));
    return true;
  }
  get latest() { const row = this.rows.at(-1); return row ? {...row} : null; }
  snapshot() { return this.rows.map(row => ({...row})); }
}
export function aggregateTicks(ticks, seconds) {
  if (!Object.values(intervals).includes(seconds)) throw new Error('Unsupported timeframe');
  const bars = [];
  for (const tick of ticks) {
    if (!validTick(tick)) continue;
    const time = Math.floor(tick.timestamp / seconds) * seconds, previous = bars.at(-1);
    if (previous && previous.time > time) throw new Error('Ticks must be ordered');
    if (previous?.time === time) {
      previous.high = Math.max(previous.high, tick.price); previous.low = Math.min(previous.low, tick.price);
      previous.close = tick.price; previous.volume += tick.volume ?? 1;
    } else bars.push({time, open:tick.price, high:tick.price, low:tick.price, close:tick.price, volume:tick.volume ?? 1});
  }
  return bars;
}
export function heikinAshi(bars) {
  const result = [];
  for (const bar of bars) {
    const prev = result.at(-1), open = prev ? (prev.open + prev.close)/2 : (bar.open + bar.close)/2;
    const close = (bar.open + bar.high + bar.low + bar.close)/4;
    result.push({...bar, open, close, high:Math.max(bar.high, open, close), low:Math.min(bar.low, open, close)});
  }
  return result;
}
/** View changes never subscribe, disconnect, or mutate underlying market prices. */
export class ChartTypeManager {
  constructor() { this.type = 'candles'; this.timeframe = '5s'; this.previous = '5s'; }
  setType(type) {
    if (!['candles','heikinAshi','area','bars'].includes(type)) throw new Error('Invalid chart type');
    if (type === 'area' && this.type !== 'area') { this.previous = this.timeframe; this.timeframe = '5s'; }
    else if (this.type === 'area' && type !== 'area') this.timeframe = this.previous;
    this.type = type;
  }
  setTimeframe(value) {
    if (!intervals[value]) throw new Error('Invalid timeframe');
    if (this.type !== 'area') this.timeframe = value;
  }
  project(buffer) { const bars = aggregateTicks(buffer.snapshot(), intervals[this.timeframe]); return this.type === 'heikinAshi' ? heikinAshi(bars) : bars; }
}
/** Incremental raw OHLC cache. Normal in-order ticks cost O(number of viewed
 * intervals), not O(history). Late history invalidates projections safely. */
export class TickProcessor {
  constructor(options) { this.buffer = new TickBuffer(options); this.cache = new Map(); this.listeners = new Set(); }
  subscribe(callback) { this.listeners.add(callback); return () => this.listeners.delete(callback); }
  ingest(tick) {
    const previous = this.buffer.latest, length = this.buffer.rows.length;
    if (!this.buffer.insert(tick)) return false;
    const late = previous && (tick.timestamp < previous.timestamp || tick.timestamp === previous.timestamp && (tick.sequence ?? 0) < (previous.sequence ?? 0));
    if (late || this.buffer.rows.length <= length) this.cache.clear();
    else for (const [seconds, bars] of this.cache) {
      const time = Math.floor(tick.timestamp / seconds)*seconds, bar = bars.at(-1);
      if (bar?.time === time) { bar.high = Math.max(bar.high,tick.price); bar.low = Math.min(bar.low,tick.price); bar.close = tick.price; bar.volume += tick.volume ?? 1; }
      else bars.push({time,open:tick.price,high:tick.price,low:tick.price,close:tick.price,volume:tick.volume ?? 1});
    }
    // Called synchronously, including indicator subscribers; RAF is paint-only.
    for (const callback of this.listeners) callback(tick,this);
    return true;
  }
  candles(seconds) {
    if (!this.cache.has(seconds)) this.cache.set(seconds,aggregateTicks(this.buffer.snapshot(),seconds));
    return this.cache.get(seconds).map(bar => ({...bar}));
  }
}
