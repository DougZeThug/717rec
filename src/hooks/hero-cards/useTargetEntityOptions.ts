import { useQuery } from '@tanstack/react-query';

import {
  fetchDivisionsForSelector,
  fetchSeasonsForSelector,
  fetchTeamsForSelector,
} from '@/services/selectors/SelectorService';
import type { HeroCardTargetType } from '@/types/heroCard';

/**
 * The option lists behind the hero-card "who should see this" picker. Only the
 * list that matches the chosen target type is fetched; the other two stay idle.
 * Returns the raw query result for each list.
 */
export const useTargetEntityOptions = (targetType: HeroCardTargetType) => {
  const teams = useQuery({
    queryKey: ['teams-for-selector'],
    queryFn: fetchTeamsForSelector,
    enabled: targetType === 'team',
  });

  const divisions = useQuery({
    queryKey: ['divisions-for-selector'],
    queryFn: fetchDivisionsForSelector,
    enabled: targetType === 'division',
  });

  const seasons = useQuery({
    queryKey: ['seasons-for-selector'],
    queryFn: fetchSeasonsForSelector,
    enabled: targetType === 'season',
  });

  return { teams, divisions, seasons };
};
