import { useMemo } from 'react';

import { calculatePercentile, PercentileResult } from '@/utils/percentileUtils';
import { isCareerGradeable } from '@/utils/reportCardPopulations';

import { useCareerRankings } from './useCareerRankings';

export interface TeamPercentiles {
  winPercentage: PercentileResult;
  gameWinPercentage: PercentileResult;
  powerScore: PercentileResult;
  sos: PercentileResult;
  championships: PercentileResult;
  playoffWinPercentage: PercentileResult;
}

export interface LeaguePercentilesData {
  getTeamPercentiles: (teamId: string) => TeamPercentiles | null;
  isLoading: boolean;
}

/** What a team with nothing to measure gets: no rank, not a rank of last. */
const UNMEASURED: PercentileResult = { value: 0, percentile: 0, rank: 0, total: 0 };

export function useLeaguePercentiles(): LeaguePercentilesData {
  const { data: rankings, isLoading } = useCareerRankings();

  const { allPercentiles } = useMemo(() => {
    if (!rankings || rankings.length === 0) {
      return { allPercentiles: new Map<string, TeamPercentiles>() };
    }

    // Only teams that have played a career match are ranked against each other.
    // A team that has never played is scored 0 rather than "no score", so left
    // in it would sit at the floor of every list and lift each real team's
    // percentile above what it earned — the same way an unrated team once did on
    // the report card. See `isCareerGradeable`.
    const measured = rankings.filter(isCareerGradeable);

    // Extract all values for each stat
    const winPctValues = measured.map((r) => r.careerWinPercentage);
    const gameWinPctValues = measured.map((r) => r.careerGameWinPercentage);
    const powerScoreValues = measured.map((r) => r.careerPowerScore);
    const sosValues = measured.map((r) => r.careerSos);
    const championshipValues = measured.map((r) => r.championships);
    // Playoffs have always been counted this way: a team with no playoff match
    // has no playoff rate to rank, so it is left out rather than counted as a 0.
    const playoffWinPctValues = measured
      .filter((r) => r.careerPlayoffWins + r.careerPlayoffLosses > 0)
      .map((r) => r.careerPlayoffWinPercentage);

    const percentileMap = new Map<string, TeamPercentiles>();

    for (const ranking of rankings) {
      // Still in the map, so a caller asking about the team gets an answer
      // rather than null — but the answer is "not measured", not "last".
      if (!isCareerGradeable(ranking)) {
        percentileMap.set(ranking.teamId, {
          winPercentage: UNMEASURED,
          gameWinPercentage: UNMEASURED,
          powerScore: UNMEASURED,
          sos: UNMEASURED,
          championships: UNMEASURED,
          playoffWinPercentage: UNMEASURED,
        });
        continue;
      }

      const hasPlayoffGames = ranking.careerPlayoffWins + ranking.careerPlayoffLosses > 0;

      percentileMap.set(ranking.teamId, {
        winPercentage: calculatePercentile(ranking.careerWinPercentage, winPctValues, true),
        gameWinPercentage: calculatePercentile(
          ranking.careerGameWinPercentage,
          gameWinPctValues,
          true
        ),
        powerScore: calculatePercentile(ranking.careerPowerScore, powerScoreValues, true),
        sos: calculatePercentile(ranking.careerSos, sosValues, true), // Higher SOS = tougher opponents
        championships: calculatePercentile(ranking.championships, championshipValues, true),
        playoffWinPercentage: hasPlayoffGames
          ? calculatePercentile(ranking.careerPlayoffWinPercentage, playoffWinPctValues, true)
          : UNMEASURED,
      });
    }

    return { allPercentiles: percentileMap };
  }, [rankings]);

  const getTeamPercentiles = (teamId: string): TeamPercentiles | null => {
    return allPercentiles.get(teamId) || null;
  };

  return {
    getTeamPercentiles,
    isLoading,
  };
}
