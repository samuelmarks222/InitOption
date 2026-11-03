interface Range { from: number; to: number }
interface Scale { getVisibleLogicalRange(): Range | null; setVisibleLogicalRange(range: Range): void }
/** Animate only the viewport. Stop if the user pans/zooms while following live. */
export function animateViewport(scale: Scale, target: Range, duration = 180): () => void {
  const initial = scale.getVisibleLogicalRange();
  if (!initial) return () => {};
  let expected = { ...initial }, frame = 0, cancelled = false;
  const start = performance.now();
  const step = (now: number) => {
    const actual = scale.getVisibleLogicalRange();
    if (cancelled || !actual || Math.abs(actual.from - expected.from) > .01 || Math.abs(actual.to - expected.to) > .01) return;
    const progress = Math.min(1, Math.max(0, (now - start) / duration));
    const eased = 1 - Math.pow(1 - progress, 3);
    expected = { from: initial.from + (target.from - initial.from) * eased, to: initial.to + (target.to - initial.to) * eased };
    scale.setVisibleLogicalRange(expected);
    if (progress < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => { cancelled = true; cancelAnimationFrame(frame); };
}
