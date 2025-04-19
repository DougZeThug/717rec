
import { useState, useEffect } from "react";
import { Team, Match, Ranking } from "@/types";
import { useRankingsData } from "./rankings/useRankingsData";
import { usePreviousRankings } from "./rankings/usePreviousRankings";
import { calculateRankings } from "@/services/RankingsCalculationService";

export const useTeamRankings = (teams: Team[] | undefined, matches: Match[] | undefined) => {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const previousRankings = usePreviousRankings();
  const { latestMatches, matchesLoading } = useRankingsData();
  
  // Create ranking objects from teams data
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
        const calculatedRankings = await calculateRankings(
          teamsToUse,
          matchesToUse,
          previousRankings
        );
        
        setRankings(calculatedRankings);
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
