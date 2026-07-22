import { PlayoffBracket, PlayoffMatchStatus } from './playoffTypes';

// UUID validation utility
export const isValidUuidSafe = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Bracket state utilities
export const isBracketComplete = (bracket: PlayoffBracket): boolean => {
  return bracket.state === 'completed';
};

export const isBracketInProgress = (bracket: PlayoffBracket): boolean => {
  return bracket.state === 'in_progress';
};

/**
 * True when a playoff match is over: 'completed' (just finished) or
 * 'archived' (finished and superseded by downstream rounds — brackets-manager
 * status 5). Prefer this over comparing to 'completed' directly.
 * Also accepts raw brackets-manager numeric statuses (4 Completed,
 * 5 Archived) for cache entries that carry the numeric form.
 */
export const isPlayoffMatchFinished = (
  status: PlayoffMatchStatus | string | number | undefined | null
): boolean => {
  return status === 'completed' || status === 'archived' || status === 4 || status === 5;
};
