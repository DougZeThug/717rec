
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TeamBadgeEvent } from '@/types/badges';

export const useTeamBadgesRealtime = (teamId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!teamId) return;

    console.log('Setting up realtime subscription for team badges:', teamId);

    const channel = supabase
      .channel('team-badges-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_badge_events',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          console.log('Team badge realtime update:', payload);
          
          // Invalidate team badges queries to refetch
          queryClient.invalidateQueries({ queryKey: ['team-badges', teamId] });
          queryClient.invalidateQueries({ queryKey: ['all-team-badges'] });
          
          // Optionally show a toast notification
          if (payload.eventType === 'INSERT') {
            const newBadge = payload.new as TeamBadgeEvent;
            console.log(`New badge awarded: ${newBadge.badge_type} for team ${teamId}`);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up team badges realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [teamId, queryClient]);

  // Also listen for global badge updates for all teams
  useEffect(() => {
    const globalChannel = supabase
      .channel('all-badges-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_badge_events'
        },
        (payload) => {
          console.log('Global badge realtime update:', payload);
          
          // Invalidate all badge-related queries
          queryClient.invalidateQueries({ queryKey: ['all-team-badges'] });
          
          // Invalidate specific team badges if we have the team ID
          if (payload.new?.team_id) {
            queryClient.invalidateQueries({ queryKey: ['team-badges', payload.new.team_id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [queryClient]);
};

// Enhanced version of useTeamBadges with realtime
export const useTeamBadgesEnhanced = (teamId: string) => {
  useTeamBadgesRealtime(teamId);
  
  // Use the existing useTeamBadges hook
  const { useTeamBadges } = require('./useTeamBadges');
  return useTeamBadges(teamId);
};
