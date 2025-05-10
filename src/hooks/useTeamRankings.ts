
import { useState, useEffect } from "react";
import { Team, Match, Ranking } from "@/types";
import { useRankingsData } from "./rankings/useRankingsData";
import { usePreviousRankings } from "./rankings/usePreviousRankings";
import { updateRankChanges, saveRankingsToStorage } from "@/utils/rankingUtils";
import { calculateStreak } from "@/utils/rankingUtils";
import { useTeams } from "./useTeams";

export const useTeamRankings = (teams?: Team[] | undefined, matches?: Match[] | undefined) => {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { previousRankings, lastUpdated } = usePreviousRankings();
  const { latestMatches, matchesLoading } = useRankingsData();
  const { teams: latestTeams, isLoading: teamsLoading } = useTeams();

  useEffect(() => {
    console.log("Previous rankings loaded:", previousRankings, "Last updated:", lastUpdated);

    const updateRankings = async () => {
      const teamsToUse = teams || latestTeams;
      const matchesToUse = matches || latestMatches;
      
      if (!teamsToUse || teamsToUse.length === 0) {
        setRankings([]);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Create rankings directly from team data, using v_team_details values
        const calculatedRankings = teamsToUse.map((team): Ranking => {
          // Calculate streak from matches
          const streak = calculateStreak(team.id, matchesToUse);
          const previousRank = previousRankings[team.id];
          
          // Use the power_score directly from v_team_details
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
            headToHead: {}, // Will be populated if needed
            closeMatchLosses: team.close_match_losses || 0
          };
        });

        // Sort by power score from v_team_details (descending)
        const sortedRankings = calculatedRankings.sort((a, b) => b.powerScore - a.powerScore);
        
        console.log("Before updating rank changes:", 
          sortedRankings.map(r => ({
            team: r.teamName,
            previousRank: r.previousRank,
            currentRank: sortedRankings.findIndex(sr => sr.teamId === r.teamId) + 1
          }))
        );

        // Update rank changes based on previous rankings
        const finalRankings = updateRankChanges(sortedRankings);
        
        console.log("After updating rank changes:", 
          finalRankings.map(r => ({
            team: r.teamName, 
            rankChange: r.rankChange
          }))
        );
        
        // Save current rankings for future rank change calculations
        saveRankingsToStorage(finalRankings);
        
        setRankings(finalRankings);
      } finally {
        setIsLoading(false);
      }
    };
    
    updateRankings();
  }, [teams, latestTeams, latestMatches, matches, previousRankings, lastUpdated]);

  return {
    rankings,
    isLoading: isLoading || teamsLoading || matchesLoading,
  };
};
