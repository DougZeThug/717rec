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
  | 'cool_fun_team'
  | 'ice_cold'
  | 'broom_crew'
  | 'gatekeeper'
  | 'chaos_agent'
  | 'bully';

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

export type BadgeRpcJsonResult = {
  awarded?: boolean;
  badge_type?: BadgeType;
  reason?: string;
  [key: string]: Json | string | number | boolean | null | undefined;
};

export type TeamStreakRpcResult = {
  streak_type: string;
  streak_count: number;
};

export interface BadgeRpcResult {
  process_match_badges: BadgeRpcJsonResult;
  award_kingslayer_badge: BadgeRpcJsonResult;
  award_clutch_performer_badge: BadgeRpcJsonResult;
  award_consistent_performer_badge: BadgeRpcJsonResult;
  award_streak_badges: BadgeRpcJsonResult;
  award_ice_cold_badge: BadgeRpcJsonResult;
  award_broom_crew_badge: BadgeRpcJsonResult;
  award_gatekeeper_badge: BadgeRpcJsonResult;
  award_chaos_agent_badge: BadgeRpcJsonResult;
  award_bully_badge: BadgeRpcJsonResult;
  calculate_team_streak: TeamStreakRpcResult[];
}

import type {
  BadgeOperationParams,
  BadgeOperationType,
  FailedBadgeOperation,
} from '@/services/FailedBadgeOperationsService';

export type BadgeOperationKind = BadgeOperationType;
export type { BadgeOperationParams, FailedBadgeOperation };
