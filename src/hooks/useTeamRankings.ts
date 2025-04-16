
import { useEffect, useState } from "react";
import { Team, Match, Ranking } from "@/types";
import { createRankingObject, sortRankings, updateRankChanges, saveRankingsToStorage } from "@/utils/rankingUtils";

export const useTeamRankings = (teams: Team[] | undefined, matches: Match[] | undefined) => {
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
  
  // Calculate team rankings when teams or matches change
  useEffect(() => {
    const calculateRankingsEffect = async () => {
      if (!teams || teams.length === 0) {
        setRankings([]);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Create ranking objects for each team asynchronously
        const rankingPromises = teams
          .filter(team => team !== null && team !== undefined)
          .map(team => createRankingObject(team, teams, matches, previousRankings));
          
        const unsortedRankings = await Promise.all(rankingPromises);
        
        // Sort rankings by default criteria (will be re-sorted in the component)
        const sortedRankings = sortRankings(unsortedRankings, 'powerScore', 'desc');
        
        // Update rank changes
        const finalRankings = updateRankChanges(sortedRankings);
        
        setRankings(finalRankings);
        
        // Save current rankings to localStorage for future comparison
        saveRankingsToStorage(finalRankings);
      } catch (error) {
        console.error('Error calculating rankings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    calculateRankingsEffect();
  }, [teams, matches, previousRankings]);
  
  return {
    rankings,
    isLoading
  };
};
