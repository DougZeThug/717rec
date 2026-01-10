/**
 * Bracket format constants
 */
export const BRACKET_FORMATS = {
  SINGLE: 'Single Elimination',
  DOUBLE: 'Double Elimination',
} as const;

export type BracketFormat = (typeof BRACKET_FORMATS)[keyof typeof BRACKET_FORMATS];

/**
 * Bracket state constants
 */
export const BRACKET_STATES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

// Use the BracketState type from types/playoffs.ts
// This is now used for compatibility
export type { BracketState } from '@/utils/playoffs/playoffTypes';
