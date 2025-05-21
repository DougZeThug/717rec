
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
  seeding?: number;
}

/**
 * Record type representing a participant in the application
 */
export interface ParticipantRecord {
  id: string;
  name: string;
  tournament_id: string | null;
  position: number | null;
  seeding?: number | null;
}

/**
 * Database record as returned from Supabase
 */
export interface ParticipantDbRecord {
  id: string;
  team_id: string;
  bracket_id: string;
  tournament_id?: string;
  position: number;
  seeding?: number;
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
  tournament_id?: string;
  team_id: string;
  position: number;
  seeding?: number;
  name?: string;
}

/**
 * Result of participant operations
 */
export interface ParticipantOperationResult {
  success: boolean;
  count: number;
  message?: string;
  details?: any;
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

/**
 * Error thrown when validation fails
 */
export class ParticipantValidationError extends ParticipantOperationError {
  constructor(message: string, public readonly validationDetails?: any) {
    super(message, validationDetails);
    this.name = 'ParticipantValidationError';
  }
}
