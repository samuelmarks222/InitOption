const AUTH_RESTORE_PATH_KEY = "auth_restore_path";
const FALLBACK_AUTH_REDIRECT_PATH = "/trade";

const PROTECTED_PREFIXES = ["/trade", "/deposit", "/withdraw", "/notifications", "/traders", "/admin"];

const normalizePath = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) return FALLBACK_AUTH_REDIRECT_PATH;
  if (!trimmed.startsWith("/")) return `/${trimmed}`;

  return trimmed;
};

export const isProtectedRestorePath = (value: string) => {
  const normalized = normalizePath(value);

  return PROTECTED_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`) || normalized.startsWith(`${prefix}?`) || normalized.startsWith(`${prefix}#`));
};

export const saveAuthRestorePath = (value: string) => {
  if (typeof window === "undefined") return;

  const normalized = normalizePath(value);

  if (!isProtectedRestorePath(normalized)) return;

  try {
    window.localStorage.setItem(AUTH_RESTORE_PATH_KEY, normalized);
  } catch {
    // Ignore storage errors so auth itself never breaks.
  }
};

export const getAuthRestorePath = () => {
  if (typeof window === "undefined") return FALLBACK_AUTH_REDIRECT_PATH;

  try {
    const stored = window.localStorage.getItem(AUTH_RESTORE_PATH_KEY);

    if (stored && isProtectedRestorePath(stored)) {
      return normalizePath(stored);
    }
  } catch {
    // Ignore storage errors and use the default route instead.
  }

  return FALLBACK_AUTH_REDIRECT_PATH;
};

export const clearAuthRestorePath = () => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(AUTH_RESTORE_PATH_KEY);
  } catch {
    // Ignore storage errors so sign-out still completes.
  }
};

