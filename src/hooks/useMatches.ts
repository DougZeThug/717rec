
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Match } from "@/types";

export const useMatches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .order('date', { ascending: false });

        if (error) {
          throw error;
        }

        const formattedMatches = data.map((match): Match => ({
          id: match.id,
          team1Id: match.team1_id || '',
          team2Id: match.team2_id || '',
          team1Score: match.team1_score,
          team2Score: match.team2_score,
          date: match.date || match.created_at,
          location: match.location || '',
          iscompleted: match.iscompleted || false,
          winnerId: match.winner_id,
          loserId: match.loser_id,
          round_number: match.round_number,
          position: match.position,
          bracket_id: match.bracket_id,
          match_type: match.match_type,
          next_match_id: match.next_match_id,
          next_loser_match_id: match.next_loser_match_id,
          best_of: match.best_of,
          team1_game_wins: match.team1_game_wins,
          team2_game_wins: match.team2_game_wins
        }));

        setMatches(formattedMatches);
      } catch (err) {
        console.error("Error fetching matches:", err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, []);

  return { matches, isLoading, error };
};
