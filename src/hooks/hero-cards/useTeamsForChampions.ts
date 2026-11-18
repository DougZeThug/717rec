import { useQuery } from '@tanstack/react-query';

import { HeroCardService } from '@/services/HeroCardService';

/**
 * Teams the champions editor can pick from: every team outside the hidden
 * divisions. The caller says when to run it (it waits for the division list).
 */
export const useTeamsForChampions = (hiddenDivisionIds: string[], enabled: boolean) =>
  useQuery({
    queryKey: ['teams-for-champions', hiddenDivisionIds],
    queryFn: () => HeroCardService.fetchTeamsForChampions(hiddenDivisionIds),
    enabled,
  });
