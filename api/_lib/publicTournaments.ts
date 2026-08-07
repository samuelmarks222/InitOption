import type { Database } from "../../src/integrations/supabase/types.js";
import { matchesTournamentSlug } from "../../src/lib/publicTournaments.js";
import { query } from "./db.js";

type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];

export const fetchPublicTournaments = async (): Promise<TournamentRow[]> => {
  try {
    const rows = await query("select * from tournaments order by start_date asc");
    return (rows ?? []) as TournamentRow[];
  } catch (error) {
    console.warn("Public tournaments fetch failed. Falling back to an empty listing.", error);
    return [];
  }
};

export const findPublicTournamentBySlug = async (slug: string) => {
  const tournaments = await fetchPublicTournaments();
  return tournaments.find((tournament) => matchesTournamentSlug(tournament, slug)) ?? null;
};
