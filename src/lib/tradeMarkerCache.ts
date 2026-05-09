const TRADE_MARKER_CACHE_KEY = "trade_marker_times_v2";

type TradeMarkerSnapshot = {
  markerTime?: number;
  markerLogical?: number;
};

type TradeMarkerCache = Record<string, TradeMarkerSnapshot>;

const readTradeMarkerCache = (): TradeMarkerCache => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(TRADE_MARKER_CACHE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.entries(parsed).reduce<TradeMarkerCache>((accumulator, [tradeId, snapshot]) => {
      if (typeof snapshot === "number" && Number.isFinite(snapshot)) {
        accumulator[tradeId] = { markerTime: snapshot };
        return accumulator;
      }

      if (!snapshot || typeof snapshot !== "object") {
        return accumulator;
      }

      const normalizedSnapshot: TradeMarkerSnapshot = {};

      if (
        "markerTime" in snapshot &&
        typeof (snapshot as { markerTime?: unknown }).markerTime === "number" &&
        Number.isFinite((snapshot as { markerTime: number }).markerTime)
      ) {
        normalizedSnapshot.markerTime = (snapshot as { markerTime: number }).markerTime;
      }

      if (
        "markerLogical" in snapshot &&
        typeof (snapshot as { markerLogical?: unknown }).markerLogical === "number" &&
        Number.isFinite((snapshot as { markerLogical: number }).markerLogical)
      ) {
        normalizedSnapshot.markerLogical = (snapshot as { markerLogical: number }).markerLogical;
      }

      if ("markerTime" in normalizedSnapshot || "markerLogical" in normalizedSnapshot) {
        accumulator[tradeId] = normalizedSnapshot;
      }
      return accumulator;
    }, {});
  } catch {
    return {};
  }
};

const writeTradeMarkerCache = (cache: TradeMarkerCache) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(TRADE_MARKER_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage failures so trading itself never breaks.
  }
};

export const getStoredTradeMarkerSnapshot = (tradeId: string) => {
  if (!tradeId) {
    return null;
  }

  const snapshot = readTradeMarkerCache()[tradeId];
  return snapshot ?? null;
};

export const getStoredTradeMarkerTime = (tradeId: string) => {
  const snapshot = getStoredTradeMarkerSnapshot(tradeId);
  if (!snapshot) {
    return null;
  }

  return typeof snapshot.markerTime === "number" && Number.isFinite(snapshot.markerTime)
    ? snapshot.markerTime
    : null;
};

export const getStoredTradeMarkerLogical = (tradeId: string) => {
  const snapshot = getStoredTradeMarkerSnapshot(tradeId);
  if (!snapshot) {
    return null;
  }

  return typeof snapshot.markerLogical === "number" && Number.isFinite(snapshot.markerLogical)
    ? snapshot.markerLogical
    : null;
};

export const setStoredTradeMarkerSnapshot = (
  tradeId: string,
  markerTime: number | null | undefined,
  markerLogical?: number | null,
) => {
  if (!tradeId) {
    return;
  }

  const cache = readTradeMarkerCache();
  const snapshot: TradeMarkerSnapshot = {};

  if (typeof markerTime === "number" && Number.isFinite(markerTime)) {
    snapshot.markerTime = markerTime;
  }

  if (typeof markerLogical === "number" && Number.isFinite(markerLogical)) {
    snapshot.markerLogical = markerLogical;
  }

  if (!("markerTime" in snapshot) && !("markerLogical" in snapshot)) {
    return;
  }

  cache[tradeId] = snapshot;
  writeTradeMarkerCache(cache);
};

export const setStoredTradeMarkerTime = (tradeId: string, markerTime: number) => {
  setStoredTradeMarkerSnapshot(tradeId, markerTime);
};

export const clearStoredTradeMarkerTime = (tradeId: string) => {
  if (!tradeId) {
    return;
  }

  const cache = readTradeMarkerCache();
  if (!(tradeId in cache)) {
    return;
  }

  delete cache[tradeId];
  writeTradeMarkerCache(cache);
};
