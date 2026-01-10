import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { BadgeType, TeamBadgeEvent } from '@/types/badges';
import { errorLog } from '@/utils/logger';

/**
 * Raw badge data from Supabase
 */
interface RawBadgeData {
  id: string;
  team_id: string;
  badge_type: string;
  season_id: string | null;
  awarded_at: string;
  metadata: Json;
  is_active: boolean;
  created_at: string;
}

/**
 * Transform raw badge data to typed TeamBadgeEvent
 */
function transformBadge(badge: RawBadgeData): TeamBadgeEvent {
  return {
    id: badge.id,
    team_id: badge.team_id,
    badge_type: badge.badge_type as BadgeType,
    season_id: badge.season_id,
    awarded_at: badge.awarded_at,
    metadata: badge.metadata || {},
    is_active: badge.is_active,
    created_at: badge.created_at,
  };
}

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
        errorLog('Error fetching team badges:', error);
        throw error;
      }

      return (data || []).map((badge) => transformBadge(badge as RawBadgeData));
    },
    enabled: !!teamId,
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
        errorLog('Error fetching all team badges:', error);
        throw error;
      }

      return (data || []).map((badge) => transformBadge(badge as RawBadgeData));
    },
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
        errorLog('Error fetching season badges:', error);
        throw error;
      }

      return (data || []).map((badge) => transformBadge(badge as RawBadgeData));
    },
    enabled: !!seasonId,
  });
};
