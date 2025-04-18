
import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MatchWithTeams, FilterState } from "../types";

export const useMatchFetching = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const fetchMatches = async (filters: FilterState) => {
    setLoading(true);
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

      const formattedMatches: MatchWithTeams[] = (data || []).map(match => ({
        id: match.id,
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        date: match.date,
        location: match.location,
        iscompleted: match.iscompleted,
        winnerId: match.winner_id,
        loserId: match.loser_id,
        round_number: match.round_number,
        position: match.position,
        bracket_id: match.bracket_id,
        match_type: match.match_type,
        next_match_id: match.next_match_id,
        next_loser_match_id: match.next_loser_match_id,
        best_of: match.best_of,
        created_at: match.created_at,
        team1: match.team1 ? {
          id: match.team1.id,
          name: match.team1.name,
          logoUrl: match.team1.logo_url,
          players: [],
          wins: 0,
          losses: 0,
          created_at: ""
        } : undefined,
        team2: match.team2 ? {
          id: match.team2.id,
          name: match.team2.name,
          logoUrl: match.team2.logo_url,
          players: [],
          wins: 0,
          losses: 0,
          created_at: ""
        } : undefined,
        isEdited: false,
        isValid: true
      }));

      setLoading(false);
      return formattedMatches;
    } catch (error: any) {
      console.error("Error fetching matches:", error.message);
      toast({
        title: "Error",
        description: `Failed to fetch matches: ${error.message}`,
        variant: "destructive"
      });
      setLoading(false);
      return [];
    }
  };

  return {
    loading,
    fetchMatches
  };
};
