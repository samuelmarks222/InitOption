import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  applyPlatformSettingsToDocument,
  DEFAULT_PLATFORM_SETTINGS,
  type PlatformSettingsRecord,
} from "@/lib/platformMetadata";

interface RouteSeoManagerProps {
  platformSettings?: Partial<PlatformSettingsRecord> | null;
}

const RouteSeoManager = ({ platformSettings }: RouteSeoManagerProps) => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const href = new URL(
      `${location.pathname}${location.search}${location.hash}`,
      window.location.origin,
    ).toString();

    applyPlatformSettingsToDocument(platformSettings ?? DEFAULT_PLATFORM_SETTINGS, href);
  }, [location.hash, location.pathname, location.search, platformSettings]);

  return null;
};

export default RouteSeoManager;

