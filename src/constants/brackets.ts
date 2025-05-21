
/**
 * Bracket format constants
 */
export const BRACKET_FORMATS = {
  SINGLE: 'single_elimination',
  DOUBLE: 'double_elimination',
} as const;

export type BracketFormat = typeof BRACKET_FORMATS[keyof typeof BRACKET_FORMATS];

/**
 * Bracket state constants
 */
export const BRACKET_STATES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type BracketState = typeof BRACKET_STATES[keyof typeof BRACKET_STATES];
