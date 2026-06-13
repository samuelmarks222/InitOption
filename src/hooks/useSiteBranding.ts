import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_PLATFORM_NAME,
  readStoredLogoUrl,
  readStoredLogoUrlLight,
  readStoredLogoUrlDark,
  readStoredLogoUrlFooter,
  readStoredLogoUrlDashboard,
  readStoredLogoUrlDashboardLight,
  readStoredLogoUrlDashboardDark,
  readStoredLogoUrlLandingHeader,
  readStoredPlatformName,
  readStoredSupportEmail,
} from "@/lib/platformMetadata";
import defaultLogoUrl from "@/assets/logo.png";

const buildInitials = (platformName: string) => {
  const parts = platformName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "BP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

export const useSiteBranding = () => {
  const getCurrentLogoUrl = () => {
    const lightLogo = readStoredLogoUrlLight();
    const darkLogo = readStoredLogoUrlDark();
    const primaryLogo = readStoredLogoUrl();
    const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const hasDarkThemeClass = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const useDarkLogo = prefersDark || hasDarkThemeClass;

    if (useDarkLogo && darkLogo) return darkLogo;
    if (!useDarkLogo && lightLogo) return lightLogo;
    return primaryLogo || lightLogo || darkLogo || defaultLogoUrl;
  };

  const getLogoUrlByVariant = (variant: "auto" | "light" | "dark") => {
    const lightLogo = readStoredLogoUrlLight();
    const darkLogo = readStoredLogoUrlDark();
    const primaryLogo = readStoredLogoUrl();

    if (variant === "light") {
      return lightLogo || primaryLogo || darkLogo || defaultLogoUrl;
    }

    if (variant === "dark") {
      return darkLogo || primaryLogo || lightLogo || defaultLogoUrl;
    }

    return getCurrentLogoUrl();
  };

  const getLogoForContext = (context: "dashboard" | "hero" | "admin" | "navbar" | "footer" | "landing_header") => {
    const lightLogo = readStoredLogoUrlLight();
    const darkLogo = readStoredLogoUrlDark();
    const primaryLogo = readStoredLogoUrl();

    switch (context) {
      case "hero":
        return lightLogo || primaryLogo || darkLogo || defaultLogoUrl;
      case "dashboard": {
        const dashboardLogo = readStoredLogoUrlDashboard();
        const dashboardLight = readStoredLogoUrlDashboardLight();
        const dashboardDark = readStoredLogoUrlDashboardDark();
        const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
        const hasDarkThemeClass = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
        const useDark = prefersDark || hasDarkThemeClass;
        if (useDark) return dashboardDark || dashboardLogo || darkLogo || primaryLogo || defaultLogoUrl;
        return dashboardLight || dashboardLogo || lightLogo || primaryLogo || defaultLogoUrl;
      }
      case "admin":
        return primaryLogo || darkLogo || lightLogo || defaultLogoUrl;
      case "navbar":
        return darkLogo || primaryLogo || lightLogo || defaultLogoUrl;
      case "footer": {
        const footerLogo = readStoredLogoUrlFooter();
        return footerLogo || darkLogo || primaryLogo || lightLogo || defaultLogoUrl;
      }
      case "landing_header": {
        const headerLogo = readStoredLogoUrlLandingHeader();
        return headerLogo || darkLogo || primaryLogo || lightLogo || defaultLogoUrl;
      }
      default:
        return getCurrentLogoUrl();
    }
  };

  const [logoUrl, setLogoUrl] = useState<string | null>(() => getCurrentLogoUrl());
  const [logoUrlLight, setLogoUrlLight] = useState<string | null>(() => readStoredLogoUrlLight());
  const [logoUrlDark, setLogoUrlDark] = useState<string | null>(() => readStoredLogoUrlDark());
  const [logoUrlFooter, setLogoUrlFooter] = useState<string | null>(() => readStoredLogoUrlFooter());
  const [logoUrlDashboard, setLogoUrlDashboard] = useState<string | null>(() => readStoredLogoUrlDashboard());
  const [logoUrlDashboardLight, setLogoUrlDashboardLight] = useState<string | null>(() => readStoredLogoUrlDashboardLight());
  const [logoUrlDashboardDark, setLogoUrlDashboardDark] = useState<string | null>(() => readStoredLogoUrlDashboardDark());
  const [logoUrlLandingHeader, setLogoUrlLandingHeader] = useState<string | null>(() => readStoredLogoUrlLandingHeader());
  const [platformName, setPlatformName] = useState(() => readStoredPlatformName());
  const [supportEmail, setSupportEmail] = useState(() => readStoredSupportEmail());

  useEffect(() => {
    const updateBranding = () => {
      setLogoUrl(getCurrentLogoUrl());
      setLogoUrlLight(readStoredLogoUrlLight());
      setLogoUrlDark(readStoredLogoUrlDark());
      setLogoUrlFooter(readStoredLogoUrlFooter());
      setLogoUrlDashboard(readStoredLogoUrlDashboard());
      setLogoUrlDashboardLight(readStoredLogoUrlDashboardLight());
      setLogoUrlDashboardDark(readStoredLogoUrlDashboardDark());
      setLogoUrlLandingHeader(readStoredLogoUrlLandingHeader());
      setPlatformName(readStoredPlatformName());
      setSupportEmail(readStoredSupportEmail());
    };

    updateBranding();
    window.addEventListener("brand_updated", updateBranding);
    const mediaQuery = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    mediaQuery?.addEventListener("change", updateBranding);

    return () => {
      window.removeEventListener("brand_updated", updateBranding);
      mediaQuery?.removeEventListener("change", updateBranding);
    };
  }, []);

  const initials = useMemo(() => buildInitials(platformName), [platformName]);

  return {
    logoUrl,
    logoUrlLight,
    logoUrlDark,
    logoUrlFooter,
    logoUrlDashboard,
    logoUrlDashboardLight,
    logoUrlDashboardDark,
    logoUrlLandingHeader,
    getLogoUrlByVariant,
    getLogoForContext,
    platformName: platformName || DEFAULT_PLATFORM_NAME,
    supportEmail: supportEmail || DEFAULT_PLATFORM_SETTINGS.support_email,
    initials,
  };
};
