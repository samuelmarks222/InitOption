import { EMA, SMA, WMA } from "technicalindicators";

const clampPeriod = (period: number) => Math.max(1, Math.round(period || 1));

const calcSMMA = (values: number[], period: number) => {
  const safePeriod = clampPeriod(period);
  if (values.length < safePeriod) return [] as number[];

  const seed = values.slice(0, safePeriod).reduce((sum, value) => sum + value, 0) / safePeriod;
  const result = [seed];

  for (let index = safePeriod; index < values.length; index++) {
    const previous = result[result.length - 1];
    result.push(((previous * (safePeriod - 1)) + values[index]) / safePeriod);
  }

  return result;
};

const calcTMA = (values: number[], period: number) => {
  const safePeriod = clampPeriod(period);
  const firstPeriod = Math.ceil((safePeriod + 1) / 2);
  const secondPeriod = Math.floor((safePeriod + 1) / 2);
  const firstPass = SMA.calculate({ period: firstPeriod, values });
  return SMA.calculate({ period: secondPeriod, values: firstPass });
};

export const buildMovingAverage = (values: number[], period: number, method = "SMA") => {
  const normalizedMethod = String(method || "SMA").toUpperCase();
  const safePeriod = clampPeriod(period);

  if (normalizedMethod === "EMA") {
    return EMA.calculate({ period: safePeriod, values });
  }

  if (normalizedMethod === "WMA") {
    return WMA.calculate({ period: safePeriod, values });
  }

  if (normalizedMethod === "SMMA") {
    return calcSMMA(values, safePeriod);
  }

  if (normalizedMethod === "TMA") {
    return calcTMA(values, safePeriod);
  }

  return SMA.calculate({ period: safePeriod, values });
};

export const calcAlligator = (
  closes: number[],
  jawPeriod: number,
  jawShift: number,
  teethPeriod: number,
  teethShift: number,
  lipsPeriod: number,
  lipsShift: number,
) => {
  const jawBase = buildMovingAverage(closes, jawPeriod, "SMMA");
  const teethBase = buildMovingAverage(closes, teethPeriod, "SMMA");
  const lipsBase = buildMovingAverage(closes, lipsPeriod, "SMMA");

  const shiftForward = (values: number[], shift: number) => {
    const normalizedShift = Math.max(0, Math.round(shift || 0));
    const result = Array(values.length).fill(null);
    for (let index = normalizedShift; index < values.length; index++) {
      result[index] = values[index - normalizedShift];
    }
    return result;
  };

  return {
    jaw: shiftForward(jawBase, jawShift),
    teeth: shiftForward(teethBase, teethShift),
    lips: shiftForward(lipsBase, lipsShift),
  };
};

export const calcEnvelopes = (
  closes: number[],
  period: number,
  deviation: number,
  method = "SMA",
) => {
  const base = buildMovingAverage(closes, period, method);
  const factor = Math.max(0, Number(deviation || 0)) / 100;
  return base.map((middle) => ({
    upper: middle * (1 + factor),
    middle,
    lower: middle * (1 - factor),
  }));
};

export const calcFractal = (highs: number[], lows: number[], period: number) => {
  const span = Math.max(2, Math.round(period || 2));
  const up = Array(highs.length).fill(null);
  const down = Array(lows.length).fill(null);

  for (let index = span; index < highs.length - span; index++) {
    const highWindow = highs.slice(index - span, index + span + 1);
    const lowWindow = lows.slice(index - span, index + span + 1);
    const currentHigh = highs[index];
    const currentLow = lows[index];

    if (currentHigh === Math.max(...highWindow) && highWindow.filter((value) => value === currentHigh).length === 1) {
      up[index] = currentHigh;
    }

    if (currentLow === Math.min(...lowWindow) && lowWindow.filter((value) => value === currentLow).length === 1) {
      down[index] = currentLow;
    }
  }

  return { up, down };
};

const getPricePrecisionFromValue = (value: number) => {
  const normalized = Math.abs(Number.isFinite(value) ? value : 1);
  if (normalized > 10000) return 2;
  if (normalized > 100) return 3;
  if (normalized > 1) return 5;
  return 6;
};

const estimatePointSize = (values: number[]) => {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  const referenceValue = finiteValues[Math.floor(finiteValues.length / 2)] ?? finiteValues[0] ?? 1;
  return 10 ** -getPricePrecisionFromValue(referenceValue);
};

export const calcDonchian = (highs: number[], lows: number[], period: number) => {
  const safePeriod = clampPeriod(period);
  const upper = [];
  const lower = [];
  const middle = [];

  for (let index = safePeriod - 1; index < highs.length; index++) {
    const highSlice = highs.slice(index - safePeriod + 1, index + 1);
    const lowSlice = lows.slice(index - safePeriod + 1, index + 1);
    const top = Math.max(...highSlice);
    const bottom = Math.min(...lowSlice);
    upper.push(top);
    lower.push(bottom);
    middle.push((top + bottom) / 2);
  }

  return { upper, lower, middle, period: safePeriod };
};

export const calcSupertrend = (
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
  multiplier: number,
) => {
  const atr = EMA.calculate({
    period: clampPeriod(period),
    values: highs.map((high, index) => {
      if (index === 0) return high - lows[index];
      return Math.max(
        high - lows[index],
        Math.abs(high - closes[index - 1]),
        Math.abs(lows[index] - closes[index - 1]),
      );
    }),
  });

  const trend = [];
  const dir = [];
  let isUpTrend = true;
  let finalUpper = 0;
  let finalLower = 0;

  for (let index = 0; index < atr.length; index++) {
    const candleIndex = index + 1;
    if (candleIndex >= closes.length) break;

    const hl2 = (highs[candleIndex] + lows[candleIndex]) / 2;
    const basicUpper = hl2 + multiplier * atr[index];
    const basicLower = hl2 - multiplier * atr[index];

    if (index === 0) {
      finalUpper = basicUpper;
      finalLower = basicLower;
    } else {
      const previousClose = closes[candleIndex - 1];
      finalUpper = basicUpper < finalUpper || previousClose > finalUpper ? basicUpper : finalUpper;
      finalLower = basicLower > finalLower || previousClose < finalLower ? basicLower : finalLower;
    }

    if (isUpTrend && closes[candleIndex] <= finalLower) isUpTrend = false;
    else if (!isUpTrend && closes[candleIndex] >= finalUpper) isUpTrend = true;

    trend.push(isUpTrend ? finalLower : finalUpper);
    dir.push(isUpTrend);
  }

  return { trend, dir, period: clampPeriod(period) };
};

export const calcAroon = (highs: number[], lows: number[], period: number) => {
  const safePeriod = clampPeriod(period);
  const up = [];
  const down = [];

  for (let index = safePeriod; index < highs.length; index++) {
    const highSlice = highs.slice(index - safePeriod, index + 1);
    const lowSlice = lows.slice(index - safePeriod, index + 1);
    const highIndex = highSlice.lastIndexOf(Math.max(...highSlice));
    const lowIndex = lowSlice.lastIndexOf(Math.min(...lowSlice));
    up.push((highIndex / safePeriod) * 100);
    down.push((lowIndex / safePeriod) * 100);
  }

  return { up, down, period: safePeriod };
};

export const calcStochastic = (
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number,
  dPeriod: number,
  slowing: number,
  method = "SMA",
) => {
  const safeK = clampPeriod(kPeriod);
  const safeD = clampPeriod(dPeriod);
  const safeSlowing = clampPeriod(slowing);
  const rawK = [];

  for (let index = safeK - 1; index < closes.length; index++) {
    const highSlice = highs.slice(index - safeK + 1, index + 1);
    const lowSlice = lows.slice(index - safeK + 1, index + 1);
    const highestHigh = Math.max(...highSlice);
    const lowestLow = Math.min(...lowSlice);
    const denominator = highestHigh - lowestLow;
    rawK.push(denominator === 0 ? 0 : ((closes[index] - lowestLow) / denominator) * 100);
  }

  const k = buildMovingAverage(rawK, safeSlowing, method);
  const d = buildMovingAverage(k, safeD, method);

  return { k, d };
};

export const calcZigZag = (
  highs: number[],
  lows: number[],
  deviation: number,
  depth: number,
  backstep: number,
) => {
  const size = Math.min(highs.length, lows.length);
  const result = Array(size).fill(null);
  if (size === 0) return result;

  const safeDepth = Math.max(2, Math.round(depth || 12));
  const safeBackstep = Math.max(1, Math.round(backstep || 3));
  const pointSize = estimatePointSize([...highs, ...lows]);
  const threshold = Math.max(pointSize, Number(deviation || 0) * pointSize);

  type Pivot = { index: number; value: number; type: "high" | "low" };

  const selectMoreExtremePivot = (left: Pivot, right: Pivot) => {
    if (left.type !== right.type) return right;
    if (left.type === "high") {
      return right.value >= left.value ? right : left;
    }
    return right.value <= left.value ? right : left;
  };

  const rawCandidates: Pivot[] = [];

  for (let index = safeDepth - 1; index < size; index++) {
    const windowStart = Math.max(0, index - safeDepth + 1);
    const windowHighs = highs.slice(windowStart, index + 1);
    const windowLows = lows.slice(windowStart, index + 1);
    const currentHigh = highs[index];
    const currentLow = lows[index];
    const highestHigh = Math.max(...windowHighs);
    const lowestLow = Math.min(...windowLows);
    const forwardHighs = highs.slice(index + 1, Math.min(size, index + safeBackstep + 1));
    const forwardLows = lows.slice(index + 1, Math.min(size, index + safeBackstep + 1));
    const isHighCandidate =
      currentHigh >= highestHigh
      && forwardHighs.every((value) => currentHigh >= value)
      && currentHigh - lowestLow >= threshold;
    const isLowCandidate =
      currentLow <= lowestLow
      && forwardLows.every((value) => currentLow <= value)
      && highestHigh - currentLow >= threshold;

    if (isHighCandidate) {
      rawCandidates.push({ index, value: currentHigh, type: "high" });
    }

    if (isLowCandidate) {
      rawCandidates.push({ index, value: currentLow, type: "low" });
    }
  }

  const dedupedCandidates = rawCandidates.reduce<Pivot[]>((accumulator, candidate) => {
    const previous = accumulator[accumulator.length - 1];
    if (!previous) {
      accumulator.push(candidate);
      return accumulator;
    }

    if (previous.type === candidate.type && candidate.index - previous.index <= safeBackstep) {
      accumulator[accumulator.length - 1] = selectMoreExtremePivot(previous, candidate);
      return accumulator;
    }

    if (previous.index === candidate.index) {
      accumulator[accumulator.length - 1] = selectMoreExtremePivot(previous, candidate);
      return accumulator;
    }

    accumulator.push(candidate);
    return accumulator;
  }, []);

  const pivots = dedupedCandidates.reduce<Pivot[]>((accumulator, candidate) => {
    const previous = accumulator[accumulator.length - 1];
    if (!previous) {
      accumulator.push(candidate);
      return accumulator;
    }

    if (previous.type === candidate.type) {
      accumulator[accumulator.length - 1] = selectMoreExtremePivot(previous, candidate);
      return accumulator;
    }

    if (candidate.index - previous.index < safeDepth) {
      return accumulator;
    }

    if (Math.abs(candidate.value - previous.value) < threshold) {
      return accumulator;
    }

    accumulator.push(candidate);
    return accumulator;
  }, []);

  const addBoundaryPivot = (pivot: Pivot | null) => {
    if (!pivot) return;
    const existing = pivots.findIndex((entry) => entry.index === pivot.index);
    if (existing >= 0) {
      pivots[existing] = selectMoreExtremePivot(pivots[existing], pivot);
      return;
    }
    pivots.push(pivot);
  };

  const firstPivot = pivots[0] ?? null;
  if (firstPivot && firstPivot.index > 0) {
    if (firstPivot.type === "high") {
      let lowIndex = 0;
      for (let index = 1; index <= firstPivot.index; index++) {
        if (lows[index] <= lows[lowIndex]) lowIndex = index;
      }
      if (firstPivot.value - lows[lowIndex] >= threshold) {
        addBoundaryPivot({ index: lowIndex, value: lows[lowIndex], type: "low" });
      }
    } else {
      let highIndex = 0;
      for (let index = 1; index <= firstPivot.index; index++) {
        if (highs[index] >= highs[highIndex]) highIndex = index;
      }
      if (highs[highIndex] - firstPivot.value >= threshold) {
        addBoundaryPivot({ index: highIndex, value: highs[highIndex], type: "high" });
      }
    }
  }

  const lastPivot = pivots[pivots.length - 1] ?? null;
  if (lastPivot && lastPivot.index < size - 1) {
    if (lastPivot.type === "high") {
      let lowIndex = lastPivot.index + 1;
      for (let index = lowIndex + 1; index < size; index++) {
        if (lows[index] <= lows[lowIndex]) lowIndex = index;
      }
      if (lastPivot.value - lows[lowIndex] >= threshold) {
        addBoundaryPivot({ index: lowIndex, value: lows[lowIndex], type: "low" });
      }
    } else {
      let highIndex = lastPivot.index + 1;
      for (let index = highIndex + 1; index < size; index++) {
        if (highs[index] >= highs[highIndex]) highIndex = index;
      }
      if (highs[highIndex] - lastPivot.value >= threshold) {
        addBoundaryPivot({ index: highIndex, value: highs[highIndex], type: "high" });
      }
    }
  }

  pivots
    .sort((left, right) => left.index - right.index)
    .forEach((pivot) => {
      result[pivot.index] = pivot.value;
    });

  return result;
};

export const calcMomentum = (closes: number[], period: number) => {
  const safePeriod = clampPeriod(period);
  const res = [];
  for (let index = safePeriod; index < closes.length; index++) {
    res.push(closes[index] - closes[index - safePeriod]);
  }
  return { res, period: safePeriod };
};

export const calcVolumeOscillator = (volumes: number[], fast: number, slow: number) => {
  const safeFast = clampPeriod(fast);
  const safeSlow = clampPeriod(Math.max(fast, slow));
  const fastSMA = SMA.calculate({ period: safeFast, values: volumes });
  const slowSMA = SMA.calculate({ period: safeSlow, values: volumes });
  const offset = safeSlow - safeFast;
  const res = [];

  for (let index = 0; index < slowSMA.length; index++) {
    const fastValue = fastSMA[index + offset] || 0;
    const slowValue = slowSMA[index] || 0;
    res.push(slowValue === 0 ? 0 : ((fastValue - slowValue) / slowValue) * 100);
  }

  return { res, period: safeSlow };
};

export const calcBullsPower = (highs: number[], closes: number[], period: number) => {
  const ema = EMA.calculate({ period: clampPeriod(period), values: closes });
  const start = highs.length - ema.length;
  return ema.map((value, index) => highs[index + start] - value);
};

export const calcBearsPower = (lows: number[], closes: number[], period: number) => {
  const ema = EMA.calculate({ period: clampPeriod(period), values: closes });
  const start = lows.length - ema.length;
  return ema.map((value, index) => lows[index + start] - value);
};

export const calcDeMarker = (highs: number[], lows: number[], period: number) => {
  const deMax = [];
  const deMin = [];

  for (let index = 1; index < highs.length; index++) {
    deMax.push(Math.max(highs[index] - highs[index - 1], 0));
    deMin.push(Math.max(lows[index - 1] - lows[index], 0));
  }

  const safePeriod = clampPeriod(period);
  const deMaxAvg = SMA.calculate({ period: safePeriod, values: deMax });
  const deMinAvg = SMA.calculate({ period: safePeriod, values: deMin });

  return deMaxAvg.map((deMaxValue, index) => {
    const deMinValue = deMinAvg[index] ?? 0;
    const denominator = deMaxValue + deMinValue;
    return denominator === 0 ? 0.5 : deMaxValue / denominator;
  });
};

export const calcVortex = (highs: number[], lows: number[], closes: number[], period: number) => {
  const safePeriod = clampPeriod(period);
  const vmPlus = [];
  const vmMinus = [];
  const trueRange = [];

  for (let index = 1; index < highs.length; index++) {
    vmPlus.push(Math.abs(highs[index] - lows[index - 1]));
    vmMinus.push(Math.abs(lows[index] - highs[index - 1]));
    trueRange.push(
      Math.max(highs[index], closes[index - 1]) - Math.min(lows[index], closes[index - 1]),
    );
  }

  const viPlus = [];
  const viMinus = [];

  for (let index = safePeriod - 1; index < trueRange.length; index++) {
    const rangeSum = trueRange.slice(index - safePeriod + 1, index + 1).reduce((sum, value) => sum + value, 0);
    const plusSum = vmPlus.slice(index - safePeriod + 1, index + 1).reduce((sum, value) => sum + value, 0);
    const minusSum = vmMinus.slice(index - safePeriod + 1, index + 1).reduce((sum, value) => sum + value, 0);

    viPlus.push(rangeSum === 0 ? 0 : plusSum / rangeSum);
    viMinus.push(rangeSum === 0 ? 0 : minusSum / rangeSum);
  }

  return { viPlus, viMinus };
};
