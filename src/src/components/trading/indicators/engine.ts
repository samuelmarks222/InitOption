import {
  ADX,
  ATR,
  AwesomeOscillator,
  BollingerBands,
  CCI,
  IchimokuCloud,
  KeltnerChannels,
  MACD,
  PSAR,
  ROC,
  RSI,
  WilliamsR,
} from "technicalindicators";
import { OHLCCandle } from "../engine/priceEngine";
import { ActiveIndicator } from "./types";
import {
  buildMovingAverage,
  calcAlligator,
  calcAroon,
  calcBearsPower,
  calcBullsPower,
  calcDeMarker,
  calcDonchian,
  calcEnvelopes,
  calcFractal,
  calcMomentum,
  calcSupertrend,
  calcStochastic,
  calcVolumeOscillator,
  calcVortex,
  calcZigZag,
} from "./customIndicators";

export interface IndicatorOutput {
  id: string;
  data: any[];
}

const getSourceValues = (history: OHLCCandle[], source?: string) => {
  switch (String(source || "close").toLowerCase()) {
    case "open":
      return history.map((candle) => candle.open);
    case "high":
      return history.map((candle) => candle.high);
    case "low":
      return history.map((candle) => candle.low);
    default:
      return history.map((candle) => candle.close);
  }
};

export const calculateIndicator = (indicator: ActiveIndicator, history: OHLCCandle[]): IndicatorOutput[] => {
  if (history.length === 0) return [];

  const deduped = new Map<number, OHLCCandle>();
  for (const candle of history) deduped.set(candle.time, candle);
  const h = Array.from(deduped.values()).sort((left, right) => left.time - right.time);

  const closes = h.map((candle) => candle.close);
  const highs = h.map((candle) => candle.high);
  const lows = h.map((candle) => candle.low);
  const source = getSourceValues(h, indicator.params.source);
  const p = indicator.params;

  const mapWithPad = (
    result: any[],
    getValue: (value: any, index: number) => number,
    extra?: (value: any, index: number) => any,
  ) => {
    const pad = h.length - result.length;
    return result
      .map((value, index) => {
        const candle = h[index + pad];
        if (!candle) return null;

        const resolvedValue = getValue(value, index);
        if (resolvedValue === undefined || resolvedValue === null || Number.isNaN(resolvedValue)) {
          return null;
        }

        return {
          time: candle.time as any,
          value: resolvedValue,
          ...(extra ? extra(value, index) : {}),
        };
      })
      .filter(Boolean) as { time: any; value: number; color?: string }[];
  };

  const constantLine = (level: number) => Array(h.length).fill(level);

  try {
    switch (indicator.configId) {
      case "sma": {
        const result = buildMovingAverage(source, p.period || 14, p.method || "SMA");
        return [{ id: "line", data: mapWithPad(result, (value) => value) }];
      }

      case "bollinger": {
        const result = BollingerBands.calculate({
          period: p.period || 20,
          stdDev: p.stdDev || 2,
          values: source,
        });
        return [
          { id: "upper", data: mapWithPad(result, (value) => value.upper) },
          { id: "middle", data: mapWithPad(result, (value) => value.middle) },
          { id: "lower", data: mapWithPad(result, (value) => value.lower) },
        ];
      }

      case "alligator": {
        const result = calcAlligator(
          source,
          p.jawPeriod || 13,
          p.jawShift || 8,
          p.teethPeriod || 8,
          p.teethShift || 5,
          p.lipsPeriod || 5,
          p.lipsShift || 3,
        );
        return [
          { id: "lips", data: mapWithPad(result.lips, (value) => value) },
          { id: "teeth", data: mapWithPad(result.teeth, (value) => value) },
          { id: "jaw", data: mapWithPad(result.jaw, (value) => value) },
        ];
      }

      case "envelopes": {
        const result = calcEnvelopes(source, p.period || 14, p.deviation || 0.01, p.method || "SMA");
        return [
          { id: "upper", data: mapWithPad(result, (value) => value.upper) },
          { id: "middle", data: mapWithPad(result, (value) => value.middle) },
          { id: "lower", data: mapWithPad(result, (value) => value.lower) },
        ];
      }

      case "fractal": {
        const result = calcFractal(highs, lows, p.period || 2);
        return [
          { id: "up", data: mapWithPad(result.up, (value) => value) },
          { id: "down", data: mapWithPad(result.down, (value) => value) },
        ];
      }

      case "ichimoku": {
        const result = IchimokuCloud.calculate({
          conversionPeriod: p.conversion || 9,
          basePeriod: p.base || 26,
          spanPeriod: p.spanB || 52,
          displacement: p.base || 26,
          high: highs,
          low: lows,
        });
        const displacement = p.base || 26;
        const lagging = closes.slice(displacement);
        return [
          { id: "conversion", data: mapWithPad(result, (value) => value.conversion) },
          { id: "base", data: mapWithPad(result, (value) => value.base) },
          { id: "spanA", data: mapWithPad(result, (value) => value.spanA) },
          { id: "spanB", data: mapWithPad(result, (value) => value.spanB) },
          { id: "lagging", data: mapWithPad(lagging, (value) => value) },
        ];
      }

      case "keltner": {
        const result = KeltnerChannels.calculate({
          maPeriod: p.emaPeriod || 20,
          atrPeriod: p.atrPeriod || 10,
          multiplier: p.multiplier || 1,
          useSMA: false,
          high: highs,
          low: lows,
          close: closes,
        });
        return [
          { id: "upper", data: mapWithPad(result, (value) => value.upper) },
          { id: "middle", data: mapWithPad(result, (value) => value.middle) },
          { id: "lower", data: mapWithPad(result, (value) => value.lower) },
        ];
      }

      case "donchian": {
        const result = calcDonchian(highs, lows, p.period || 20);
        return [
          { id: "upper", data: mapWithPad(result.upper, (value) => value) },
          { id: "middle", data: mapWithPad(result.middle, (value) => value) },
          { id: "lower", data: mapWithPad(result.lower, (value) => value) },
        ];
      }

      case "supertrend": {
        const result = calcSupertrend(highs, lows, closes, p.period || 10, p.multiplier || 3);
        return [
          {
            id: "trend",
            data: mapWithPad(
              result.trend,
              (value) => value,
              (_value, index) => ({
                color: result.dir[index] ? p.upColor || "#22c55e" : p.downColor || "#ef4444",
              }),
            ),
          },
        ];
      }

      case "parabolic": {
        const result = PSAR.calculate({
          step: p.step || 0.02,
          max: p.max || 0.2,
          high: highs,
          low: lows,
        });
        return [{ id: "sar", data: mapWithPad(result, (value) => value) }];
      }

      case "zigzag": {
        const result = calcZigZag(
          highs,
          lows,
          p.deviation || 5,
          p.depth || 12,
          p.backstep || 3,
        );
        return [{ id: "zag", data: mapWithPad(result, (value) => value) }];
      }

      case "macd": {
        const result = MACD.calculate({
          fastPeriod: p.fast || 12,
          slowPeriod: p.slow || 26,
          signalPeriod: p.signal || 9,
          SimpleMAOscillator: false,
          SimpleMASignal: false,
          values: closes,
        });
        return [
          { id: "histogram", data: mapWithPad(result, (value) => value.histogram) },
          { id: "macd", data: mapWithPad(result, (value) => value.MACD) },
          { id: "signal", data: mapWithPad(result, (value) => value.signal) },
        ];
      }

      case "rsi": {
        const result = RSI.calculate({ period: p.period || 14, values: source });
        return [
          { id: "line", data: mapWithPad(result, (value) => value) },
          { id: "overbought", data: mapWithPad(constantLine(p.overbought ?? 70), (value) => value) },
          { id: "oversold", data: mapWithPad(constantLine(p.oversold ?? 30), (value) => value) },
        ];
      }

      case "stochastic": {
        const result = calcStochastic(
          highs,
          lows,
          closes,
          p.kPeriod || 14,
          p.dPeriod || 3,
          p.slowing || 3,
          p.method || "SMA",
        );
        return [
          { id: "k", data: mapWithPad(result.k, (value) => value) },
          { id: "d", data: mapWithPad(result.d, (value) => value) },
          { id: "overbought", data: mapWithPad(constantLine(p.overbought ?? 70), (value) => value) },
          { id: "oversold", data: mapWithPad(constantLine(p.oversold ?? 30), (value) => value) },
        ];
      }

      case "adx": {
        const result = ADX.calculate({
          period: p.period || 14,
          high: highs,
          low: lows,
          close: closes,
        });
        return [
          { id: "adx", data: mapWithPad(result, (value) => value.adx) },
          { id: "pdi", data: mapWithPad(result, (value) => value.pdi) },
          { id: "mdi", data: mapWithPad(result, (value) => value.mdi) },
        ];
      }

      case "aroon": {
        const result = calcAroon(highs, lows, p.period || 14);
        return [
          { id: "up", data: mapWithPad(result.up, (value) => value) },
          { id: "down", data: mapWithPad(result.down, (value) => value) },
        ];
      }

      case "awesome": {
        const result = AwesomeOscillator.calculate({
          fastPeriod: p.fast || 5,
          slowPeriod: p.slow || 34,
          high: highs,
          low: lows,
        });
        return [{ id: "histogram", data: mapWithPad(result, (value) => value) }];
      }

      case "cci": {
        const result = CCI.calculate({
          period: p.period || 20,
          high: highs,
          low: lows,
          close: closes,
        });
        return [{ id: "line", data: mapWithPad(result, (value) => value) }];
      }

      case "momentum": {
        const result = calcMomentum(source, p.period || 10);
        return [{ id: "line", data: mapWithPad(result.res, (value) => value) }];
      }

      case "roc": {
        const result = ROC.calculate({ period: p.period || 14, values: source });
        return [{ id: "line", data: mapWithPad(result, (value) => value) }];
      }

      case "williamsR": {
        const result = WilliamsR.calculate({
          period: p.period || 14,
          high: highs,
          low: lows,
          close: closes,
        });
        return [
          { id: "line", data: mapWithPad(result, (value) => value) },
          { id: "upperBand", data: mapWithPad(constantLine(-20), (value) => value) },
          { id: "lowerBand", data: mapWithPad(constantLine(-80), (value) => value) },
        ];
      }

      case "demarker": {
        const result = calcDeMarker(highs, lows, p.period || 14);
        return [
          { id: "line", data: mapWithPad(result, (value) => value) },
          { id: "overbought", data: mapWithPad(constantLine(p.overbought ?? 0.7), (value) => value) },
          { id: "oversold", data: mapWithPad(constantLine(p.oversold ?? 0.3), (value) => value) },
        ];
      }

      case "bullsPower": {
        const result = calcBullsPower(highs, closes, p.period || 13);
        return [{ id: "line", data: mapWithPad(result, (value) => value) }];
      }

      case "bearsPower": {
        const result = calcBearsPower(lows, closes, p.period || 13);
        return [{ id: "line", data: mapWithPad(result, (value) => value) }];
      }

      case "vortex": {
        const result = calcVortex(highs, lows, closes, p.period || 14);
        return [
          { id: "viPlus", data: mapWithPad(result.viPlus, (value) => value) },
          { id: "viMinus", data: mapWithPad(result.viMinus, (value) => value) },
        ];
      }

      case "atr": {
        const result = ATR.calculate({
          period: p.period || 10,
          high: highs,
          low: lows,
          close: closes,
        });
        return [{ id: "line", data: mapWithPad(result, (value) => value) }];
      }

      case "volumeOsc": {
        const volumes = h.map((candle) => candle.volume);
        const result = calcVolumeOscillator(volumes, p.fast || 5, p.slow || 14);
        return [{ id: "histogram", data: mapWithPad(result.res, (value) => value) }];
      }

      default:
        return [];
    }
  } catch (error) {
    console.error(`[engine] Error calculating ${indicator.configId}:`, error);
    return [];
  }
};
