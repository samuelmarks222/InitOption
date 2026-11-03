import { useReducer } from 'react';
import type { ChartType } from '../../ChartToolbar';
import type { SupportedChartTimeframe } from '../priceEngine';
export interface ChartMode {
  type: ChartType;
  timeframe: SupportedChartTimeframe;
  previousTimeframe: SupportedChartTimeframe;
}
type Action = { type: 'chart'; value: ChartType } | { type: 'timeframe'; value: SupportedChartTimeframe };
export function chartModeReducer(state: ChartMode, action: Action): ChartMode {
  if (action.type === 'timeframe') {
    if (state.type === 'line') return state;
    return { ...state, timeframe: action.value, previousTimeframe: action.value };
  }
  if (action.value === state.type) return state;
  if (action.value === 'line') return { type: 'line', timeframe: '5s', previousTimeframe: state.timeframe };
  return { ...state, type: action.value, timeframe: state.type === 'line' ? state.previousTimeframe : state.timeframe };
}
export function useChartMode(type: ChartType = 'candles', timeframe: SupportedChartTimeframe = '5s') {
  const [state, dispatch] = useReducer(chartModeReducer, { type, timeframe: type === 'line' ? '5s' : timeframe, previousTimeframe: timeframe });
  return { chartType: state.type, selectedTf: state.timeframe,
    setChartType: (value: ChartType) => dispatch({ type: 'chart', value }),
    setSelectedTf: (value: SupportedChartTimeframe) => dispatch({ type: 'timeframe', value }) };
}
