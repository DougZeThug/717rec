import { PlayoffBracket } from './playoffTypes';

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
