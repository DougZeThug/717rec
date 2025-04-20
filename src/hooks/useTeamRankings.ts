
import { useState, useEffect } from "react";
import { Team, Match, Ranking } from "@/types";
import { useRankingsData } from "./rankings/useRankingsData";
import { usePreviousRankings } from "./rankings/usePreviousRankings";
import { updateRankChanges, saveRankingsToStorage } from "@/utils/rankingUtils";
import { calculateStreak } from "@/utils/rankingUtils";

export const useTeamRankings = (teams: Team[] | undefined, matches: Match[] | undefined) => {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const previousRankings = usePreviousRankings();
  const { latestMatches, matchesLoading } = useRankingsData();

  useEffect(() => {
    const updateRankings = async () => {
      const teamsToUse = teams;
      const matchesToUse = latestMatches || matches;
      
      if (!teamsToUse || teamsToUse.length === 0) {
        setRankings([]);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Create rankings directly from team data, using v_team_details values
        const calculatedRankings = teamsToUse.map((team): Ranking => {
          const streak = calculateStreak(matchesToUse || [], team.id);
          const previousRank = previousRankings[team.id];
          
          return {
            teamId: team.id,
            teamName: team.name,
            imageUrl: team.imageUrl,
            logoUrl: team.logoUrl,
            wins: team.wins,
            losses: team.losses,
            gamesWon: team.game_wins,
            gamesLost: team.game_losses,
            winPercentage: team.win_percentage,
            gameWinPercentage: team.game_win_percentage,
            sos: team.sos,
            powerScore: team.power_score,
            streak,
            divisionName: team.divisionName || 'Unassigned',
            previousRank,
            rankChange: 0, // Will be calculated after sorting
            headToHead: {} // Will be populated if needed
          };
        });

        // Sort by power score from v_team_details (descending)
        const sortedRankings = calculatedRankings.sort((a, b) => b.powerScore - a.powerScore);
        
        // Update rank changes based on previous rankings
        const finalRankings = updateRankChanges(sortedRankings);
        
        // Save current rankings for future rank change calculations
        saveRankingsToStorage(finalRankings);
        
        setRankings(finalRankings);
      } finally {
        setIsLoading(false);
      }
    };
    
    updateRankings();
  }, [teams, latestMatches, matches, previousRankings]);

  return {
    rankings,
    isLoading: isLoading || matchesLoading,
  };
};
