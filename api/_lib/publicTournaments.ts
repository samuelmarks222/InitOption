import type { Database } from "../../src/integrations/supabase/types.js";
import { matchesTournamentSlug } from "../../src/lib/publicTournaments.js";
import { fetchWithTimeout } from "./fetchWithTimeout.js";

type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];

const getSupabaseConfig = () => {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  return {
    anonKey,
    url,
  };
};

export const fetchPublicTournaments = async (): Promise<TournamentRow[]> => {
  const { anonKey, url } = getSupabaseConfig();

  if (!url || !anonKey) return [];

  const endpoint = new URL("/rest/v1/tournaments", url);
  endpoint.searchParams.set("select", "*");
  endpoint.searchParams.set("order", "start_date.asc");

  try {
    const response = await fetchWithTimeout(endpoint, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase tournaments fetch failed with ${response.status}`);
    }

    const payload = (await response.json()) as TournamentRow[];
    return payload ?? [];
  } catch (error) {
    console.warn("Public tournaments fetch failed. Falling back to an empty listing.", error);
    return [];
  }
};

export const findPublicTournamentBySlug = async (slug: string) => {
  const tournaments = await fetchPublicTournaments();
  return tournaments.find((tournament) => matchesTournamentSlug(tournament, slug)) ?? null;
};
