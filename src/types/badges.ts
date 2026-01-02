
import { LucideIcon } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

export type BadgeType = 
  | 'recreational_champion'
  | 'intermediate_champion' 
  | 'competitive_champion'
  | 'recreational_runner_up'
  | 'intermediate_runner_up'
  | 'competitive_runner_up'
  | 'recreational_third_place'
  | 'intermediate_third_place'
  | 'competitive_third_place'
  | 'king_slayer'
  | 'clutch_performer'
  | 'consistent_performer'
  | 'hot_streak'
  | 'cold_streak'
  | 'cool_fun_team';

export interface TeamBadgeEvent {
  id: string;
  team_id: string;
  badge_type: BadgeType;
  season_id: string | null;
  awarded_at: string;
  metadata: Json;
  is_active: boolean;
  created_at: string;
}

export interface BadgeConfig {
  type: BadgeType;
  name: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  bgColor: string;
  textColor: string;
  isPermanent: boolean;
  category: 'championship' | 'performance' | 'streak';
}

/**
 * Strongly-typed badge metadata for different badge types
 */
export interface ChampionshipBadgeMetadata {
  season_name: string;
  division_name: string;
  playoff_wins?: number;
  playoff_losses?: number;
}

export interface KingSlayerBadgeMetadata {
  defeated_team_id: string;
  defeated_team_name: string;
  match_id: string;
  season_name: string;
}

export interface StreakBadgeMetadata {
  streak_length: number;
  start_date: string;
  end_date?: string;
}

export interface PerformanceBadgeMetadata {
  stat_value: number;
  threshold: number;
  period: 'season' | 'career';
}

export type BadgeMetadata = 
  | ChampionshipBadgeMetadata 
  | KingSlayerBadgeMetadata 
  | StreakBadgeMetadata 
  | PerformanceBadgeMetadata
  | Record<string, unknown>;
