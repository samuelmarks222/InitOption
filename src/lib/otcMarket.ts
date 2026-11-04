/** Default dashboard source is the platform's explicitly synthetic OTC service. */
export const isInternalOTC = import.meta.env.VITE_MARKET_DATA_MODE !== 'external';
export function marketWebSocketUrl(): string | undefined {
  if (isInternalOTC && import.meta.env.VITE_OTC_TRANSPORT !== 'websocket') {
    return import.meta.env.VITE_OTC_API_URL?.trim() || '/api/otc';
  }
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
/** Exact symbol and last server tick at/before expiry, never a different chart's price.
 * Current receipt freshness uses the authoritative server quotedAt, not the device
 * wall clock (which may be minutes off). Both supported servers supply quotedAt. */
export async function requestOTCQuote(symbol: string, at?: number): Promise<OTCQuote> {
  const polling = import.meta.env.VITE_OTC_TRANSPORT !== 'websocket';
  const url = new URL(polling ? (import.meta.env.VITE_OTC_API_URL || '/api/otc') : (import.meta.env.VITE_OTC_HTTP_URL || '/otc/price'), window.location.href);
  if (polling) url.searchParams.set('action','price');
  url.searchParams.set('symbol', symbol);
  if (at !== undefined) url.searchParams.set('at', String(at));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {signal:controller.signal, cache:'no-store'});
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: 'This asset is not available from the OTC pricing service.',
        409: 'OTC pricing is catching up or the requested price is unavailable. Please try again shortly.',
        425: 'The requested expiry has not occurred yet.',
        503: 'OTC pricing storage is unavailable. Please try again shortly.',
      };
      throw new Error(messages[response.status] ?? 'OTC pricing is unavailable. No substitute price will be used.');
    }
    const quote = await response.json();
    if (!Number.isSafeInteger(quote.sequence) || quote.sequence < 0 || quote.source !== 'internal-otc' || quote.symbol !== symbol || !Number.isFinite(quote.price) || quote.price <= 0 || !Number.isFinite(quote.timestamp) || quote.timestamp < 0 ||
      (at !== undefined
        ? quote.timestamp > at || at - quote.timestamp > .5
        : !Number.isFinite(quote.quotedAt) || quote.timestamp > quote.quotedAt || quote.quotedAt - quote.timestamp > .5)) throw new Error('Invalid OTC price receipt');
    return quote;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('OTC price request timed out. Please try again.');
    throw error;
  } finally { clearTimeout(timer); }
}
