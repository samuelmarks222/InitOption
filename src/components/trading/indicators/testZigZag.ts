import { calcZigZag } from "./customIndicators.js";

// Dummy data: 20 closes
// Up to 150, down to 100, up to 130
const closes = [
  100, 110, 120, 130, 140, 150, // Up swing
  140, 130, 120, 110, 100,      // Down swing
  110, 120, 130,                // Up swing
];

const deviation = 5; // 5%

const res = calcZigZag(closes, deviation);
console.log("Input data:", closes);
console.log("ZigZag Output:", res);
console.log("Filtered Non-nulls:", res.filter(x => x !== null));
