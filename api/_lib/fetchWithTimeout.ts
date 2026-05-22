export const DEFAULT_SERVER_FETCH_TIMEOUT_MS = 4500;

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_SERVER_FETCH_TIMEOUT_MS,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export const resolveWithTimeout = async <T>(
  operation: Promise<T>,
  fallback: T,
  timeoutMs: number,
  label: string,
) =>
  new Promise<T>((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.warn(`${label} timed out after ${timeoutMs}ms. Falling back.`);
      resolve(fallback);
    }, timeoutMs);

    operation
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        console.warn(`${label} failed. Falling back.`, error);
        resolve(fallback);
      });
  });
