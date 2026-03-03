import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
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
    queryFn: async () => {
      const { count, error } = await supabase
        .from('team_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING');

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
};

// Fetch requests for a specific team
export const useTeamRequests = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-requests', 'team', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from('team_requests')
        .select(
          'id, team_id, season_id, request_type, status, match_date, current_timeslot, requested_timeslot, reason, admin_notes, submitted_by, submitted_by_name, processed_by, processed_at, created_at, updated_at'
        )
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as TeamRequest[];
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
};

// Fetch all requests for admin view
export const useAllRequests = (statusFilter?: TeamRequestStatus) => {
  return useQuery({
    queryKey: ['team-requests', 'all', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('team_requests')
        .select(
          `
          *,
          teams:team_id (name)
        `
        )
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TeamRequestWithTeam[];
    },
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
      // Get current season
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single();

      const { data, error } = await supabase
        .from('team_requests')
        .insert({
          ...request,
          season_id: season?.id,
          status: 'PENDING',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('team_requests')
        .update({
          status,
          admin_notes,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
