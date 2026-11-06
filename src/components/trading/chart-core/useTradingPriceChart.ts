import { useEffect, useRef, useState, type RefObject } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { requestOTCHistory } from '@/lib/otcHistory';
import { isInternalOTC, marketWebSocketUrl } from '@/lib/otcMarket';
import { observedHistory } from '../engine/native/observedHistory';
import type { MarketFeedStatus, MarketTick } from '../engine/marketDataFeed';
import { LightweightChart } from './LightweightChart';
import type { ChartKind } from './lightweightSeries';
import type { Candle } from './candles';

/** Rendering consumes the existing shared feed; it never supplies trade prices. */
export function useTradingPriceChart(container: RefObject<HTMLDivElement>, symbol: string, seconds: number, kind: ChartKind) {
  const chartRef = useRef<LightweightChart | null>(null);
  const callbacks = useRef<{ tick: (tick: MarketTick) => void; history: () => void; status: (status: MarketFeedStatus) => void; error: (error: Error) => void } | null>(null);
  const kindRef = useRef(kind); kindRef.current = kind;
  const [view, setView] = useState<{chart: IChartApi; series: ISeriesApi<any>} | null>(null);
  const [message, setMessage] = useState('Loading chart history…');
  const [status, setStatus] = useState<MarketFeedStatus>('connecting');
  const [historyWarning, setHistoryWarning] = useState('');
  const [liveWarning, setLiveWarning] = useState('');

  useEffect(() => {
    if (!container.current) return;
    const url = marketWebSocketUrl();
    let chart: LightweightChart;
    try {
      // The internal OTC catalog publishes prices at eight decimal places.
      // External feeds currently do not publish per-symbol format metadata.
      chart = new LightweightChart(container.current, seconds, { type: 'price', precision: 8, minMove: 0.00000001 }, kindRef.current);
    } catch (error) {
      console.error('Unable to initialize chart', error);
      setMessage('Chart could not be initialized.');
      return;
    }
    chartRef.current = chart;
    setView({ chart: chart.chart, series: chart.series.getActiveSeries() });
    setMessage('Loading chart history…'); setHistoryWarning(''); setLiveWarning('');
    let alive = true, bars: Candle[] = [], firstPaint = true, loading = false, hasMore = true;
    let liveTimestamp: number | undefined;
    let liveSequence: number | undefined;
    let livePrice: number | undefined;
    let staleTimer: ReturnType<typeof setTimeout> | undefined;
    let waitingForFirstUpdate = false;
    let observedSince: number | undefined;
    let hasSnapshot = false;
    const abort = new AbortController();
    const hasHistoryApi = isInternalOTC && !!url && !/^wss?:/i.test(url);

    function markReceipt() {
      if (!alive) return;
      waitingForFirstUpdate = true;
      clearTimeout(staleTimer);
      setLiveWarning('');
      staleTimer = setTimeout(() => {
        if (alive) setLiveWarning('No recent price updates. The chart is showing the last received data.');
      }, 15000);
    }
    function renderAll(next: Candle[]) {
      if (!alive) return;
      chart.series.setData(next, !firstPaint);
      bars = next;
      if (next.length) {
        if (firstPaint) {
          let count = next.length;
          for (let i = 1; i < next.length; i++) if (next[i].time > next[i - 1].time + seconds) count++;
          chart.chart.timeScale().setVisibleLogicalRange({from: Math.max(0, count - 100), to: count + 5});
          firstPaint = false;
        }
        setMessage('');
      }
    }
    function merge(older: readonly Candle[], newer: readonly Candle[]) {
      const map = new Map<number, Candle>();
      for (const row of older) map.set(row.time, row);
      for (const row of newer) map.set(row.time, row);
      return [...map.values()].sort((a, b) => a.time - b.time);
    }
    async function loadHistory(before: number) {
      if (!hasHistoryApi || !alive || loading || !hasMore || before <= 0) return;
      loading = true;
      try {
        const page = await requestOTCHistory(symbol, seconds, before, abort.signal);
        if (!alive) return;
        hasMore = page.hasMore && page.candles.length > 0;
        // Keep newer snapshot/tick data if the asynchronous page overlaps.
        const present = new Set(bars.map(bar => bar.time));
        if (page.candles.some(candle => !present.has(candle.time))) {
          renderAll(merge(page.candles, bars));
        }
        setHistoryWarning('');
        if (!bars.length) setMessage('No recorded history available for this asset yet.');
      } catch (error) {
        if (!alive || abort.signal.aborted) return;
        setHistoryWarning('Earlier history unavailable.');
        if (!bars.length) setMessage('Chart history is unavailable. Waiting for the price feed.');
      } finally { loading = false; }
    }
    function hydrate() {
      if (!alive || !url) return false;
      const initial = observedHistory.snapshot(url, symbol, seconds, Date.now() / 1000, 5000);
      if (initial.lastTimestamp === undefined) return false;
      markReceipt();
      const snap = observedHistory.snapshot(url, symbol, seconds, initial.lastTimestamp, 5000);
      let received = [...snap.history, ...(snap.current ? [snap.current] : [])];
      // WebSocket snapshots can begin mid-interval. Drop that incomplete first
      // bucket; a closed history page, if available, may later provide it.
      const websocketSnapshot = /^wss?:/i.test(url);
      if ((!isInternalOTC || websocketSnapshot) && received.length) received = received.slice(1);
      if (websocketSnapshot) {
        // A socket snapshot may represent a new server session. Do not retain
        // bars from the previous session when there is no matching cursor.
        bars = [];
        if (!received.length) {
          renderAll([]); hasSnapshot = false; liveTimestamp = undefined; liveSequence = undefined; livePrice = undefined;
          observedSince = initial.lastTimestamp;
          setMessage('Waiting for complete recorded market data…');
          return false;
        }
      }
      if (!received.length) { observedSince = initial.lastTimestamp; return false; }
      const first = received[0].time;
      renderAll([...bars.filter(bar => bar.time < first), ...received]);
      liveTimestamp = initial.lastTimestamp;
      liveSequence = initial.lastSequence;
      livePrice = received[received.length - 1].close;
      hasSnapshot = true;
      return true;
    }
    function onTick(tick: MarketTick) {
      if (!alive || tick.symbol !== symbol || !Number.isFinite(tick.timestamp) || !Number.isFinite(tick.price) || tick.price <= 0) return;
      if (liveTimestamp !== undefined && (tick.timestamp < liveTimestamp ||
          (tick.timestamp === liveTimestamp && tick.sequence !== undefined && liveSequence !== undefined && tick.sequence <= liveSequence) ||
          (tick.timestamp === liveTimestamp && tick.sequence === undefined && tick.price === livePrice))) return;
      if (tick.sequence !== undefined && liveSequence !== undefined && tick.sequence <= liveSequence) return;
      markReceipt();
      const time = Math.floor(tick.timestamp / seconds) * seconds;
      // If no snapshot covered the start of the interval, wait for the next
      // boundary rather than presenting a partially observed candle as complete.
      if (!hasSnapshot) {
        observedSince ??= tick.timestamp;
        if (time < observedSince) {
          setLiveWarning('Waiting for the next complete candle; prices are being received.');
          return;
        }
        hasSnapshot = true;
      }
      const last = bars[bars.length - 1];
      if (last && time < last.time) {
        setLiveWarning('The latest feed timestamp is older than the displayed history. Waiting for current prices.');
        return;
      }
      let next: Candle;
      if (last && time === last.time) {
        next = {...last, high: Math.max(last.high, tick.price), low: Math.min(last.low, tick.price), close: tick.price,
          ...(last.volume === undefined ? {} : {volume: last.volume + 1})};
      } else next = {time, open: tick.price, high: tick.price, low: tick.price, close: tick.price};
      try {
        chart.series.update(next);
      } catch (error) {
        console.warn('Chart update failed; attempting a fresh recorded snapshot.', error);
        try {
          if (hydrate()) return;
        } catch (snapshotError) { console.warn('Chart snapshot recovery failed.', snapshotError); }
        setLiveWarning('Unable to update the chart. Waiting for a valid feed snapshot.');
        return;
      }
      if (last?.time === time) bars[bars.length - 1] = next; else bars.push(next);
      liveTimestamp = tick.timestamp;
      if (tick.sequence !== undefined) liveSequence = tick.sequence;
      livePrice = tick.price;
      if (firstPaint) {
        chart.chart.timeScale().setVisibleLogicalRange({from: -50, to: 5}); firstPaint = false;
      }
      setMessage('');
    }
    callbacks.current = { tick: onTick, history: hydrate, status: next => {
      if (!alive) return;
      setStatus(next);
      if (next === 'live' && !waitingForFirstUpdate) markReceipt();
      if (next === 'reconnecting' || next === 'unavailable' || next === 'catching-up') {
        clearTimeout(staleTimer); waitingForFirstUpdate = false;
        setLiveWarning(next === 'catching-up' ? 'Syncing recorded prices; candles resume when the feed is current.' : next === 'reconnecting' ? 'Price feed reconnecting; candles are paused.' : 'Price feed unavailable; candles are paused.');
        // An external reconnect lacks a snapshot cursor: don't merge a partial
        // interval onto a previously observed candle.
        if (!isInternalOTC) { hasSnapshot = false; observedSince = undefined; liveTimestamp = undefined; liveSequence = undefined; livePrice = undefined; }
        if (!bars.length) setMessage(next === 'unavailable' ? 'Price feed unavailable.' : next === 'catching-up' ? 'Syncing recorded prices…' : 'Reconnecting to the price feed…');
      }
    }, error: error => {
      if (!alive) return;
      const message = error.message;
      if (/OTC API unavailable \(400\)/.test(message)) setLiveWarning('This asset is unavailable from the price service (400).');
      else if (/OTC API unavailable \(429\)/.test(message)) setLiveWarning('Price service rate limit reached (429). Retrying…');
      else if (/OTC API unavailable \(5\d\d\)/.test(message)) setLiveWarning('Price service unavailable. Retrying…');
      else if (/timed out/i.test(message)) setLiveWarning('Price service timed out. Retrying…');
      else if (/invalid|unordered/i.test(message)) setLiveWarning('Price service returned invalid data. Retrying…');
      else if (/not advancing/i.test(message)) setLiveWarning('Price service stopped advancing. Resyncing…');
      else setLiveWarning('Price feed connection failed. Retrying…');
    }};
    hydrate();
    if (hasHistoryApi) void loadHistory(Math.floor(Date.now() / 1000 / seconds) * seconds);
    else if (!bars.length) setMessage('Waiting for recorded market data…');
    const scale = chart.chart.timeScale();
    const onRange = (range: {from: number; to: number} | null) => {
      if (range && range.from < 25 && bars.length && !loading && hasMore) void loadHistory(bars[0].time);
    };
    scale.subscribeVisibleLogicalRangeChange(onRange);
    return () => {
      alive = false; abort.abort(); clearTimeout(staleTimer); callbacks.current = null;
      scale.unsubscribeVisibleLogicalRangeChange(onRange);
      if (chartRef.current === chart) chartRef.current = null;
      // Let the existing drawing overlay unsubscribe before the chart is removed.
      setTimeout(() => chart.destroy(), 0);
    };
  }, [container, symbol, seconds]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.series.setKind(kind);
    setView({ chart: chart.chart, series: chart.series.getActiveSeries() });
  }, [kind]);

  return {
    view, message, status, historyWarning, liveWarning,
    onTick: (tick: MarketTick) => callbacks.current?.tick(tick),
    onHistory: () => callbacks.current?.history(),
    onStatus: (next: MarketFeedStatus) => callbacks.current?.status(next),
    onFeedError: (error: Error) => callbacks.current?.error(error),
    zoom: (direction: 'in' | 'out') => chartRef.current?.zoom(direction),
    latest: () => chartRef.current?.latest(),
    reset: () => chartRef.current?.reset(),
  };
}
