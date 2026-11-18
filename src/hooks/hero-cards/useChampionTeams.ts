import { useQuery } from '@tanstack/react-query';

import { HeroCardService } from '@/services/HeroCardService';

/**
 * The teams shown on a Champions hero card. `championsMap` is
 * `{ division name: team id }`. With no champions set the query stays off, so
 * `data` stays undefined and the card shows its error state.
 */
export const useChampionTeams = (championsMap: Record<string, string>) => {
  const championIds = Object.values(championsMap);

  return useQuery({
    queryKey: ['champions', championIds],
    queryFn: async () => {
      if (championIds.length === 0) return { teams: [], divisionMap: {} };

      const teams = await HeroCardService.fetchChampionTeams(championIds);

      const divisionMap: Record<string, string> = {};
      Object.entries(championsMap).forEach(([division, teamId]) => {
        divisionMap[teamId] = division;
      });

      return { teams, divisionMap };
    },
    enabled: championIds.length > 0,
  });
};
