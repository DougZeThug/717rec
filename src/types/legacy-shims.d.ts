
// legacy-shims.d.ts
import { PlayoffMatch, PlayoffMatchType as MatchType } from '@/types/playoffs';

/** ---- hard aliases ---- */
export type PlayoffMatchType = MatchType;
export type DatabasePlayoffMatch = any;       // narrow later
export interface PlayoffGame {                // minimal so tests compile
  id: string;
  matchId?: string;
  gameNumber?: number;
  team1Score: number;
  team2Score: number;
  winnerId?: string;
  winner?: string;
}

/** stubs for repos we no longer use */
export class DatabaseOperationError extends Error {
  operation: string;
  originalError?: Error;

  constructor(operation: string, message: string, originalError?: Error) {
    super(message);
    this.name = 'DatabaseOperationError';
    this.operation = operation;
    this.originalError = originalError;
  }
}

export interface IParticipantRepository {
  // Stub interface
}

export interface ParticipantData {
  // Stub interface for participant data
  id: string;
  name: string;
  bracket_id?: string;
  position?: number;
}

export interface ParticipantFilter {
  // Stub interface for participant filter
  tournament_id?: string;
  name?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
