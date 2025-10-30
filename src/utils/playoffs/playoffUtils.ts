

import { ChallongeMatch, PlayoffMatch, PlayoffBracket } from './playoffTypes';

// Narrow common checks into tiny helpers
export const isChallongeBracket = (b: { challonge_tournament_id?: number }): boolean =>
  typeof b.challonge_tournament_id === 'number';

export const toPlayoffMatch = (m: ChallongeMatch): PlayoffMatch => ({
  id: String(m.id),
  bracket_id: String(m.tournament_id ?? ''),
  round: 0,
  position: 0,
  team1Id: m.player1_id ? String(m.player1_id) : null,
  team2Id: m.player2_id ? String(m.player2_id) : null,
  winnerId: m.winner_id ? String(m.winner_id) : null,
  team1Score: null,
  team2Score: null,
  team1GameWins: null,
  team2GameWins: null,
  matchType: "winners",
  bestOf: 3,
  status: m.state === 'complete' ? 'completed' : 'pending',
});

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
