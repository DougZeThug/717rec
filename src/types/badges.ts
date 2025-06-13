
import { LucideIcon } from 'lucide-react';

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
  | 'cold_streak';

export interface TeamBadgeEvent {
  id: string;
  team_id: string;
  badge_type: BadgeType;
  season_id: string | null;
  awarded_at: string;
  metadata: any; // Changed from Record<string, any> to any to match Supabase Json type
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
