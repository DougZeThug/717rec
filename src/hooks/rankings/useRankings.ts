
import { useState, useEffect } from "react";
import { Ranking } from "@/types";
import { useTeamsData } from "../useTeamsData";
import { useRankingsData } from "./useRankingsData";
import { createRankingObject } from "@/utils/rankingUtils/createRankingObject";
import { sortAndUpdateRankings } from "@/utils/rankingUtils/sortAndUpdateRankings";
import { fetchDivisionWeights } from "@/utils/rankingUtils/divisionWeightsCache";
import { errorLog } from "@/utils/logger";

export const useRankings = () => {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { teams, isLoading: teamsLoading } = useTeamsData();
  const { latestMatches, matchesLoading } = useRankingsData();

  useEffect(() => {
    const calculateRankings = async () => {
      if (teamsLoading || matchesLoading) {
        setIsLoading(true);
        return;
      }

      try {
        setIsLoading(true);
        
        // Fetch division weights ONCE before processing all teams
        const divisionWeights = await fetchDivisionWeights();
        
        // Load previous rankings from localStorage
        const savedRankings = localStorage.getItem("previousRankings");
        const previousRankings: Record<string, number> = savedRankings ? JSON.parse(savedRankings) : {};
        
        // Create ranking objects for all teams (now synchronous)
        const unsortedRankings = teams.map(team => 
          createRankingObject(team, teams, latestMatches, previousRankings, divisionWeights)
        );
        
        // Sort and update rank changes
        const sortedRankings = sortAndUpdateRankings(unsortedRankings, previousRankings);
        
        // Save current rankings as previous for next calculation
        const currentRankings: Record<string, number> = {};
        sortedRankings.forEach((ranking, index) => {
          currentRankings[ranking.teamId] = index + 1;
        });
        localStorage.setItem("previousRankings", JSON.stringify(currentRankings));
        
        setRankings(sortedRankings);
        setError(null);
      } catch (err) {
        errorLog("Error calculating rankings:", err);
        setError(err instanceof Error ? err.message : "Failed to calculate rankings");
      } finally {
        setIsLoading(false);
      }
    };

    calculateRankings();
  }, [teams, latestMatches, teamsLoading, matchesLoading]);

  return {
    rankings,
    isLoading,
    error,
  };
};
