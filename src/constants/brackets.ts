/**
 * Team-count limits for a single bracket.
 *
 * The one source of truth: the form schema, the creation dialog, the team
 * picker and the service-layer validator all derive their bounds from these.
 * Do not reintroduce literals — the limit was previously written out in six
 * places with three different maximums (32, 64 and a silent 16 fallback).
 *
 * MAX is 32 because BracketCreationService rounds the team count up to the
 * next power of two, so 32 teams fills a 32-slot bracket exactly. Raising it
 * means the next stop is 64 (a 64-slot bracket); brackets-manager supports
 * that, but the UI and tests should be extended deliberately.
 */
export const MIN_BRACKET_TEAMS = 2;
export const MAX_BRACKET_TEAMS = 32;

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
