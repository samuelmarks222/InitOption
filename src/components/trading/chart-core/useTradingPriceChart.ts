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
  const callbacks = useRef<{ tick: (tick: MarketTick) => void; history: () => void; status: (status: MarketFeedStatus) => void } | null>(null);
  const kindRef = useRef(kind); kindRef.current = kind;
  const [view, setView] = useState<{chart: IChartApi; series: ISeriesApi<any>} | null>(null);
  const [message, setMessage] = useState('Loading chart history…');
  const [status, setStatus] = useState<MarketFeedStatus>('connecting');
  const [historyWarning, setHistoryWarning] = useState('');

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
    setMessage('Loading chart history…'); setHistoryWarning('');
    let alive = true, bars: Candle[] = [], firstPaint = true, loading = false, hasMore = true;
    let liveTimestamp: number | undefined;
    let observedSince: number | undefined;
    let hasSnapshot = false;
    const abort = new AbortController();
    const hasHistoryApi = isInternalOTC && !!url && !/^wss?:/i.test(url);

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
        renderAll(merge(page.candles, bars));
        setHistoryWarning('');
        if (!bars.length) setMessage('No recorded history available for this asset yet.');
      } catch (error) {
        if (!alive || abort.signal.aborted) return;
        setHistoryWarning('Earlier history unavailable.');
        if (!bars.length) setMessage('Chart history is unavailable. Waiting for the price feed.');
      } finally { loading = false; }
    }
    function hydrate() {
      if (!alive || !url) return;
      const initial = observedHistory.snapshot(url, symbol, seconds, Date.now() / 1000, 5000);
      if (initial.lastTimestamp === undefined) return;
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
          renderAll([]); hasSnapshot = false; liveTimestamp = undefined;
          observedSince = initial.lastTimestamp;
          setMessage('Waiting for complete recorded market data…');
          return;
        }
      }
      if (!received.length) { observedSince = initial.lastTimestamp; return; }
      liveTimestamp = initial.lastTimestamp; hasSnapshot = true;
      const first = received[0].time;
      renderAll([...bars.filter(bar => bar.time < first), ...received]);
    }
    function onTick(tick: MarketTick) {
      if (!alive || tick.symbol !== symbol || !Number.isFinite(tick.timestamp) || !Number.isFinite(tick.price) || tick.price <= 0) return;
      if (liveTimestamp !== undefined && tick.timestamp <= liveTimestamp) return;
      const time = Math.floor(tick.timestamp / seconds) * seconds;
      // If no snapshot covered the start of the interval, wait for the next
      // boundary rather than presenting a partially observed candle as complete.
      if (!hasSnapshot) {
        observedSince ??= tick.timestamp;
        if (time < observedSince) return;
        hasSnapshot = true;
      }
      const last = bars[bars.length - 1];
      if (last && time < last.time) return;
      let next: Candle;
      if (last && time === last.time) {
        next = {...last, high: Math.max(last.high, tick.price), low: Math.min(last.low, tick.price), close: tick.price,
          ...(last.volume === undefined ? {} : {volume: last.volume + 1})};
      } else next = {time, open: tick.price, high: tick.price, low: tick.price, close: tick.price};
      chart.series.update(next);
      if (last?.time === time) bars[bars.length - 1] = next; else bars.push(next);
      liveTimestamp = tick.timestamp;
      if (firstPaint) {
        chart.chart.timeScale().setVisibleLogicalRange({from: -50, to: 5}); firstPaint = false;
      }
      setMessage('');
    }
    callbacks.current = { tick: onTick, history: hydrate, status: next => {
      if (!alive) return;
      setStatus(next);
      if (next === 'reconnecting' || next === 'unavailable') {
        // An external reconnect lacks a snapshot cursor: don't merge a partial
        // interval onto a previously observed candle.
        if (!isInternalOTC) { hasSnapshot = false; observedSince = undefined; liveTimestamp = undefined; }
        if (!bars.length) setMessage(next === 'unavailable' ? 'Price feed unavailable.' : 'Reconnecting to the price feed…');
      }
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
      alive = false; abort.abort(); callbacks.current = null;
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
    view, message, status, historyWarning,
    onTick: (tick: MarketTick) => callbacks.current?.tick(tick),
    onHistory: () => callbacks.current?.history(),
    onStatus: (next: MarketFeedStatus) => callbacks.current?.status(next),
    zoom: (direction: 'in' | 'out') => chartRef.current?.zoom(direction),
    latest: () => chartRef.current?.latest(),
    reset: () => chartRef.current?.reset(),
  };
}
