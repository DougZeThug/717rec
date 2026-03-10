import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  fetchAllRequests,
  fetchPendingRequestsCount,
  fetchTeamRequests,
  submitTeamRequest,
  updateTeamRequestStatus,
} from '@/services/teams/TeamFetchService';
import type {
  TeamRequest,
  TeamRequestStatus,
  TeamRequestType,
  TeamRequestWithTeam,
} from '@/types/teamRequest';
import { errorLog } from '@/utils/logger';

// Fetch pending requests count for admin badge
export const usePendingRequestsCount = () => {
  return useQuery({
    queryKey: ['team-requests', 'pending-count'],
    queryFn: fetchPendingRequestsCount,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
};

// Fetch requests for a specific team
export const useTeamRequests = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-requests', 'team', teamId],
    queryFn: () => {
      if (!teamId) return Promise.resolve([] as TeamRequest[]);
      return fetchTeamRequests(teamId);
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
};

// Fetch all requests for admin view
export const useAllRequests = (statusFilter?: TeamRequestStatus) => {
  return useQuery({
    queryKey: ['team-requests', 'all', statusFilter],
    queryFn: () => fetchAllRequests(statusFilter),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
};

// Submit a new request
export const useSubmitRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: {
      team_id: string;
      request_type: TeamRequestType;
      match_date?: string;
      current_timeslot?: string;
      requested_timeslot?: string;
      reason?: string;
      submitted_by_name?: string;
    }) => {
      return submitTeamRequest(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-requests'] });
      toast({
        title: 'Request Submitted',
        description: 'Your request has been submitted and is pending review.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
      errorLog('Submit request error:', error);
    },
  });
};

// Admin: Update request status
export const useUpdateRequestStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_notes,
    }: {
      id: string;
      status: TeamRequestStatus;
      admin_notes?: string;
    }) => {
      return updateTeamRequestStatus({
        id,
        status,
        admin_notes,
        processed_by: user?.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-requests'] });
      toast({
        title: `Request ${variables.status === 'APPROVED' ? 'Approved' : 'Denied'}`,
        description: `The request has been ${variables.status.toLowerCase()}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update request. Please try again.',
        variant: 'destructive',
      });
      errorLog('Update request error:', error);
    },
  });
};
