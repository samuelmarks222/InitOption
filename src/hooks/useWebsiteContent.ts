import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readStoredPlatformName } from "@/lib/platformMetadata";
import { createDefaultWebsiteContent, normalizeWebsiteContent } from "@/lib/websiteContent";

export const useWebsiteContent = () => {
  const fallbackPlatformName = readStoredPlatformName();
  const fallbackContent = createDefaultWebsiteContent(fallbackPlatformName);

  return useQuery({
    queryKey: ["website-content"],
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("platform_settings")
          .select("platform_name, website_content")
          .limit(1)
          .maybeSingle();

        return normalizeWebsiteContent(
          (data as { website_content?: string | null; platform_name?: string | null } | null)?.website_content ?? "",
          (data as { platform_name?: string | null } | null)?.platform_name || fallbackPlatformName,
        );
      } catch {
        return fallbackContent;
      }
    },
    initialData: fallbackContent,
  });
};
