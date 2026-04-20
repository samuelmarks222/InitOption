import { useCallback, useMemo, useRef, useState } from "react";
import type { OHLCCandle } from "../engine/priceEngine";
import {
  calculateIndicatorBundle,
  type IndicatorLinePoint,
  type OscillatorIndicatorResult,
  type OverlayIndicatorResult,
} from "./calculations";
import { isOscillatorIndicator, isOverlayIndicator, type ActiveIndicator } from "./types";

export const useIndicators = (activeIndicators: ActiveIndicator[]) => {
  const [oscillatorRenderKey, setOscillatorRenderKey] = useState(0);

  const indicatorCandlesRef = useRef<OHLCCandle[]>([]);
  const indicatorDataMapRef = useRef<Record<string, IndicatorLinePoint[]>>({});
  const overlayResultsRef = useRef<Record<string, OverlayIndicatorResult>>({});
  const oscillatorResultsRef = useRef<Record<string, OscillatorIndicatorResult>>({});
  const indicatorErrorsRef = useRef<Record<string, string | undefined>>({});

  const overlayIndicators = useMemo(
    () => activeIndicators.filter((indicator) => indicator.visible && isOverlayIndicator(indicator)),
    [activeIndicators],
  );

  const oscillatorIndicators = useMemo(
    () => activeIndicators.filter((indicator) => indicator.visible && isOscillatorIndicator(indicator)),
    [activeIndicators],
  );

  const refreshIndicatorData = useCallback(
    (candles: OHLCCandle[]) => {
      indicatorCandlesRef.current = candles;

      const results = calculateIndicatorBundle(activeIndicators, candles);
      indicatorDataMapRef.current = results.indicatorDataMap;
      overlayResultsRef.current = results.overlayById;
      oscillatorResultsRef.current = results.oscillatorById;
      indicatorErrorsRef.current = results.errorsById;

      setOscillatorRenderKey((current) => current + 1);
    },
    [activeIndicators],
  );

  return {
    overlayIndicators,
    oscillatorIndicators,
    indicatorCandlesRef,
    indicatorDataMapRef,
    overlayResultsRef,
    oscillatorResultsRef,
    indicatorErrorsRef,
    oscillatorRenderKey,
    refreshIndicatorData,
  };
};
