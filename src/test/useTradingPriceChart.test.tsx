import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTradingPriceChart } from '@/components/trading/chart-core/useTradingPriceChart';

const fakes = vi.hoisted(() => ({instances: [] as any[], request: vi.fn(), snapshot: vi.fn()}));
vi.mock('@/lib/otcMarket', () => ({isInternalOTC: true, marketWebSocketUrl: () => '/api/otc'}));
vi.mock('@/lib/otcHistory', () => ({requestOTCHistory: fakes.request}));
vi.mock('@/components/trading/engine/native/observedHistory', () => ({observedHistory: {snapshot: fakes.snapshot}}));
vi.mock('@/components/trading/chart-core/LightweightChart', () => ({LightweightChart: class {
  scale = {setVisibleLogicalRange: vi.fn(), subscribeVisibleLogicalRangeChange: vi.fn(), unsubscribeVisibleLogicalRangeChange: vi.fn()};
  series = {setData: vi.fn(), update: vi.fn(), setKind: vi.fn(), getActiveSeries: vi.fn(() => ({}))};
  chart = {timeScale: () => this.scale};
  zoom = vi.fn(); latest = vi.fn(); reset = vi.fn(); destroy = vi.fn();
  constructor(...args: unknown[]) { fakes.instances.push({instance: this, args}); }
}}));
const ref = {current: document.createElement('div')};
const candle = (time: number, open = 1) => ({time, open, high: open + .2, low: open - .1, close: open + .1, volume: 5});
const empty = {history: [], current: null, lastTimestamp: undefined};
beforeEach(() => {vi.clearAllMocks(); fakes.instances.length = 0; fakes.snapshot.mockReturnValue(empty); fakes.request.mockResolvedValue({candles: [], hasMore: false});});
afterEach(cleanup);

describe('trading chart data integration', () => {
  it('loads recorded history and updates candles from the existing feed without recreating the chart', async () => {
    const old = candle(100);
    fakes.request.mockResolvedValue({candles: [old], hasMore: false});
    const {result} = renderHook(() => useTradingPriceChart(ref, 'EUR/CAD', 5, 'candles'));
    const inst = fakes.instances[0].instance;
    await waitFor(() => expect(inst.series.setData).toHaveBeenCalledWith([old], false));
    const emit = (timestamp:number, price:number) => act(() => result.current.onTick({symbol:'EUR/CAD',timestamp,price,source:'internal-otc'}));
    emit(105.1, 1.1); // incomplete first observed bucket
    expect(inst.series.update).not.toHaveBeenCalled();
    emit(110.1, 1.2); emit(111, 1.5); emit(112, 1.1);
    expect(inst.series.update).toHaveBeenLastCalledWith({time:110,open:1.2,high:1.5,low:1.1,close:1.1});
    expect(inst.series.setData).toHaveBeenCalledTimes(1);
    expect(fakes.instances).toHaveLength(1);
    expect(result.current.message).toBe('');
  });
  it('hydrates recorded snapshot, preserves latest tick when history response arrives late', async () => {
    const current = candle(110);
    fakes.snapshot.mockReturnValue({history: [candle(105)], current, lastTimestamp: 112});
    let resolve!: (value: unknown) => void;
    fakes.request.mockReturnValue(new Promise(r => {resolve = r}));
    const {result} = renderHook(() => useTradingPriceChart(ref, 'EUR/CAD', 5, 'candles'));
    const inst = fakes.instances[0].instance;
    act(() => result.current.onTick({symbol:'EUR/CAD',timestamp:113,price:1.3,source:'internal-otc'}));
    await act(async () => resolve({candles:[candle(100),candle(105)],hasMore:false}));
    expect(inst.series.setData).toHaveBeenLastCalledWith([candle(100),candle(105),{...current,high:1.3,close:1.3,volume:6}], true);
  });
  it('applies distinct sequence-ordered ticks with the same timestamp without resetting the chart', () => {
    fakes.snapshot.mockReturnValue({history: [candle(105)], current: candle(110), lastTimestamp: 112, lastSequence: 10});
    const {result} = renderHook(() => useTradingPriceChart(ref, 'EUR/CAD', 5, 'candles'));
    const inst = fakes.instances[0].instance;
    const emit = (price:number, sequence:number) => act(() => result.current.onTick({symbol:'EUR/CAD',timestamp:112,price,sequence,source:'internal-otc'}));
    emit(1.4, 11); emit(0.8, 12); emit(2, 12); emit(2, 9);
    expect(inst.series.update).toHaveBeenCalledTimes(2);
    expect(inst.series.update).toHaveBeenLastCalledWith({time:110,open:1,high:1.4,low:0.8,close:0.8,volume:7});
    expect(inst.series.setData).toHaveBeenCalledTimes(1);
  });
  it('recovers a failed incremental update using the latest observed snapshot', () => {
    fakes.snapshot.mockReturnValue({history:[candle(105)], current:candle(110), lastTimestamp:112, lastSequence:10});
    const {result} = renderHook(() => useTradingPriceChart(ref, 'EUR/CAD', 5, 'candles'));
    const inst = fakes.instances[0].instance;
    inst.series.update.mockImplementationOnce(() => {throw new Error('renderer out of sync')});
    const next = {...candle(110), high:1.4, close:1.4, volume:6};
    fakes.snapshot.mockReturnValue({history:[candle(105)], current:next, lastTimestamp:113, lastSequence:11});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    act(() => result.current.onTick({symbol:'EUR/CAD',timestamp:113,price:1.4,sequence:11,source:'internal-otc'}));
    expect(inst.series.setData).toHaveBeenLastCalledWith([candle(105),next],true);
    expect(result.current.liveWarning).toBe('');
    warn.mockRestore();
  });
  it('warns if the feed stops advancing and clears the warning on a new tick', async () => {
    vi.useFakeTimers();
    fakes.snapshot.mockReturnValue({history: [candle(105)], current: candle(110), lastTimestamp: 112, lastSequence: 10});
    const {result,unmount} = renderHook(() => useTradingPriceChart(ref, 'EUR/CAD', 5, 'candles'));
    act(() => result.current.onStatus('live'));
    act(() => vi.advanceTimersByTime(15000));
    expect(result.current.liveWarning).toContain('No recent price updates');
    act(() => result.current.onTick({symbol:'EUR/CAD',timestamp:113,price:1.3,sequence:11,source:'internal-otc'}));
    expect(result.current.liveWarning).toBe('');
    act(() => result.current.onStatus('reconnecting'));
    expect(result.current.liveWarning).toContain('reconnecting');
    unmount(); vi.runOnlyPendingTimers(); vi.useRealTimers();
  });
  it('distinguishes sync delays from service errors without displaying raw server details', () => {
    const {result,unmount} = renderHook(() => useTradingPriceChart(ref, 'EUR/CAD', 5, 'candles'));
    act(() => result.current.onStatus('catching-up'));
    expect(result.current.liveWarning).toContain('Syncing recorded prices');
    act(() => result.current.onStatus('reconnecting'));
    act(() => result.current.onFeedError(new Error('OTC API unavailable (503)')));
    expect(result.current.liveWarning).toContain('Price service unavailable');
    act(() => result.current.onFeedError(new Error('private error secret')));
    expect(result.current.liveWarning).not.toContain('secret');
    expect(result.current.liveWarning).toContain('connection failed');
    act(() => result.current.onStatus('live'));
    expect(result.current.liveWarning).toBe('');
    unmount();
  });
  it('changes type without remounting the chart, and cleans up on symbol change', async () => {
    const {rerender, unmount} = renderHook(({symbol, kind}) => useTradingPriceChart(ref, symbol, 5, kind), {initialProps:{symbol:'EUR/CAD',kind:'candles' as 'candles'|'bars'}});
    const first = fakes.instances[0].instance;
    rerender({symbol:'EUR/CAD',kind:'bars'});
    expect(first.series.setKind).toHaveBeenLastCalledWith('bars');
    expect(fakes.instances).toHaveLength(1);
    rerender({symbol:'BTC',kind:'bars'});
    expect(fakes.instances).toHaveLength(2);
    unmount();
    await waitFor(() => expect(first.destroy).toHaveBeenCalledOnce());
    expect(first.scale.unsubscribeVisibleLogicalRangeChange).toHaveBeenCalledOnce();
  });
  it('loads older pages only when the chart scrolls near the start', async () => {
    fakes.request.mockResolvedValueOnce({candles:[candle(105),candle(110)],hasMore:true})
      .mockResolvedValueOnce({candles:[candle(95),candle(100)],hasMore:false});
    renderHook(() => useTradingPriceChart(ref, 'EUR/CAD', 5, 'candles'));
    const inst = fakes.instances[0].instance;
    await waitFor(() => expect(inst.series.setData).toHaveBeenCalledTimes(1));
    const handler = inst.scale.subscribeVisibleLogicalRangeChange.mock.calls[0][0];
    act(() => handler({from:0, to:50}));
    await waitFor(() => expect(inst.series.setData).toHaveBeenLastCalledWith([candle(95),candle(100),candle(105),candle(110)],true));
    expect(fakes.request.mock.calls[1][2]).toBe(105);
    act(() => handler({from:0,to:30}));
    expect(fakes.request).toHaveBeenCalledTimes(2);
  });
  it('shows an unavailable state if no history or live prices are available', async () => {
    fakes.request.mockRejectedValue(new Error('offline'));
    const {result} = renderHook(() => useTradingPriceChart(ref, 'EUR/CAD', 5, 'candles'));
    await waitFor(() => expect(result.current.message).toContain('unavailable'));
    expect(result.current.historyWarning).toContain('unavailable');
  });
});
