/** Extended error object with common properties from Supabase/API errors */
export interface ErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  table?: string;
  operation?: string;
  statusCode?: number;
}

/** Opponent data in bracket match */
export interface BracketOpponent {
  id?: number | null;
  position?: number;
  score?: number | null;
  result?: 'win' | 'loss' | 'draw' | null;
}

/** Match data from brackets-manager storage */
export interface StorageMatch {
  id: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  number: number;
  status: number;
  opponent1?: BracketOpponent | null;
  opponent2?: BracketOpponent | null;
}

/** Stage data from brackets-manager storage */
export interface StorageStage {
  id: number;
  tournament_id: string;
  name: string;
  type: string;
  number: number;
  settings: Record<string, unknown>;
}

/** Group data from brackets-manager storage */
export interface StorageGroup {
  id: number;
  stage_id: number;
  number: number;
}

/** Round data from brackets-manager storage */
export interface StorageRound {
  id: number;
  stage_id: number;
  group_id: number;
  number: number;
}

/** Participant data from brackets-manager storage */
export interface StorageParticipant {
  id: number;
  tournament_id: string;
  name: string | null;
  team_id?: string;
  position?: number;
}

/** Match update payload for brackets-manager */
export interface MatchUpdatePayload {
  id: number;
  opponent1?: {
    score?: number;
    result?: 'win' | 'loss' | 'draw';
  };
  opponent2?: {
    score?: number;
    result?: 'win' | 'loss' | 'draw';
  };
}

/** Options for creating a new bracket */
export interface CreateBracketOptions {
  bracketId: string;
  format: 'single_elimination' | 'double_elimination';
  teams: Array<{ id: string; name: string; seed: number }>;
  grandFinalType?: 'simple' | 'double';
}

/** Options for updating a match score */
export interface UpdateMatchOptions {
  matchId: number;
  scores: {
    opponent1: { score?: number; result?: 'win' | 'loss' | 'draw' };
    opponent2: { score?: number; result?: 'win' | 'loss' | 'draw' };
  };
}

/** Options for updating bracket seeding */
export interface UpdateSeedingOptions {
  bracketId: string;
  newSeeding: Array<{ id: string; name: string; seed: number }>;
  keepSameSize?: boolean;
}
