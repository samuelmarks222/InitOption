import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readStoredPlatformName } from "@/lib/platformMetadata";
import { readWebsiteContentCache, writeWebsiteContentCache } from "@/lib/platformSettingsCache";
import { createDefaultWebsiteContent, normalizeWebsiteContent } from "@/lib/websiteContent";

export const useWebsiteContent = () => {
  const fallbackPlatformName = readStoredPlatformName();
  const cachedContent = readWebsiteContentCache();
  const fallbackContent = createDefaultWebsiteContent(fallbackPlatformName);
  const initialContent = cachedContent
    ? normalizeWebsiteContent(cachedContent.websiteContent, cachedContent.platformName || fallbackPlatformName)
    : fallbackContent;

  return useQuery({
    queryKey: ["website-content"],
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    enabled: !cachedContent,
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("platform_settings")
          .select("platform_name, website_content")
          .limit(1)
          .maybeSingle();

        const row = data as { website_content?: string | null; platform_name?: string | null } | null;
        const platformName = row?.platform_name || fallbackPlatformName;
        const websiteContent = row?.website_content ?? "";
        writeWebsiteContentCache({ platformName, websiteContent });

        return normalizeWebsiteContent(websiteContent, platformName);
      } catch {
        return fallbackContent;
      }
    },
    initialData: initialContent,
  });
};
