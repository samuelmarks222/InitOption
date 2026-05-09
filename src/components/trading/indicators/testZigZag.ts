import { calcZigZag } from "./customIndicators.js";

// Dummy candle highs/lows with a couple of clear swings.
const highs = [
  100.1, 110.1, 120.2, 130.3, 140.2, 150.4,
  140.3, 130.2, 120.1, 110.1, 100.2,
  110.1, 120.2, 130.2,
];
const lows = [
  99.9, 109.8, 119.8, 129.8, 139.7, 149.8,
  139.8, 129.7, 119.8, 109.6, 99.7,
  109.7, 119.8, 129.8,
];

const deviation = 5;
const depth = 4;
const backstep = 2;

const res = calcZigZag(highs, lows, deviation, depth, backstep);
console.log("Highs:", highs);
console.log("Lows:", lows);
console.log("ZigZag Output:", res);
console.log("Filtered Non-nulls:", res.filter((x) => x !== null));
