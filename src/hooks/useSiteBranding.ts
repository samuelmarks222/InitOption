import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_PLATFORM_NAME,
  readStoredLogoUrl,
  readStoredLogoUrlLight,
  readStoredLogoUrlDark,
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

  const [logoUrl, setLogoUrl] = useState<string | null>(() => getCurrentLogoUrl());
  const [platformName, setPlatformName] = useState(() => readStoredPlatformName());
  const [supportEmail, setSupportEmail] = useState(() => readStoredSupportEmail());

  useEffect(() => {
    const updateBranding = () => {
      setLogoUrl(getCurrentLogoUrl());
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
    platformName: platformName || DEFAULT_PLATFORM_NAME,
    supportEmail: supportEmail || DEFAULT_PLATFORM_SETTINGS.support_email,
    initials,
  };
};
