const AXIS_EPSILON = 0.000001;

const asFiniteNumber = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const clampViewportCoordinate = (value: number, size: number) => {
  const safeSize = Math.max(0, size);
  return Math.min(Math.max(value, 0), safeSize);
};

export const buildAxisSampleCoordinates = (size: number, focus: number) => {
  const safeSize = Math.max(0, size);
  const seedValues = [
    focus,
    0,
    safeSize,
    safeSize * 0.1,
    safeSize * 0.2,
    safeSize * 0.33,
    safeSize * 0.5,
    safeSize * 0.67,
    safeSize * 0.8,
    safeSize * 0.9,
  ];

  const normalized: number[] = [];

  seedValues.forEach((value) => {
    const clamped = clampViewportCoordinate(value, safeSize);
    if (normalized.some((entry) => Math.abs(entry - clamped) < AXIS_EPSILON)) return;
    normalized.push(clamped);
  });

  return normalized.sort((left, right) => left - right);
};

export const resolveAxisValue = (
  coordinate: number,
  sampleCoordinates: number[],
  resolver: (coordinate: number) => number | null,
) => {
  const direct = asFiniteNumber(resolver(coordinate));
  if (direct !== null) return direct;

  const samples = sampleCoordinates
    .map((sampleCoordinate) => ({
      coordinate: sampleCoordinate,
      value: asFiniteNumber(resolver(sampleCoordinate)),
    }))
    .filter((sample): sample is { coordinate: number; value: number } => sample.value !== null)
    .sort((left, right) => left.coordinate - right.coordinate);

  if (samples.length === 0) return null;
  if (samples.length === 1) return samples[0].value;

  let left = samples[0];
  let right = samples[samples.length - 1];

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (coordinate <= current.coordinate) {
      left = previous;
      right = current;
      break;
    }
  }

  const coordinateSpan = right.coordinate - left.coordinate;
  if (Math.abs(coordinateSpan) < AXIS_EPSILON) {
    return left.value;
  }

  const ratio = (coordinate - left.coordinate) / coordinateSpan;
  return left.value + (right.value - left.value) * ratio;
};

export const timeFromLogicalCoordinate = (
  logical: number,
  referenceLogical: number,
  referenceTime: number,
  timeframeSeconds: number,
) => referenceTime + (logical - referenceLogical) * timeframeSeconds;

export const logicalFromTimeValue = (
  time: number,
  referenceLogical: number,
  referenceTime: number,
  timeframeSeconds: number,
) => referenceLogical + (time - referenceTime) / timeframeSeconds;
