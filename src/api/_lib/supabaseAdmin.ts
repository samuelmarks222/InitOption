import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types.js";

let cachedClient: ReturnType<typeof createClient<Database>> | null = null;

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const getSupabaseAdminClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const url = getRequiredEnv("SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  cachedClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
};

const getSupabaseAnonKey = () =>
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const getSupabaseUserClient = (accessToken: string) => {
  if (!accessToken) {
    throw new Error("Missing user access token.");
  }

  const url = getRequiredEnv("SUPABASE_URL");
  const anonKey = getSupabaseAnonKey();

  if (!anonKey) {
    throw new Error(
      "Missing required environment variable: SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY for server fallback).",
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};
