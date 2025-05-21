
/**
 * Types for the BracketsManager adapter
 */

export interface BracketFilter {
  id?: string;
  tournament_id?: string;
  stage_id?: string;
}

export interface MatchFilter {
  id?: string;
  tournament_id?: string;
  stage_id?: string;
  round?: number;
  group_id?: string;
}

export interface ParticipantFilter {
  id?: string;
  tournament_id?: string;
  name?: string;
}

export interface StageFilter {
  id?: string;
  tournament_id?: string;
  name?: string;
  type?: string;
}
