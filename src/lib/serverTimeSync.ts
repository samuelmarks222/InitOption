let serverTimeOffsetMs = 0;
let lastSyncTime = 0;
let syncPromise: Promise<number> | null = null;
const SYNC_INTERVAL_MS = 30000;
const MAX_OFFSET_AGE_MS = 60000;

export const getServerTimeOffset = () => serverTimeOffsetMs;

export const getSynchronizedTime = (): number => {
  return performance.now() + serverTimeOffsetMs;
};

export const getSynchronizedUnixTime = (): number => {
  return Math.floor((performance.now() + serverTimeOffsetMs) / 1000);
};

export const getSynchronizedUnixTimeMs = (): number => {
  return Math.floor(performance.now() + serverTimeOffsetMs);
};

async function fetchServerTime(): Promise<number> {
  const start = performance.now();
  try {
    const response = await fetch('/api/time', { method: 'GET', cache: 'no-store' });
    if (!response.ok) throw new Error('Server time endpoint failed');
    const data = await response.json();
    const end = performance.now();
    const roundTrip = end - start;
    const serverTimeMs = data.timestamp * 1000;
    const estimatedServerTimeAtEnd = serverTimeMs + roundTrip / 2;
    return estimatedServerTimeAtEnd - end;
  } catch {
    return Date.now() - start;
  }
}

export async function syncServerTime(): Promise<number> {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const offset = await fetchServerTime();
      serverTimeOffsetMs = offset;
      lastSyncTime = Date.now();
      return offset;
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

export function startPeriodicSync(): () => void {
  const intervalId = window.setInterval(() => {
    if (Date.now() - lastSyncTime > MAX_OFFSET_AGE_MS) {
      void syncServerTime();
    }
  }, SYNC_INTERVAL_MS);

  if (lastSyncTime === 0) {
    void syncServerTime();
  }

  return () => window.clearInterval(intervalId);
}

export function forceSync(): Promise<number> {
  return syncServerTime();
}

export function isOffsetFresh(): boolean {
  return Date.now() - lastSyncTime < MAX_OFFSET_AGE_MS;
}

export function resetSync(): void {
  serverTimeOffsetMs = 0;
  lastSyncTime = 0;
}