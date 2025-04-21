
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { FilterState } from "../types";

export const buildMatchQuery = (filters: FilterState) => {
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

  return query;
};
