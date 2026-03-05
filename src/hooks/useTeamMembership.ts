import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';
import {
  fetchTeamMembership,
  fetchAvailableTeams,
  joinTeamMembership,
  leaveTeamMembership,
  type TeamMembershipRecord,
} from '@/services/teams/TeamFetchService';
import { Team } from '@/types';
import { errorLog } from '@/utils/logger';

interface TeamMembershipData extends TeamMembershipRecord {}

export function useTeamMembership() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [membership, setMembership] = useState<TeamMembershipData | null>(null);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch current team membership if user is logged in
  useEffect(() => {
    if (user) {
      fetchMembership();
      fetchTeams();
    }
  }, [user]);

  const fetchMembership = async () => {
    if (!user) return;

    try {
      setIsFetching(true);
      setError(null);
      const data = await fetchTeamMembership(user.id);
      setMembership(data);
    } catch (err) {
      errorLog('Error fetching team membership:', err);
      setError('Failed to load team membership');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const teams = await fetchAvailableTeams();
      setAvailableTeams(teams);
    } catch (error) {
      errorLog('Error fetching teams:', error);
    }
  };

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

      // Refresh membership data
      await fetchMembership();
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

      setMembership(null);
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

  return {
    membership,
    availableTeams,
    isLoading,
    isFetching,
    error,
    joinTeam,
    leaveTeam,
    refreshMembership: fetchMembership,
  };
}
