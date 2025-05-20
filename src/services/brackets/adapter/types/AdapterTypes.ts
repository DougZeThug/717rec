import { BaseFilter } from '../interfaces/StorageAdapter';

/**
 * Types for the Match adapter
 */
export interface MatchFilter extends BaseFilter {
  stage_id?: string;
  round?: number;
  group_id?: string;
  status?: string;
  bracket_id?: string;
}

// Re-export BaseFilter for convenience - using export type to fix TS1205 error
export type { BaseFilter } from '../interfaces/StorageAdapter';

export interface MatchRecord {
  id: string;
  stage_id: string;
  group_id?: string;
  round: number;
  position: number;
  opponent1?: {
    id: string;
    position?: number;
    score?: number;
    result?: 'win' | 'loss' | 'draw';
  };
  opponent2?: {
    id: string;
    position?: number;
    score?: number;
    result?: 'win' | 'loss' | 'draw';
  };
  status?: 'pending' | 'ready' | 'completed';
  next_match_id?: string;
  next_loser_match_id?: string;
  best_of?: number;
}

/**
 * Types for the Stage adapter
 * 
 * Important: StageFilter.id is a single string, not an array of strings
 * This addresses the type mismatch with StageAdapter implementation
 */
export interface StageFilter extends Omit<BaseFilter, 'id'> {
  tournament_id?: string;
  id?: string; // Specifically a string, not an array
  name?: string;
  type?: string;
}

export interface StageRecord {
  id: string;
  name: string;
  tournament_id: string;
  type: 'single_elimination' | 'double_elimination' | string;
  settings: {
    seedOrdering?: string[];
    size?: number;
    matchesChildCount?: number;
    consolationFinal?: boolean;
    grandFinal?: 'none' | 'simple' | 'double';
    match?: {
      games?: number;
    };
  };
}

/**
 * Types for the Participant adapter
 */
export interface ParticipantFilter extends BaseFilter {
  tournament_id?: string;
  bracket_id?: string;
}

export interface ParticipantRecord {
  id: string;
  tournament_id: string;
  name: string;
  position?: number;
}

/**
 * Union type for all bracket record types
 */
export type BracketRecord = MatchRecord | StageRecord | ParticipantRecord;

/**
 * Union type for all bracket filter types
 */
export type BracketFilter = MatchFilter | StageFilter | ParticipantFilter | BaseFilter;

/**
 * Table names enum for adapter operations
 */
export enum BracketTable {
  Match = 'match',
  Participant = 'participant',
  Stage = 'stage'
}
