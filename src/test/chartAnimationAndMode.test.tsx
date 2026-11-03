// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useChartMode } from '@/components/trading/engine/native/chartMode';
import { heikinAshiCandle } from '@/components/trading/engine/native/animation';
import { heikinAshi } from '@/components/trading/engine/native/marketData';
import { CandleAggregator } from '@/components/trading/engine/native/realtime';
import { resetSync } from '@/lib/serverTimeSync';
import ChartToolbar from '@/components/trading/ChartToolbar';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const bar = { time: 600, open: 100, high: 110, low: 90, close: 105, volume: 6 };
afterEach(() => { cleanup(); vi.useRealTimers(); resetSync(); });
describe('Area mode timeframe contract', () => {
  it('locks atomically to 5s and restores the previous timeframe for every other chart type', () => {
    const { result } = renderHook(() => useChartMode('candles','4h'));
    act(() => result.current.setChartType('line'));
    expect(result.current.selectedTf).toBe('5s');
    act(() => result.current.setSelectedTf('1h'));
    expect(result.current.selectedTf).toBe('5s');
    act(() => result.current.setChartType('bars'));
    expect(result.current.selectedTf).toBe('4h');
    act(() => result.current.setSelectedTf('10s'));
    act(() => result.current.setChartType('line'));
    act(() => result.current.setChartType('line'));
    act(() => result.current.setChartType('heikinAshi'));
    expect(result.current.selectedTf).toBe('10s');
  });
  it('disables the selector and hides a previously opened timeframe menu', () => {
    const props = { selectedTf:'5s' as const, onSelectTf:vi.fn(), onOpenStyleEditor:vi.fn(), activeInds:[], onToggleInd:vi.fn(), activeDrawTool:null, onSelectDrawTool:vi.fn(), onToggleIndicatorsPanel:vi.fn(), onToggleDrawingsPanel:vi.fn() };
    const { rerender } = render(<ChartToolbar {...props} />);
    fireEvent.click(screen.getByTitle('chartToolbar.timeInterval'));
    expect(screen.getByText('4h')).toBeTruthy();
    rerender(<ChartToolbar {...props} timeframeLocked />);
    expect(screen.queryByText('4h')).toBeNull();
    expect((screen.getByLabelText('5 seconds, fixed for Area chart') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('5 seconds, fixed for Area chart'));
    expect(props.onSelectTf).not.toHaveBeenCalled();
  });
});
describe('uninterpolated chart projections', () => {
  it('matches historical Heikin-Ashi formulas on first candle and final close, without a double recursion', () => {
    const first = { ...bar,time:540 };
    const all = heikinAshi([first,bar]);
    expect(heikinAshiCandle(first,[])).toEqual(all[0]);
    expect(heikinAshiCandle(bar,[first])).toEqual(all[1]);
    expect(heikinAshiCandle(bar,[first,bar])).toEqual(all[1]);
  });
});
describe('strict wall-clock interval behavior', () => {
  for (const seconds of [5,14400]) it(`never closes ${seconds}s candles early, regardless of render rate`, () => {
    vi.useFakeTimers(); const start=144000; vi.setSystemTime(start*1000);
    const closed=vi.fn(); const aggregator = new CandleAggregator(seconds,closed,vi.fn());
    aggregator.onTick({timestamp:start,price:100});
    vi.advanceTimersByTime(seconds*1000-1);
    expect(closed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(closed).toHaveBeenCalledTimes(1);
    expect(closed.mock.calls[0][0].time).toBe(start);
    expect(aggregator.getCurrentCandle()?.time).toBe(start+seconds);
    aggregator.destroy();
  });
});
