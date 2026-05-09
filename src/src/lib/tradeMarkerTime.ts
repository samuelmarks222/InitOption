const MAX_MARKER_SKEW_SECONDS = 10;

const getUnixTime = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric > 1_000_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric);
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    }
  }

  if (value instanceof Date) {
    return Math.floor(value.getTime() / 1000);
  }

  return null;
};

export const getCandleStartTime = (nowSec: number, timeframeSec: number) => {
  const safeNowSec = getUnixTime(nowSec) ?? Math.floor(Date.now() / 1000);
  const safeTimeframeSec = Math.max(1, Math.floor(timeframeSec || 1));
  return Math.floor(safeNowSec / safeTimeframeSec) * safeTimeframeSec;
};

export const resolveFreshTradeMarkerTime = (
  candidateMarkerTime: unknown,
  openedAt: unknown,
  maxMarkerSkewSeconds = MAX_MARKER_SKEW_SECONDS,
) => {
  const openedAtTime = getUnixTime(openedAt) ?? Math.floor(Date.now() / 1000);
  const markerTime = getUnixTime(candidateMarkerTime);

  if (markerTime === null) {
    return openedAtTime;
  }

  return Math.abs(markerTime - openedAtTime) <= maxMarkerSkewSeconds ? markerTime : openedAtTime;
};
