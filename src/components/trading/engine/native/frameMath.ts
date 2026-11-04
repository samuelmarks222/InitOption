/** Coordinates are CSS pixels; DPR is applied once by the Canvas transform. */
export const snap = Math.round;
export function activePriceGeometry(rawY: number, offsetX: number, lastIndex: number, candleWidth: number, candleSpacing: number) {
  return { y: snap(rawY), x: snap(offsetX + lastIndex * (candleWidth + candleSpacing) + candleWidth / 2) };
}
export function zoomRange(range: {from:number;to:number}, width: number, factor: number, x: number) {
  const span=range.to-range.from;
  const count=Math.max(8,Math.min(5000,span*factor));
  const ratio=Math.max(0,Math.min(1,x/Math.max(1,width)));
  const anchor=range.from+span*ratio;
  return {from:anchor-count*ratio,to:anchor+count*(1-ratio)};
}
export function wheelFactor(deltaY: number) { return deltaY < 0 ? 1 / 1.12 : 1.12; }
