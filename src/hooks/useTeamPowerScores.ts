import { useQuery } from '@tanstack/react-query';

import { fetchTeamPowerScores } from '@/services/rankings/RankingCurrentService';

interface PowerScoreResult {
  powerScores: Record<string, number>;
  teamNames: Record<string, string>;
}

/** Fetch cached team power scores and names, with lookup helpers keyed by team id. */
export const useTeamPowerScores = () => {
  const { data, isLoading, error } = useQuery<PowerScoreResult, Error>({
    queryKey: ['team-power-scores'],
    queryFn: fetchTeamPowerScores,
    staleTime: 1000 * 60 * 5, // 5 minutes - power scores don't change frequently
  });

  const powerScores = data?.powerScores ?? {};
  const teamNames = data?.teamNames ?? {};

  // Get power score by team ID
  const getTeamPowerScore = (teamId: string | null): number | undefined => {
    if (!teamId) return undefined;
    return powerScores[teamId];
  };

  // Get team name by ID
  const getTeamName = (teamId: string | null): string | undefined => {
    if (!teamId) return undefined;
    return teamNames[teamId];
  };

  return {
    powerScores,
    teamNames,
    getTeamPowerScore,
    getTeamName,
    isLoading,
    error: error ?? null,
  };
};
