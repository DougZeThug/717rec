import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { BadgeType, TeamBadgeEvent } from '@/types/badges';
import { errorLog } from '@/utils/logger';

// ─── Internal helpers ─────────────────────────────────────────────────────────

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

// ─── fetchTeamBadges ──────────────────────────────────────────────────────────

export const fetchTeamBadges = async (teamId: string): Promise<TeamBadgeEvent[]> => {
  const { data, error } = await supabase
    .from('team_badge_events')
    .select('id, team_id, badge_type, season_id, awarded_at, metadata, is_active, created_at')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('awarded_at', { ascending: false });

  if (error) {
    errorLog('Error fetching team badges:', error);
    throw error;
  }

  return (data || []).map((badge) => transformBadge(badge as RawBadgeData));
};

// ─── fetchAllTeamBadges ───────────────────────────────────────────────────────

export const fetchAllTeamBadges = async (): Promise<TeamBadgeEvent[]> => {
  const { data, error } = await supabase
    .from('team_badge_events')
    .select('id, team_id, badge_type, season_id, awarded_at, metadata, is_active, created_at')
    .eq('is_active', true)
    .order('awarded_at', { ascending: false });

  if (error) {
    errorLog('Error fetching all team badges:', error);
    throw error;
  }

  return (data || []).map((badge) => transformBadge(badge as RawBadgeData));
};

// ─── fetchSeasonBadges ────────────────────────────────────────────────────────

export const fetchSeasonBadges = async (seasonId: string): Promise<TeamBadgeEvent[]> => {
  const { data, error } = await supabase
    .from('team_badge_events')
    .select('id, team_id, badge_type, season_id, awarded_at, metadata, is_active, created_at')
    .eq('season_id', seasonId)
    .eq('is_active', true)
    .order('awarded_at', { ascending: false });

  if (error) {
    errorLog('Error fetching season badges:', error);
    throw error;
  }

  return (data || []).map((badge) => transformBadge(badge as RawBadgeData));
};
