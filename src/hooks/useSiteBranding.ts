import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_PLATFORM_NAME,
  readStoredLandingLogoUrl,
  readStoredLogoUrl,
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
  const [logoUrl, setLogoUrl] = useState<string | null>(() => readStoredLogoUrl() || defaultLogoUrl);
  const [landingLogoUrl, setLandingLogoUrl] = useState<string | null>(() => readStoredLandingLogoUrl());
  const [platformName, setPlatformName] = useState(() => readStoredPlatformName());
  const [supportEmail, setSupportEmail] = useState(() => readStoredSupportEmail());

  useEffect(() => {
    const updateBranding = () => {
      setLogoUrl(readStoredLogoUrl() || defaultLogoUrl);
      setLandingLogoUrl(readStoredLandingLogoUrl());
      setPlatformName(readStoredPlatformName());
      setSupportEmail(readStoredSupportEmail());
    };

    updateBranding();
    window.addEventListener("brand_updated", updateBranding);

    return () => {
      window.removeEventListener("brand_updated", updateBranding);
    };
  }, []);

  const initials = useMemo(() => buildInitials(platformName), [platformName]);

  return {
    logoUrl,
    landingLogoUrl,
    platformName: platformName || DEFAULT_PLATFORM_NAME,
    supportEmail: supportEmail || DEFAULT_PLATFORM_SETTINGS.support_email,
    initials,
  };
};
