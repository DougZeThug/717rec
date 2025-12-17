import { useState, useEffect } from 'react';
import { CareerRanking } from '@/types/career';
import { useTeamData } from './useTeamData';
import { useQuery } from '@tanstack/react-query';
import { fetchTeamTotals } from './useTeamTotals';
import { warnLog, errorLog } from '@/utils/logger';

const STORAGE_KEY = 'career-stats-show-hidden';

export function useCareerRankingsWithHidden() {
  // Get initial state from localStorage
  const [showHidden, setShowHidden] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : false;
  });

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(showHidden));
  }, [showHidden]);

  // Always fetch all teams to count hidden teams
  const { data: allTeams } = useTeamData(null, true);
  
  // Fetch teams based on toggle state
  const { data: teams, isLoading: isLoadingTeams, error: teamsError } = useTeamData(null, showHidden);

  const toggleShowHidden = () => {
    setShowHidden(!showHidden);
  };

  const careerQuery = useQuery({
    queryKey: ['careerRankings', teams?.map(t => t.id), showHidden],
    queryFn: async (): Promise<CareerRanking[]> => {
      if (!teams) return [];

      // Fetch career totals for all teams in parallel
      const careerPromises = teams.map(async (team) => {
        try {
          const totals = await fetchTeamTotals(team.id);

          if (!totals) {
            warnLog(`No career totals found for team: ${team.name}`);
            return null;
          }

          const totalCareerMatches = totals.career_match_wins + totals.career_match_losses;
          const careerWinPercentage = totalCareerMatches > 0 ? totals.career_match_wins / totalCareerMatches : 0;
          
          const totalCareerGames = totals.career_game_wins + totals.career_game_losses;
          const careerGameWinPercentage = totalCareerGames > 0 ? totals.career_game_wins / totalCareerGames : 0;
          
          const totalPlayoffMatches = totals.career_playoff_wins + totals.career_playoff_losses;
          const careerPlayoffWinPercentage = totalPlayoffMatches > 0 ? totals.career_playoff_wins / totalPlayoffMatches : 0;

          const careerRanking: CareerRanking = {
            teamId: team.id,
            teamName: team.name,
            logoUrl: team.logoUrl,
            imageUrl: team.imageUrl,
            divisionName: team.divisionName,  // Include division info
            
            // Career match stats
            careerMatchWins: totals.career_match_wins,
            careerMatchLosses: totals.career_match_losses,
            careerWinPercentage,
            
            // Career game stats
            careerGameWins: totals.career_game_wins,
            careerGameLosses: totals.career_game_losses,
            careerGameWinPercentage,
            
            // Career playoff stats
            careerPlayoffWins: totals.career_playoff_wins,
            careerPlayoffLosses: totals.career_playoff_losses,
            careerPlayoffWinPercentage,
            
            // Achievements
            championships: totals.championships,
            runnerUps: totals.runner_ups,
            
            // Career power score and meta stats
            careerPowerScore: totals.career_power_score,
            careerSos: totals.career_sos,
            playoffFinishes: totals.playoff_finishes?.length || 0,
          };

          return careerRanking;
        } catch (error) {
          errorLog(`Error fetching career stats for team ${team.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(careerPromises);
      const validRankings = results.filter((ranking): ranking is CareerRanking => ranking !== null);
      
      // Sort by career power score (descending)
      return validRankings.sort((a, b) => b.careerPowerScore - a.careerPowerScore);
    },
    enabled: !!teams && !isLoadingTeams && !teamsError,
    staleTime: 1000 * 60 * 10, // 10 minutes - career data is extremely static
  });

  // Count hidden teams from all teams (not filtered teams)
  const hiddenTeamCount = allTeams ? allTeams.filter(team => team.divisionName === 'Hidden').length : 0;

  return {
    ...careerQuery,
    showHidden,
    toggleShowHidden,
    hiddenTeamCount,
  };
}
