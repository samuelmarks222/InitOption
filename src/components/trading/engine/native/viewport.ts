export interface LogicalRange { from: number; to: number }
/** Keep normal candle spacing even when an instrument has only a few bars.
 * Negative logical space is empty past, never generated history. */
export function liveViewport(width: number, count: number, preferredSpan: number): LogicalRange {
  const span = Math.max(24, Math.min(100, Math.max(1,width)/12), preferredSpan);
  const padding = Math.max(3, Math.min(24, span*.12));
  const to = Math.max(0,count-1)+padding;
  return {from:to-span,to};
}
/** Bound overscroll without forcing sparse histories back against the left edge. */
export function constrainViewport(range: LogicalRange, count: number, maxSpan: number): LogicalRange {
  const span = Math.max(1, Math.min(range.to-range.from,maxSpan));
  const last = Math.max(0,count-1);
  const minFrom = Math.min(0,last-span*.9);
  const maxTo = last+Math.max(6,span*.2);
  const maxFrom = Math.min(last - span * .1, maxTo - span);
  const from = Math.max(minFrom,Math.min(range.from,maxFrom));
  return {from,to:from+span};
}
