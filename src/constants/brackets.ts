
/**
 * Constants for bracket formats and related values
 * Used to centralize string literals and prevent typos across the application
 */
export const BRACKET_FORMATS = {
  SINGLE: 'Single Elimination',
  DOUBLE: 'Double Elimination',
  ROUND: 'Round Robin',
} as const;

export const BRACKET_STATES = {
  PENDING: 'pending',
  UNDERWAY: 'underway',
  COMPLETE: 'complete',
} as const;

export type BracketFormat = typeof BRACKET_FORMATS[keyof typeof BRACKET_FORMATS];
export type BracketState = typeof BRACKET_STATES[keyof typeof BRACKET_STATES];
