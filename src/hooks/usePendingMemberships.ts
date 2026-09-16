import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  fetchPendingMembershipsForAdmin,
  updateMembershipApproval,
} from '@/services/teams/TeamFetchService';

export const usePendingMemberships = () => {
  const queryClient = useQueryClient();

  // One id per row, not one mutation's variables. useMutation only ever
  // reports the newest call, so reading isPending/variables unlocked every
  // earlier row the moment the admin started a second one — its spinner went
  // away and its buttons came back while its save was still running.
  const [processingIds, setProcessingIds] = useState<ReadonlySet<string>>(new Set());

  const query = useQuery({
    queryKey: ['pending-memberships'],
    queryFn: fetchPendingMembershipsForAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: ({ membershipId, approved }: { membershipId: string; approved: boolean }) =>
      updateMembershipApproval(membershipId, approved),
    onMutate: ({ membershipId }) => {
      setProcessingIds((curr) => new Set(curr).add(membershipId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['pending-membership-count'] });
    },
    onSettled: (_data, _error, { membershipId }) => {
      setProcessingIds((curr) => {
        const next = new Set(curr);
        next.delete(membershipId);
        return next;
      });
    },
  });

  return {
    pendingMemberships: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    approveMembership: (membershipId: string, approved: boolean) =>
      approveMutation.mutateAsync({ membershipId, approved }),
    processingIds,
  };
};
