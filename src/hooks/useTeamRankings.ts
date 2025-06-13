
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
      
      // Wait for teams data to be loaded and ensure we have corrected power scores
      if (!teamsToUse || teamsToUse.length === 0 || teamsLoading) {
        console.log("Teams not loaded yet or empty:", { teamsCount: teamsToUse?.length, teamsLoading });
        setRankings([]);
        return;
      }

      // Check if teams have corrected power scores from the database calculation
      const teamsWithPowerScores = teamsToUse.filter(team => 
        team.power_score !== undefined && team.power_score !== null
      );

      if (teamsWithPowerScores.length === 0) {
        console.log("No teams with corrected power scores found, waiting for database data to load...");
        console.log("Sample team data:", teamsToUse.slice(0, 2).map(t => ({
          name: t.name,
          power_score: t.power_score,
          wins: t.wins,
          losses: t.losses
        })));
        setRankings([]);
        return;
      }
      
      setIsLoading(true);
      
      try {
        console.log(`Processing ${teamsToUse.length} teams with CORRECTED database power scores (fixed weighted formulas)`);
        
        // Create rankings directly from team data, using the corrected v_team_details values
        const calculatedRankings = teamsToUse.map((team): Ranking => {
          // Calculate streak from matches
          const streak = calculateStreak(team.id, matchesToUse);
          const previousRank = previousRankings[team.id];
          
          // Debug log for corrected power score data
          console.log(`Team ${team.name}: CORRECTED power_score=${team.power_score}, wins=${team.wins}, losses=${team.losses}`);
          
          // Use the corrected power_score from v_team_details (fixed 40/40/20 formula)
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
            powerScore: team.power_score || 50.0, // Database-calculated using CORRECTED weighted formulas
            streak,
            divisionName: team.divisionName || 'Unassigned',
            previousRank,
            rankChange: 0, // Will be calculated after sorting
            headToHead: {}, // Will be populated if needed
            closeMatchLosses: team.close_match_losses || 0
          };
        });

        // Sort by corrected power score from v_team_details (descending)
        const sortedRankings = calculatedRankings.sort((a, b) => {
          // Primary sort by corrected power score (descending)
          if (b.powerScore !== a.powerScore) {
            return b.powerScore - a.powerScore;
          }
          // Secondary sort by win percentage if power scores are equal
          if (b.winPercentage !== a.winPercentage) {
            return b.winPercentage - a.winPercentage;
          }
          // Tertiary sort by name for consistency
          return a.teamName.localeCompare(b.teamName);
        });
        
        console.log("Sorted rankings by CORRECTED power score (fixed weighted 40/40/20 formula):", 
          sortedRankings.slice(0, 5).map(r => ({
            team: r.teamName,
            powerScore: r.powerScore,
            winPct: r.winPercentage
          }))
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
