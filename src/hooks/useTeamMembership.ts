import { useQueryClient, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';
import {
  fetchAvailableTeams,
  fetchTeamMembership,
  joinTeamMembership,
  leaveTeamMembership,
  type TeamMembershipRecord,
} from '@/services/teams/TeamFetchService';
import { Team } from '@/types';
import { errorLog } from '@/utils/logger';

import { useState } from 'react';

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
    queryFn: () => fetchTeamMembership(user!.id),
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

      if (membership) {
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
      const message = error instanceof Error ? error.message : 'Please try again later';
      errorLog('Error joining team:', error);
      toast({
        title: 'Failed to submit request',
        description: message,
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
      const message = error instanceof Error ? error.message : 'Please try again later';
      errorLog('Error leaving team:', error);
      toast({
        title: 'Failed to leave team',
        description: message,
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

  return {
    membership,
    availableTeams,
    isLoading,
    isFetching,
    error,
    joinTeam,
    leaveTeam,
    refreshMembership,
  };
}
