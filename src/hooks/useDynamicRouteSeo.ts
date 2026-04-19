import { useEffect } from "react";
import {
  applyPlatformSettingsToDocument,
  DEFAULT_PLATFORM_SETTINGS,
  type PlatformSettingsRecord,
} from "@/lib/platformMetadata";
import type { RouteSeoContext, RouteSeoOverride } from "@/lib/routeSeo";

interface UseDynamicRouteSeoOptions {
  platformSettings?: Partial<PlatformSettingsRecord> | null;
  routeOverride?: RouteSeoOverride | null;
  tournament?: RouteSeoContext["tournament"];
  tournaments?: RouteSeoContext["tournaments"];
  enabled?: boolean;
}

export const useDynamicRouteSeo = ({
  platformSettings,
  routeOverride,
  tournament,
  tournaments,
  enabled = true,
}: UseDynamicRouteSeoOptions) => {
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !routeOverride) return;

    const mergedSettings: Partial<PlatformSettingsRecord> = {
      ...(platformSettings ?? DEFAULT_PLATFORM_SETTINGS),
      site_title: routeOverride.siteTitle ?? platformSettings?.site_title ?? "",
      meta_description: routeOverride.metaDescription ?? platformSettings?.meta_description ?? "",
      meta_keywords: routeOverride.metaKeywords ?? platformSettings?.meta_keywords ?? "",
      og_title: routeOverride.siteTitle ?? platformSettings?.og_title ?? "",
      og_description: routeOverride.metaDescription ?? platformSettings?.og_description ?? "",
      twitter_title: routeOverride.siteTitle ?? platformSettings?.twitter_title ?? "",
      twitter_description: routeOverride.metaDescription ?? platformSettings?.twitter_description ?? "",
      robots_directive:
        routeOverride.robotsDirective ?? platformSettings?.robots_directive ?? DEFAULT_PLATFORM_SETTINGS.robots_directive,
    };

    applyPlatformSettingsToDocument(mergedSettings, window.location.href, {
      routeOverride,
      tournament: tournament ?? null,
      tournaments: tournaments ?? null,
    });
  }, [
    enabled,
    platformSettings,
    routeOverride,
    tournaments,
    tournament?.id,
    tournament?.title,
    tournament?.status,
    tournament?.startDate,
    tournament?.endDate,
    tournament?.entryFee,
    tournament?.rebuyCost,
    tournament?.prizePool,
    tournament?.startingBalance,
    tournament?.path,
    tournament?.description,
  ]);
};
