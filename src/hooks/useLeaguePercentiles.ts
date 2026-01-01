import { useMemo } from 'react';
import { useCareerRankings } from './useCareerRankings';
import { calculatePercentile, PercentileResult } from '@/utils/percentileUtils';

export interface TeamPercentiles {
  winPercentage: PercentileResult;
  gameWinPercentage: PercentileResult;
  powerScore: PercentileResult;
  sos: PercentileResult;
  sweepRate?: PercentileResult;
  championships: PercentileResult;
  playoffWinPercentage: PercentileResult;
}

export interface LeaguePercentilesData {
  getTeamPercentiles: (teamId: string) => TeamPercentiles | null;
  allPercentiles: Map<string, TeamPercentiles>;
  isLoading: boolean;
  totalTeams: number;
}

export function useLeaguePercentiles(): LeaguePercentilesData {
  const { data: rankings, isLoading } = useCareerRankings();

  const { allPercentiles, totalTeams } = useMemo(() => {
    if (!rankings || rankings.length === 0) {
      return { allPercentiles: new Map<string, TeamPercentiles>(), totalTeams: 0 };
    }

    // Extract all values for each stat
    const winPctValues = rankings.map(r => r.careerWinPercentage);
    const gameWinPctValues = rankings.map(r => r.careerGameWinPercentage);
    const powerScoreValues = rankings.map(r => r.careerPowerScore);
    const sosValues = rankings.map(r => r.careerSos);
    const championshipValues = rankings.map(r => r.championships);
    const playoffWinPctValues = rankings
      .filter(r => r.careerPlayoffWins + r.careerPlayoffLosses > 0)
      .map(r => r.careerPlayoffWinPercentage);

    const percentileMap = new Map<string, TeamPercentiles>();

    for (const ranking of rankings) {
      const hasPlayoffGames = ranking.careerPlayoffWins + ranking.careerPlayoffLosses > 0;

      percentileMap.set(ranking.teamId, {
        winPercentage: calculatePercentile(ranking.careerWinPercentage, winPctValues, true),
        gameWinPercentage: calculatePercentile(ranking.careerGameWinPercentage, gameWinPctValues, true),
        powerScore: calculatePercentile(ranking.careerPowerScore, powerScoreValues, true),
        sos: calculatePercentile(ranking.careerSos, sosValues, true), // Higher SOS = tougher opponents
        championships: calculatePercentile(ranking.championships, championshipValues, true),
        playoffWinPercentage: hasPlayoffGames 
          ? calculatePercentile(ranking.careerPlayoffWinPercentage, playoffWinPctValues, true)
          : { value: 0, percentile: 0, rank: 0, total: 0 },
      });
    }

    return { allPercentiles: percentileMap, totalTeams: rankings.length };
  }, [rankings]);

  const getTeamPercentiles = (teamId: string): TeamPercentiles | null => {
    return allPercentiles.get(teamId) || null;
  };

  return {
    getTeamPercentiles,
    allPercentiles,
    isLoading,
    totalTeams
  };
}
