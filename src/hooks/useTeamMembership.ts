import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types';

interface TeamMembershipData {
  id: string;
  user_id: string;
  team_id: string;
  joined_at: string;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  team?: Team;
}

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
      const { data, error: fetchError } = await supabase
        .from('team_memberships')
        .select(
          `
          id,
          user_id,
          team_id,
          joined_at,
          is_approved,
          approved_by,
          approved_at,
          team:teams(id, name, logo_url, image_url, division_id, wins, losses, game_wins, game_losses)
        `
        )
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        // Transform the data to match the Team interface
        const transformedData: TeamMembershipData = {
          ...data,
          team: data.team
            ? {
                ...data.team,
                logoUrl: data.team.image_url || data.team.logo_url,
                imageUrl: data.team.image_url || data.team.logo_url,
                power_score: 0, // Default values for required properties
                sos: 0,
                win_percentage: 0,
                game_win_percentage: 0,
              }
            : undefined,
        };
        setMembership(transformedData);
      } else {
        setMembership(null);
      }
    } catch (err) {
      console.error('Error fetching team membership:', err);
      setError('Failed to load team membership');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, logo_url, image_url, division_id, wins, losses')
        .order('name');

      if (error) throw error;

      // Transform data to match the Team interface
      const transformedTeams: Team[] = (data || []).map((team) => ({
        id: team.id,
        name: team.name,
        logoUrl: team.image_url || team.logo_url,
        imageUrl: team.image_url || team.logo_url,
        division: team.division_id,
        wins: team.wins,
        losses: team.losses,
        power_score: 0, // Default values for required properties
        sos: 0,
        win_percentage: 0,
        game_win_percentage: 0,
      }));

      setAvailableTeams(transformedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
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

      // If already in a team, update the membership (but reset approval status)
      if (membership) {
        const { error } = await supabase
          .from('team_memberships')
          .update({
            team_id: teamId,
            is_approved: false,
            approved_by: null,
            approved_at: null,
          })
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: 'Team Request Submitted',
          description: 'Your request to change teams has been submitted for admin approval',
        });
      } else {
        // Otherwise create a new membership (starts as unapproved)
        const { error } = await supabase.from('team_memberships').insert({
          user_id: user.id,
          team_id: teamId,
          is_approved: false,
        });

        if (error) throw error;

        toast({
          title: 'Team Request Submitted',
          description: 'Your request to join the team has been submitted for admin approval',
        });
      }

      // Refresh membership data
      await fetchMembership();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again later';
      console.error('Error joining team:', error);
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
      const { error } = await supabase.from('team_memberships').delete().eq('user_id', user.id);

      if (error) throw error;

      setMembership(null);
      toast({
        title: 'Left Team',
        description: "You've successfully left the team",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again later';
      console.error('Error leaving team:', error);
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
