import { SMA, ATR, KeltnerChannels, IchimokuCloud, PSAR } from "technicalindicators";
import { OHLCCandle } from "../engine/priceEngine";

export const calcAlligator = (closes: number[], jawP: number, teethP: number, lipsP: number) => {
  const jawSMA = SMA.calculate({ period: jawP, values: closes });
  const teethSMA = SMA.calculate({ period: teethP, values: closes });
  const lipsSMA = SMA.calculate({ period: lipsP, values: closes });

  const jaw = Array(jawSMA.length).fill(null);
  for(let i=8; i<jawSMA.length; i++) jaw[i] = jawSMA[i-8];
  
  const teeth = Array(teethSMA.length).fill(null);
  for(let i=5; i<teethSMA.length; i++) teeth[i] = teethSMA[i-5];
  
  const lips = Array(lipsSMA.length).fill(null);
  for(let i=3; i<lipsSMA.length; i++) lips[i] = lipsSMA[i-3];

  return { jaw, teeth, lips };
};

export const calcEnvelopes = (closes: number[], period: number, deviation: number) => {
  const sma = SMA.calculate({ period, values: closes });
  const d = deviation / 100;
  return sma.map(val => ({
    upper: val * (1 + d),
    lower: val * (1 - d),
  }));
};

export const calcFractal = (highs: number[], lows: number[]) => {
  const up = Array(highs.length).fill(null);
  const down = Array(lows.length).fill(null);
  for (let i = 2; i < highs.length - 2; i++) {
    const isUp = highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2];
    const isDown = lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2];
    if (isUp) up[i] = highs[i];
    if (isDown) down[i] = lows[i];
  }
  return { up, down };
};

export const calcDonchian = (highs: number[], lows: number[], period: number) => {
  const upper = [];
  const lower = [];
  const middle = [];
  for (let i = period - 1; i < highs.length; i++) {
    const h = Math.max(...highs.slice(i - period + 1, i + 1));
    const l = Math.min(...lows.slice(i - period + 1, i + 1));
    upper.push(h);
    lower.push(l);
    middle.push((h + l) / 2);
  }
  return { upper, lower, middle, period };
};

export const calcSupertrend = (highs: number[], lows: number[], closes: number[], period: number, multiplier: number) => {
  const atr = ATR.calculate({ period, high: highs, low: lows, close: closes });
  const trend = [];
  const dir = [];
  
  // Supertrend requires keeping track of basic upper/lower bands and final bands
  let isUp = true;
  let finalUpper = 0;
  let finalLower = 0;
  
  for (let i = 0; i < atr.length; i++) {
    const idx = i + period;
    if (idx >= closes.length) break;
    
    const hl2 = (highs[idx] + lows[idx]) / 2;
    const basicUpper = hl2 + multiplier * atr[i];
    const basicLower = hl2 - multiplier * atr[i];
    
    if (i === 0) {
      finalUpper = basicUpper;
      finalLower = basicLower;
    } else {
      const prevClose = closes[idx - 1];
      finalUpper = (basicUpper < finalUpper || prevClose > finalUpper) ? basicUpper : finalUpper;
      finalLower = (basicLower > finalLower || prevClose < finalLower) ? basicLower : finalLower;
    }
    
    if (isUp && closes[idx] <= finalLower) isUp = false;
    else if (!isUp && closes[idx] >= finalUpper) isUp = true;
    
    trend.push(isUp ? finalLower : finalUpper);
    dir.push(isUp);
  }
  return { trend, dir, period };
};

export const calcAroon = (highs: number[], lows: number[], period: number) => {
  const up = [];
  const down = [];
  for (let i = period; i < highs.length; i++) {
    const subHighs = highs.slice(i - period, i + 1);
    const subLows = lows.slice(i - period, i + 1);
    
    // Find index of max/min from end
    const maxIdx = subHighs.lastIndexOf(Math.max(...subHighs));
    const minIdx = subLows.lastIndexOf(Math.min(...subLows));
    
    up.push(((maxIdx) / period) * 100);
    down.push(((minIdx) / period) * 100);
  }
  return { up, down, period };
};

export const calcZigZag = (closes: number[], deviation: number) => {
  const zag = Array(closes.length).fill(null);
  if (closes.length === 0) return zag;
  
  let lastPivotIdx = 0;
  let lastPivotVal = closes[0];
  let isUp = true; // start direction unknown, guess up
  
  for (let i = 1; i < closes.length; i++) {
    const val = closes[i];
    const dev = (val - lastPivotVal) / lastPivotVal * 100;
    
    if (isUp) {
      if (val > lastPivotVal) {
        lastPivotVal = val;
        lastPivotIdx = i;
      } else if (dev <= -deviation) {
        zag[lastPivotIdx] = lastPivotVal;
        isUp = false;
        lastPivotVal = val;
        lastPivotIdx = i;
      }
    } else {
      if (val < lastPivotVal) {
        lastPivotVal = val;
        lastPivotIdx = i;
      } else if (dev >= deviation) {
        zag[lastPivotIdx] = lastPivotVal;
        isUp = true;
        lastPivotVal = val;
        lastPivotIdx = i;
      }
    }
  }
  // Important: Always anchor the start and end so Lightweight Charts has at least 2 points to draw a line 
  // even if the deviation threshold was never hit. The last point connects to the Live/Latest price.
  zag[0] = closes[0];
  zag[closes.length - 1] = closes[closes.length - 1];
  console.log(`[calcZigZag] Devi=${deviation} | Candles=${closes.length} | Pivots=${zag.filter(x => x !== null).length}`);
  return zag;
};

export const calcMomentum = (closes: number[], period: number) => {
  const res = [];
  for (let i = period; i < closes.length; i++) {
    res.push(closes[i] - closes[i - period]);
  }
  return { res, period };
};

export const calcVolumeOscillator = (volumes: number[], fast: number, slow: number) => {
  const fastSMA = SMA.calculate({ period: fast, values: volumes });
  const slowSMA = SMA.calculate({ period: slow, values: volumes });
  
  const res = [];
  // Align fast to slow
  const diff = slow - fast;
  for (let i = 0; i < slowSMA.length; i++) {
    const f = fastSMA[i + diff] || 0;
    const s = slowSMA[i] || 0;
    res.push(s === 0 ? 0 : ((f - s) / s) * 100);
  }
  return { res, period: slow };
};
