import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TournamentRow } from "@/lib/publicTournaments";

export const usePublicTournaments = () =>
  useQuery({
    queryKey: ["public-tournaments"],
    staleTime: 60_000,
    queryFn: async (): Promise<TournamentRow[]> => {
      const { data, error } = await supabase.from("tournaments").select("*").order("start_date", { ascending: true });

      if (error) throw error;

      return data ?? [];
    },
  });
