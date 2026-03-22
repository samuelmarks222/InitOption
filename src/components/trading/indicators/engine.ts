import { SMA, EMA, WMA, MACD, RSI, BollingerBands, Stochastic, ADX, CCI, ATR, AwesomeOscillator, IchimokuCloud, KeltnerChannels, PSAR } from "technicalindicators";
import { OHLCCandle } from "../engine/priceEngine";
import { ActiveIndicator } from "./types";
import {
  calcAlligator, calcEnvelopes, calcFractal, calcDonchian, calcSupertrend,
  calcAroon, calcZigZag, calcMomentum, calcVolumeOscillator
} from "./customIndicators";

export interface IndicatorOutput {
  id: string;
  data: any[];
}

export const calculateIndicator = (indicator: ActiveIndicator, history: OHLCCandle[]): IndicatorOutput[] => {
  if (history.length === 0) return [];

  // Deduplicate by timestamp (keep last occurrence) and ensure ascending order.
  // This is CRITICAL to prevent "data must be asc ordered by time" errors in Lightweight Charts.
  const seen = new Map<number, OHLCCandle>();
  for (const c of history) seen.set(c.time, c);
  const h = Array.from(seen.values()).sort((a, b) => a.time - b.time);

  const closes = h.map(c => c.close);
  const highs  = h.map(c => c.high);
  const lows   = h.map(c => c.low);

  // mapWithPad: given a result array shorter than h, align it to the end of h.
  const mapWithPad = (res: any[], getValue: (v: any, index: number) => number, extra?: (v: any, index: number) => any) => {
    const pad = h.length - res.length;
    return res
      .map((v, i) => {
        const candle = h[i + pad];
        if (!candle) return null;
        const value = getValue(v, i);
        if (value === undefined || value === null || isNaN(value)) return null;
        return { time: candle.time as any, value, ...(extra ? extra(v, i) : {}) };
      })
      .filter(Boolean) as { time: any; value: number; color?: string }[];
  };

  const p = indicator.params;

  try {
    switch (indicator.configId) {
      case "sma": {
        const method = (p.method || "SMA").toUpperCase();
        let res: number[];
        if (method === "EMA") res = EMA.calculate({ period: p.period || 14, values: closes });
        else if (method === "WMA") res = WMA.calculate({ period: p.period || 14, values: closes });
        else res = SMA.calculate({ period: p.period || 14, values: closes });
        return [{ id: "line", data: mapWithPad(res, v => v) }];
      }

      case "bollinger": {
        const res = BollingerBands.calculate({ period: p.period || 20, stdDev: p.stdDev || 2, values: closes });
        return [
          { id: "upper",  data: mapWithPad(res, v => v.upper)  },
          { id: "middle", data: mapWithPad(res, v => v.middle) },
          { id: "lower",  data: mapWithPad(res, v => v.lower)  },
        ];
      }

      case "macd": {
        const res = MACD.calculate({
          fastPeriod: p.fast || 12,
          slowPeriod: p.slow || 26,
          signalPeriod: p.signal || 9,
          SimpleMAOscillator: false,
          SimpleMASignal: false,
          values: closes,
        });
        return [
          { id: "macd",      data: mapWithPad(res, v => v.MACD)      },
          { id: "signal",    data: mapWithPad(res, v => v.signal)     },
          { id: "histogram", data: mapWithPad(res, v => v.histogram)  },
        ];
      }

      case "rsi": {
        const res = RSI.calculate({ period: p.period || 14, values: closes });
        return [{ id: "line", data: mapWithPad(res, v => v) }];
      }

      case "stochastic": {
        const res = Stochastic.calculate({
          period: p.kPeriod || 14,
          signalPeriod: p.dPeriod || 3,
          high: highs, low: lows, close: closes,
        });
        return [
          { id: "k", data: mapWithPad(res, v => v.k) },
          { id: "d", data: mapWithPad(res, v => v.d) },
        ];
      }

      case "adx": {
        const res = ADX.calculate({ period: p.period || 14, high: highs, low: lows, close: closes });
        return [
          { id: "adx", data: mapWithPad(res, v => v.adx) },
          { id: "pdi", data: mapWithPad(res, v => v.pdi) },
          { id: "mdi", data: mapWithPad(res, v => v.mdi) },
        ];
      }

      case "awesome": {
        const res = AwesomeOscillator.calculate({ fastPeriod: p.fast || 5, slowPeriod: p.slow || 34, high: highs, low: lows });
        return [{ id: "histogram", data: mapWithPad(res, v => v) }];
      }

      case "cci": {
        const res = CCI.calculate({ period: p.period || 14, high: highs, low: lows, close: closes });
        return [{ id: "line", data: mapWithPad(res, v => v) }];
      }

      case "atr": {
        const res = ATR.calculate({ period: p.period || 14, high: highs, low: lows, close: closes });
        return [{ id: "line", data: mapWithPad(res, v => v) }];
      }

      case "alligator": {
        const res = calcAlligator(closes, p.jawPeriod || 13, p.teethPeriod || 8, p.lipsPeriod || 5);
        return [
          { id: "jaw", data: mapWithPad(res.jaw, v => v) },
          { id: "teeth", data: mapWithPad(res.teeth, v => v) },
          { id: "lips", data: mapWithPad(res.lips, v => v) }
        ];
      }

      case "envelopes": {
        const res = calcEnvelopes(closes, p.period || 14, p.deviation || 0.1);
        return [
          { id: "upper", data: mapWithPad(res, v => v.upper) },
          { id: "lower", data: mapWithPad(res, v => v.lower) }
        ];
      }

      case "fractal": {
        const res = calcFractal(highs, lows);
        return [
          { id: "up", data: mapWithPad(res.up, v => v) },
          { id: "down", data: mapWithPad(res.down, v => v) }
        ];
      }

      case "ichimoku": {
        const res = IchimokuCloud.calculate({
          conversionPeriod: p.conversion || 9,
          basePeriod: p.base || 26,
          spanPeriod: p.spanB || 52,
          displacement: p.displacement || 26,
          high: highs, low: lows
        });
        const d = p.displacement || 26;
        const lagging = closes.slice(d); // Shifted back
        return [
          { id: "conversion", data: mapWithPad(res, v => v.conversion) },
          { id: "base", data: mapWithPad(res, v => v.base) },
          { id: "spanA", data: mapWithPad(res, v => v.spanA) },
          { id: "spanB", data: mapWithPad(res, v => v.spanB) },
          { id: "lagging", data: mapWithPad(lagging, v => v) }
        ];
      }

      case "keltner": {
        const res = KeltnerChannels.calculate({
          maPeriod: p.emaPeriod || 20,
          atrPeriod: p.atrPeriod || 10,
          multiplier: p.multiplier || 1,
          useSMA: false, // Quotex specifies EMA
          high: highs, low: lows, close: closes
        });
        return [
          { id: "upper", data: mapWithPad(res, v => v.upper) },
          { id: "middle", data: mapWithPad(res, v => v.middle) },
          { id: "lower", data: mapWithPad(res, v => v.lower) }
        ];
      }

      case "donchian": {
        const res = calcDonchian(highs, lows, p.period || 20);
        return [
          { id: "upper", data: mapWithPad(res.upper, v => v) },
          { id: "middle", data: mapWithPad(res.middle, v => v) },
          { id: "lower", data: mapWithPad(res.lower, v => v) }
        ];
      }

      case "supertrend": {
        const res = calcSupertrend(highs, lows, closes, p.period || 10, p.multiplier || 3);
        const upColor = p.upColor || "#2ecc71";
        const downColor = p.downColor || "#e74c3c";
        const trendData = mapWithPad(res.trend, (v) => v, (v, i) => ({ color: res.dir[i] ? upColor : downColor }));
        return [{ id: "trend", data: trendData }];
      }

      case "parabolic": {
        const res = PSAR.calculate({ step: p.step || 0.02, max: p.max || 0.2, high: highs, low: lows });
        return [{ id: "sar", data: mapWithPad(res, v => v) }];
      }

      case "zigzag": {
        const res = calcZigZag(closes, p.deviation || 0.1);
        // Zigzag is sparse; filter out all the nulls so we only return the actual pivot points.
        // Lightweight Charts line series will draw straight lines connecting these sparse points.
        const mapped = mapWithPad(res, v => v).filter(d => d.value !== null && d.value !== undefined);
        console.log(`[Engine] Zigzag returning ${mapped.length} points to chart renderer`);
        return [{ id: "zag", data: mapped }];
      }

      case "aroon": {
        const res = calcAroon(highs, lows, p.period || 14);
        return [
          { id: "up", data: mapWithPad(res.up, v => v) },
          { id: "down", data: mapWithPad(res.down, v => v) }
        ];
      }

      case "momentum": {
        const res = calcMomentum(closes, p.period || 14);
        return [{ id: "line", data: mapWithPad(res.res, v => v) }];
      }

      case "volumeOsc": {
        const volumes = h.map(c => c.volume);
        const res = calcVolumeOscillator(volumes, p.fast || 5, p.slow || 14);
        return [{ id: "line", data: mapWithPad(res.res, v => v) }];
      }

      default:
        return [];
    }
  } catch (e) {
    console.error(`[engine] Error calculating ${indicator.configId}:`, e);
    return [];
  }
};
