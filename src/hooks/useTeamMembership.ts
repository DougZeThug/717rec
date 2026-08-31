import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { toast } from '@/hooks/useToast';
import {
  fetchAvailableTeams,
  fetchTeamMembership,
  joinTeamMembership,
  leaveTeamMembership,
} from '@/services/teams/TeamFetchService';
import { Team } from '@/types';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';

export function useTeamMembership() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    data: membership = null,
    isLoading: isFetching,
    error: membershipError,
  } = useQuery({
    queryKey: ['team-membership', user?.id],
    queryFn: () => (user ? fetchTeamMembership(user.id) : Promise.resolve(null)),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: availableTeams = [] as Team[] } = useQuery({
    queryKey: ['available-teams'],
    queryFn: fetchAvailableTeams,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const error = membershipError ? 'Failed to load team membership' : null;

  const joinTeam = async (teamId: string) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to join a team',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      await joinTeamMembership(user.id, teamId, !!membership);

      // A refused row is still a row, so `membership` is truthy after a
      // rejection. Asking again is a fresh request, not a team change.
      if (membership?.rejected_at) {
        toast({
          title: 'Team Request Submitted',
          description: 'Your new request to join the team has been submitted for admin approval',
        });
      } else if (membership) {
        toast({
          title: 'Team Request Submitted',
          description: 'Your request to change teams has been submitted for admin approval',
        });
      } else {
        toast({
          title: 'Team Request Submitted',
          description: 'Your request to join the team has been submitted for admin approval',
        });
      }

      // Invalidate to refetch membership data
      await queryClient.invalidateQueries({ queryKey: ['team-membership', user.id] });
    } catch (error) {
      errorLog('Error joining team:', error);
      toast({
        title: 'Failed to submit request',
        description: getUIErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const leaveTeam = async () => {
    if (!user || !membership) return;

    try {
      setIsLoading(true);
      await leaveTeamMembership(user.id);

      // Invalidate to clear membership data
      await queryClient.invalidateQueries({ queryKey: ['team-membership', user.id] });
      toast({
        title: 'Left Team',
        description: "You've successfully left the team",
      });
    } catch (error) {
      errorLog('Error leaving team:', error);
      toast({
        title: 'Failed to leave team',
        description: getUIErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMembership = () => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['team-membership', user.id] });
    }
  };

  /**
   * The membership as a place the person actually belongs, which a refused
   * request is not. `membership` is the raw row — the join screen needs it to
   * say the request was declined — but anywhere that answers "what is this
   * person's team", a refusal has to read as no team at all.
   */
  const activeMembership = membership?.rejected_at ? null : membership;

  return {
    membership,
    activeMembership,
    availableTeams,
    isLoading,
    isFetching,
    error,
    joinTeam,
    leaveTeam,
    refreshMembership,
  };
}
