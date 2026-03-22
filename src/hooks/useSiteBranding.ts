import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PLATFORM_NAME,
  readStoredLogoUrl,
  readStoredPlatformName,
} from "@/lib/platformMetadata";

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
  const [logoUrl, setLogoUrl] = useState<string | null>(() => readStoredLogoUrl());
  const [platformName, setPlatformName] = useState(() => readStoredPlatformName());

  useEffect(() => {
    const updateBranding = () => {
      setLogoUrl(readStoredLogoUrl());
      setPlatformName(readStoredPlatformName());
    };

    updateBranding();
    window.addEventListener("brand_updated", updateBranding);

    return () => window.removeEventListener("brand_updated", updateBranding);
  }, []);

  const initials = useMemo(() => buildInitials(platformName), [platformName]);

  return {
    logoUrl,
    platformName: platformName || DEFAULT_PLATFORM_NAME,
    initials,
  };
};
