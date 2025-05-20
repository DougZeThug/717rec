
import { BaseFilter } from '../interfaces/StorageAdapter';

/**
 * Types for the Match adapter
 */
export interface MatchFilter extends BaseFilter {
  stage_id?: string;
  round?: number;
  group_id?: string;
  status?: string;
}

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
 */
export interface StageFilter extends BaseFilter {
  tournament_id?: string;
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
