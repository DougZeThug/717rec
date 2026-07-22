export type Id = number | string;

/**
 * Opponent slot in brackets-manager format
 */
export interface BmOpponentSlot {
  id: number | null;
  position?: number;
  score?: number | null;
  result?: 'win' | 'loss' | 'draw' | null;
}

/**
 * Match in brackets-manager format (nested opponent objects)
 */
export interface BmMatch {
  id?: number;
  number?: number;
  stage_id?: number;
  group_id?: number;
  round_id?: number;
  child_count?: number;
  status?: number;
  opponent1?: BmOpponentSlot | null;
  opponent2?: BmOpponentSlot | null;
}

/**
 * Match in database format (flattened columns)
 */
export interface DbMatch {
  id?: number;
  number?: number;
  stage_id?: number;
  group_id?: number;
  round_id?: number;
  child_count?: number;
  status?: number;
  opponent1_id?: number | null;
  opponent1_score?: number | null;
  opponent1_result?: string | null;
  opponent1_position?: number | null;
  opponent2_id?: number | null;
  opponent2_score?: number | null;
  opponent2_result?: string | null;
  opponent2_position?: number | null;
}
