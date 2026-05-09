import { useEffect, useState } from "react";

export interface DrawingPreferences {
  defaultColor: string | null;
}

const STORAGE_KEY = "trading_drawing_preferences";
const DRAWING_PREFERENCES_UPDATED_EVENT = "drawing-preferences-updated";
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_DRAWING_PREFERENCES: DrawingPreferences = {
  defaultColor: null,
};

const normalizeColor = (value: unknown) =>
  typeof value === "string" && HEX_COLOR_PATTERN.test(value) ? value.toLowerCase() : null;

const normalizePreferences = (value?: Partial<DrawingPreferences> | null): DrawingPreferences => ({
  defaultColor: normalizeColor(value?.defaultColor),
});

export const readDrawingPreferences = (): DrawingPreferences => {
  if (typeof window === "undefined") return DEFAULT_DRAWING_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DRAWING_PREFERENCES;
    return normalizePreferences(JSON.parse(raw) as Partial<DrawingPreferences>);
  } catch {
    return DEFAULT_DRAWING_PREFERENCES;
  }
};

const persistDrawingPreferences = (next: DrawingPreferences) => {
  if (typeof window === "undefined") return next;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(DRAWING_PREFERENCES_UPDATED_EVENT, { detail: next }));
  return next;
};

export const writeDrawingPreferences = (next: Partial<DrawingPreferences>) =>
  persistDrawingPreferences(normalizePreferences({ ...readDrawingPreferences(), ...next }));

export const useDrawingPreferences = () => {
  const [preferences, setPreferences] = useState<DrawingPreferences>(readDrawingPreferences);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncPreferences = () => setPreferences(readDrawingPreferences());

    window.addEventListener("storage", syncPreferences);
    window.addEventListener(DRAWING_PREFERENCES_UPDATED_EVENT, syncPreferences);

    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(DRAWING_PREFERENCES_UPDATED_EVENT, syncPreferences);
    };
  }, []);

  const updatePreferences = (next: Partial<DrawingPreferences>) => {
    setPreferences(writeDrawingPreferences(next));
  };

  const resetPreferences = () => {
    setPreferences(persistDrawingPreferences(DEFAULT_DRAWING_PREFERENCES));
  };

  return {
    preferences,
    updatePreferences,
    resetPreferences,
  };
};
