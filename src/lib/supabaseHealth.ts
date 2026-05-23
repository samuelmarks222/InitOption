import { supabasePublishableKey, supabaseUrl } from "@/integrations/supabase/client";

const SUPABASE_AUTH_HEALTH_TIMEOUT_MS = 4500;

type SupabaseHealthResult = {
  ok: boolean;
  message: string;
};

const buildUnavailableMessage = () =>
  "Login service is taking too long to respond. Please wait a moment and try again.";

export const checkSupabaseAuthReachable = async (): Promise<SupabaseHealthResult> => {
  if (!supabaseUrl || !supabasePublishableKey) {
    return {
      ok: false,
      message: "Login service is not configured yet.",
    };
  }

  if (typeof fetch === "undefined" || typeof AbortController === "undefined") {
    return { ok: true, message: "" };
  }

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), SUPABASE_AUTH_HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      cache: "no-store",
      headers: {
        apikey: supabasePublishableKey,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        message: buildUnavailableMessage(),
      };
    }

    return { ok: true, message: "" };
  } catch {
    return {
      ok: false,
      message: buildUnavailableMessage(),
    };
  } finally {
    globalThis.clearTimeout(timeout);
  }
};
