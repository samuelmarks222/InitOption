/** Default dashboard source is the platform's explicitly synthetic OTC service. */
export const isInternalOTC = import.meta.env.VITE_MARKET_DATA_MODE !== 'external';
export function marketWebSocketUrl(): string | undefined {
  const configured = isInternalOTC ? import.meta.env.VITE_OTC_WS_URL : import.meta.env.VITE_MARKET_DATA_WS_URL;
  if (configured?.trim()) return configured.trim();
  if (!isInternalOTC || typeof window === 'undefined') return undefined;
  return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/otc/ticks`;
}
export interface OTCQuote {symbol:string;price:number;timestamp:number;sequence:number;session?:string}
const quotes = new Map<string, OTCQuote>();
const listeners = new Set<(quote: OTCQuote) => void>();
export function publishOTCQuote(quote: OTCQuote) {
  quotes.set(quote.symbol, quote);
  for (const listener of listeners) listener(quote);
}
export function latestOTCQuote(symbol: string, maxAge = 2): OTCQuote | undefined {
  const quote = quotes.get(symbol);
  return quote && Date.now()/1000 - quote.timestamp <= maxAge ? quote : undefined;
}
export function subscribeOTCQuotes(listener: (quote: OTCQuote) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** Exact symbol and last server tick at/before expiry, never a different chart's price. */
export async function requestOTCQuote(symbol: string, at?: number): Promise<OTCQuote> {
  const url = new URL(import.meta.env.VITE_OTC_HTTP_URL || '/otc/price', window.location.href);
  url.searchParams.set('symbol', symbol);
  if (at !== undefined) url.searchParams.set('at', String(at));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {signal:controller.signal, cache:'no-store'});
    if (!response.ok) throw new Error('OTC pricing is unavailable; no substitute price will be used');
    const quote = await response.json();
    if (!Number.isSafeInteger(quote.sequence) || quote.source !== 'internal-otc' || quote.symbol !== symbol || !Number.isFinite(quote.price) || quote.price <= 0 || !Number.isFinite(quote.timestamp) ||
      (at !== undefined ? quote.timestamp > at || at - quote.timestamp > .5 : Math.abs(Date.now()/1000 - quote.timestamp) > 2)) throw new Error('Invalid OTC price receipt');
    return quote;
  } finally { clearTimeout(timer); }
}
