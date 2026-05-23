import type { PlatformSettingsRecord } from "@/lib/platformMetadata";

const PLATFORM_PRESENTATION_CACHE_KEY = "initoption:platform-presentation-cache:v1";
const WEBSITE_CONTENT_CACHE_KEY = "initoption:website-content-cache:v1";
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEnvelope<T> {
  savedAt: number;
  value: T;
}

const getStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readCache = <T>(key: string): T | null => {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      storage.removeItem(key);
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
};

const writeCache = <T>(key: string, value: T) => {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(
      key,
      JSON.stringify({
        savedAt: Date.now(),
        value,
      } satisfies CacheEnvelope<T>),
    );
  } catch {
    // Cache writes should never affect page rendering.
  }
};

export const readPlatformPresentationCache = () =>
  readCache<Partial<PlatformSettingsRecord>>(PLATFORM_PRESENTATION_CACHE_KEY);

export const writePlatformPresentationCache = (value: Partial<PlatformSettingsRecord>) =>
  writeCache(PLATFORM_PRESENTATION_CACHE_KEY, value);

export const readWebsiteContentCache = () =>
  readCache<{ platformName: string; websiteContent: string }>(WEBSITE_CONTENT_CACHE_KEY);

export const writeWebsiteContentCache = (value: { platformName: string; websiteContent: string }) =>
  writeCache(WEBSITE_CONTENT_CACHE_KEY, value);
