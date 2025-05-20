
/**
 * Types for participant operations
 */

import { BaseFilter } from '../interfaces/StorageAdapter';

/**
 * Filter type for participant queries with specific properties
 */
export interface ParticipantFilter extends BaseFilter {
  tournament_id?: string;
  bracket_id?: string;
  team_id?: string;
  position?: number;
}

/**
 * Record type representing a participant in the database
 */
export interface ParticipantRecord {
  id: string;
  name: string;
  tournament_id: string | null;
  position: number | null;
}

/**
 * Database record as returned from Supabase
 */
export interface ParticipantDbRecord {
  id: string;
  team_id: string;
  bracket_id: string;
  position: number;
  name?: string;
  teams?: {
    name: string;
  };
}

/**
 * Data needed to insert a participant into the database
 */
export interface ParticipantInsertData {
  bracket_id: string;
  team_id: string;
  position: number;
  name?: string;
}

/**
 * Error thrown when participant operations fail
 */
export class ParticipantOperationError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'ParticipantOperationError';
  }
}
