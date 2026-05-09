import {
  hasDismissedMobileEntryThisSession,
  hasSeenMobileOnboarding,
  hasSeenMobileSplashThisSession,
  markMobileEntryDismissedThisSession,
  markMobileOnboardingSeen,
  markMobileSplashSeenThisSession,
} from "@/lib/mobileExperience";

describe("mobileExperience storage", () => {
  beforeEach(() => {
    const createStorageMock = () => {
      const store = new Map<string, string>();

      return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, String(value));
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      };
    };

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createStorageMock(),
    });

    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createStorageMock(),
    });
  });

  it("tracks mobile splash state per session", () => {
    expect(hasSeenMobileSplashThisSession()).toBe(false);

    markMobileSplashSeenThisSession();

    expect(hasSeenMobileSplashThisSession()).toBe(true);
  });

  it("tracks onboarding completion in local storage", () => {
    expect(hasSeenMobileOnboarding()).toBe(false);

    markMobileOnboardingSeen();

    expect(hasSeenMobileOnboarding()).toBe(true);
  });

  it("tracks mobile entry dismissal per session", () => {
    expect(hasDismissedMobileEntryThisSession()).toBe(false);

    markMobileEntryDismissedThisSession();

    expect(hasDismissedMobileEntryThisSession()).toBe(true);
  });
});
