
import { useEffect, useState } from "react";
import { Team, Match, Ranking } from "@/types";
import { createRankingObject, sortRankings, updateRankChanges, saveRankingsToStorage } from "@/utils/rankingUtils";

export const useTeamRankings = (teams: Team[] | undefined, matches: Match[] | undefined) => {
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});
  
  // Load previous rankings from localStorage
  useEffect(() => {
    const loadPreviousRankings = () => {
      try {
        const storedRankings = localStorage.getItem('previousRankings');
        if (storedRankings) {
          setPreviousRankings(JSON.parse(storedRankings));
        }
      } catch (error) {
        console.error('Error loading previous rankings:', error);
        setPreviousRankings({});
      }
    };
    
    loadPreviousRankings();
  }, []);
  
  // Calculate team rankings
  const calculateRankings = (teamsData: Team[] | undefined, matchesData: Match[] | undefined): Ranking[] => {
    if (!teamsData || teamsData.length === 0) {
      return [];
    }
    
    // Create ranking objects for each team
    const unsortedRankings = teamsData
      .filter(team => team !== null && team !== undefined)
      .map(team => createRankingObject(team, teamsData, matchesData, previousRankings));
    
    // Sort rankings by win percentage and SOS
    const sortedRankings = sortRankings(unsortedRankings);
    
    // Update rank changes
    return updateRankChanges(sortedRankings);
  };
  
  // Save current rankings to localStorage for future comparison
  useEffect(() => {
    if (teams && teams.length > 0 && matches) {
      const currentRankings = calculateRankings(teams, matches);
      saveRankingsToStorage(currentRankings);
    }
  }, [teams, matches]);

  return {
    calculateRankings
  };
};
