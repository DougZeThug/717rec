
import { useState, useEffect } from "react";
import { Team, Match, Ranking } from "@/types";
import { useRankingsData } from "./rankings/useRankingsData";
import { usePreviousRankings } from "./rankings/usePreviousRankings";
import { updateRankChanges, saveRankingsToStorage } from "@/utils/rankingUtils";
import { calculateStreak } from "@/utils/rankingUtils/calculateStreak";
import { useTeams } from "./useTeams";

export const useTeamRankings = (teams?: Team[] | undefined, matches?: Match[] | undefined) => {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { previousRankings, lastUpdated } = usePreviousRankings();
  const { latestMatches, matchesLoading } = useRankingsData();
  const { teams: latestTeams, isLoading: teamsLoading } = useTeams();

  useEffect(() => {
    console.log("Previous rankings loaded for trend calculation:", previousRankings, "Last updated:", lastUpdated);

    const updateRankings = async () => {
      const teamsToUse = teams || latestTeams;
      const matchesToUse = matches || latestMatches;
      
      // Wait for teams data to be loaded
      if (!teamsToUse || teamsToUse.length === 0 || teamsLoading) {
        console.log("Teams not loaded yet or empty:", { teamsCount: teamsToUse?.length, teamsLoading });
        setRankings([]);
        return;
      }

      setIsLoading(true);
      
      try {
        console.log(`Processing ${teamsToUse.length} teams with power scores (NULL for 0-0 teams)`);
        
        // Create rankings directly from team data, handling NULL power scores
        const calculatedRankings = teamsToUse.map((team): Ranking => {
          // Calculate streak from matches
          const streak = calculateStreak(team.id, matchesToUse);
          const previousRank = previousRankings[team.id];
          
          // Debug log for power score data (including NULL values)
          console.log(`Team ${team.name}: power_score=${team.power_score}, wins=${team.wins}, losses=${team.losses}`);
          
          // Use the power_score from v_team_details (NULL for teams with no matches)
          return {
            teamId: team.id,
            teamName: team.name,
            imageUrl: team.imageUrl,
            logoUrl: team.logoUrl,
            wins: team.wins || 0,
            losses: team.losses || 0,
            gamesWon: team.game_wins || 0,
            gamesLost: team.game_losses || 0,
            winPercentage: team.win_percentage || 0,
            gameWinPercentage: team.game_win_percentage || 0,
            sos: team.sos || 0.5,
            powerScore: team.power_score || 0, // Convert NULL to 0 for sorting, but keep original for display
            streak,
            divisionName: team.divisionName || 'Unassigned',
            previousRank,
            rankChange: 0, // Will be calculated after sorting
            headToHead: {}, // Will be populated if needed
            closeMatchLosses: team.close_match_losses || 0
          };
        });

        // Sort by power score with NULL handling - teams with NULL scores go to the end
        const sortedRankings = calculatedRankings.sort((a, b) => {
          const aOriginalPowerScore = teamsToUse.find(t => t.id === a.teamId)?.power_score;
          const bOriginalPowerScore = teamsToUse.find(t => t.id === b.teamId)?.power_score;
          
          // Handle NULL values - put them at the end
          if (aOriginalPowerScore === null && bOriginalPowerScore === null) {
            // Both are NULL, sort by win percentage as secondary
            if (b.winPercentage !== a.winPercentage) {
              return b.winPercentage - a.winPercentage;
            }
            // Tertiary sort by name
            return a.teamName.localeCompare(b.teamName);
          }
          if (aOriginalPowerScore === null) return 1;  // a goes to end
          if (bOriginalPowerScore === null) return -1; // b goes to end
          
          // Both have power scores, sort normally (descending)
          if (bOriginalPowerScore !== aOriginalPowerScore) {
            return bOriginalPowerScore - aOriginalPowerScore;
          }
          // Secondary sort by win percentage
          if (b.winPercentage !== a.winPercentage) {
            return b.winPercentage - a.winPercentage;
          }
          // Tertiary sort by name
          return a.teamName.localeCompare(b.teamName);
        });
        
        console.log("Sorted rankings with NULL power scores at end:", 
          sortedRankings.slice(0, 5).map(r => {
            const originalTeam = teamsToUse.find(t => t.id === r.teamId);
            return {
              team: r.teamName,
              powerScore: originalTeam?.power_score, // Show actual value (NULL or number)
              winPct: r.winPercentage
            };
          })
        );

        // Update rank changes based on previous rankings
        const finalRankings = updateRankChanges(sortedRankings);
        
        // Save current rankings for future rank change calculations
        saveRankingsToStorage(finalRankings);
        
        setRankings(finalRankings);
      } catch (error) {
        console.error("Error calculating rankings:", error);
        setRankings([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    updateRankings();
  }, [teams, latestTeams, latestMatches, matches, previousRankings, lastUpdated, teamsLoading]);

  return {
    rankings,
    isLoading: isLoading || teamsLoading || matchesLoading,
  };
};
