const MOBILE_SPLASH_SESSION_KEY = "mobile_splash_seen_session";
const MOBILE_ENTRY_DISMISSED_SESSION_KEY = "mobile_entry_dismissed_session";
const MOBILE_ONBOARDING_VERSION = "2026-03-28";
const MOBILE_ONBOARDING_STORAGE_KEY = `mobile_onboarding_seen:${MOBILE_ONBOARDING_VERSION}`;

const canUseBrowserStorage = () => typeof window !== "undefined";

export const hasSeenMobileSplashThisSession = () => {
  if (!canUseBrowserStorage()) return false;

  try {
    return window.sessionStorage.getItem(MOBILE_SPLASH_SESSION_KEY) === "true";
  } catch {
    return false;
  }
};

export const markMobileSplashSeenThisSession = () => {
  if (!canUseBrowserStorage()) return;

  try {
    window.sessionStorage.setItem(MOBILE_SPLASH_SESSION_KEY, "true");
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
};

export const hasDismissedMobileEntryThisSession = () => {
  if (!canUseBrowserStorage()) return false;

  try {
    return window.sessionStorage.getItem(MOBILE_ENTRY_DISMISSED_SESSION_KEY) === "true";
  } catch {
    return false;
  }
};

export const markMobileEntryDismissedThisSession = () => {
  if (!canUseBrowserStorage()) return;

  try {
    window.sessionStorage.setItem(MOBILE_ENTRY_DISMISSED_SESSION_KEY, "true");
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
};

export const hasSeenMobileOnboarding = () => {
  if (!canUseBrowserStorage()) return false;

  try {
    return window.localStorage.getItem(MOBILE_ONBOARDING_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const markMobileOnboardingSeen = () => {
  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.setItem(MOBILE_ONBOARDING_STORAGE_KEY, "true");
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
};
