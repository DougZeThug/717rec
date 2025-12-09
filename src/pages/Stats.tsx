import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Match } from "@/types";
import StatsContainer from "@/components/stats/containers/StatsContainer";
import { errorLog } from "@/utils/logger";
import PageLayout from "@/components/layout/PageLayout";

const Stats = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [matchesError, setMatchesError] = useState<Error | null>(null);

  const fetchMatches = useCallback(async () => {
    setIsLoadingMatches(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const matchData = data.map((match): Match => ({
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
      
      setMatches(matchData);
      setMatchesError(null);
    } catch (error) {
      errorLog('Error fetching matches:', error);
      setMatchesError(error as Error);
    } finally {
      setIsLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return (
    <PageLayout>
      <StatsContainer 
        matches={matches} 
        isLoadingMatches={isLoadingMatches} 
        matchesError={matchesError}
      />
    </PageLayout>
  );
};

export default Stats;
