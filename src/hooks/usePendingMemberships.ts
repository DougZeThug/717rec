import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchPendingMembershipsForAdmin,
  updateMembershipApproval,
} from '@/services/teams/TeamFetchService';

export const usePendingMemberships = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pending-memberships'],
    queryFn: fetchPendingMembershipsForAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: ({ membershipId, approved }: { membershipId: string; approved: boolean }) =>
      updateMembershipApproval(membershipId, approved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['pending-membership-count'] });
    },
  });

  return {
    pendingMemberships: query.data ?? [],
    isLoading: query.isLoading,
    approveMembership: (membershipId: string, approved: boolean) =>
      approveMutation.mutateAsync({ membershipId, approved }),
    processingId: approveMutation.isPending ? approveMutation.variables?.membershipId : null,
  };
};
