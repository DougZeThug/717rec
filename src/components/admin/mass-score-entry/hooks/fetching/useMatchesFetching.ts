
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { FilterState, MatchWithTeams } from "../../types";
import { useToast } from "@/hooks/use-toast";
import { transformDatabaseMatchToMatchWithTeams } from "../../utils/matchTransformUtils";

export const useMatchesFetching = () => {
  const { toast } = useToast();

  const fetchMatches = async (filters: FilterState) => {
    let query = supabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(id, name, logo_url),
        team2:teams!matches_team2_id_fkey(id, name, logo_url)
      `)
      .order('date', { ascending: true });

    if (filters.date) {
      const dateStr = format(filters.date, 'yyyy-MM-dd');
      query = query.gte('date', `${dateStr}T00:00:00`)
                   .lt('date', `${dateStr}T23:59:59`);
    }

    if (filters.bracketId) {
      query = query.eq('bracket_id', filters.bracketId);
    }

    try {
      const { data, error } = await query;
      if (error) throw error;

      return data.map(transformDatabaseMatchToMatchWithTeams) as MatchWithTeams[];
    } catch (error: any) {
      console.error("Error fetching matches:", error.message);
      toast({
        title: "Error",
        description: `Failed to fetch matches: ${error.message}`,
        variant: "destructive"
      });
      return [];
    }
  };

  return { fetchMatches };
};
