
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TeamBadgeEvent } from '@/types/badges';

export const useTeamBadges = (teamId: string) => {
  return useQuery({
    queryKey: ['team-badges', teamId],
    queryFn: async (): Promise<TeamBadgeEvent[]> => {
      const { data, error } = await supabase
        .from('team_badge_events')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('awarded_at', { ascending: false });

      if (error) {
        console.error('Error fetching team badges:', error);
        throw error;
      }

      return (data || []).map((badge: any): TeamBadgeEvent => ({
        id: badge.id,
        team_id: badge.team_id,
        badge_type: badge.badge_type,
        season_id: badge.season_id,
        awarded_at: badge.awarded_at,
        metadata: badge.metadata || {},
        is_active: badge.is_active,
        created_at: badge.created_at
      }));
    },
    enabled: !!teamId
  });
};

export const useAllTeamBadges = () => {
  return useQuery({
    queryKey: ['all-team-badges'],
    queryFn: async (): Promise<TeamBadgeEvent[]> => {
      const { data, error } = await supabase
        .from('team_badge_events')
        .select('*')
        .eq('is_active', true)
        .order('awarded_at', { ascending: false });

      if (error) {
        console.error('Error fetching all team badges:', error);
        throw error;
      }

      return (data || []).map((badge: any): TeamBadgeEvent => ({
        id: badge.id,
        team_id: badge.team_id,
        badge_type: badge.badge_type,
        season_id: badge.season_id,
        awarded_at: badge.awarded_at,
        metadata: badge.metadata || {},
        is_active: badge.is_active,
        created_at: badge.created_at
      }));
    }
  });
};

export const useSeasonBadges = (seasonId: string) => {
  return useQuery({
    queryKey: ['season-badges', seasonId],
    queryFn: async (): Promise<TeamBadgeEvent[]> => {
      const { data, error } = await supabase
        .from('team_badge_events')
        .select('*')
        .eq('season_id', seasonId)
        .eq('is_active', true)
        .order('awarded_at', { ascending: false });

      if (error) {
        console.error('Error fetching season badges:', error);
        throw error;
      }

      return (data || []).map((badge: any): TeamBadgeEvent => ({
        id: badge.id,
        team_id: badge.team_id,
        badge_type: badge.badge_type,
        season_id: badge.season_id,
        awarded_at: badge.awarded_at,
        metadata: badge.metadata || {},
        is_active: badge.is_active,
        created_at: badge.created_at
      }));
    },
    enabled: !!seasonId
  });
};
