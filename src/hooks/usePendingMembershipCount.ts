import { useQuery } from '@tanstack/react-query';

import { fetchPendingMembershipCount } from '@/services/teams/TeamFetchService';

export const usePendingMembershipCount = () => {
  return useQuery({
    queryKey: ['pending-membership-count'],
    queryFn: fetchPendingMembershipCount,
    staleTime: 60_000,
  });
};
