
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Match } from "@/types";
import StatsContainer from "@/components/stats/StatsContainer";
import { useTheme } from "next-themes";

const Stats = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [matchesError, setMatchesError] = useState<Error | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchMatches = async () => {
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
        console.error('Error fetching matches:', error);
        setMatchesError(error as Error);
      } finally {
        setIsLoadingMatches(false);
      }
    };
    
    fetchMatches();
  }, []);

  return (
    <div className={`min-h-screen cornhole-bg py-8 px-4 md:px-8 ${theme === 'light' ? 'bg-gray-50' : ''}`}>
      <StatsContainer 
        matches={matches} 
        isLoadingMatches={isLoadingMatches} 
        matchesError={matchesError}
        theme={theme}
      />
    </div>
  );
};

export default Stats;
