
import { PlayoffMatch, PlayoffBracket, BracketMatchesByType } from "./types";

/**
 * Group matches by round for display
 * @param matches Array of matches to group
 * @returns Matches grouped by round number
 */
export const groupMatchesByRound = (matches: PlayoffMatch[]): PlayoffMatch[][] => {
  if (!matches || !matches.length) return [];
  
  const roundsMap: Record<number, PlayoffMatch[]> = {};
  
  // Group matches by round
  matches.forEach(match => {
    if (!roundsMap[match.round]) {
      roundsMap[match.round] = [];
    }
    roundsMap[match.round].push(match);
  });
  
  // Convert map to array of arrays, sorted by round
  const rounds = Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map(roundNum => roundsMap[roundNum]);
  
  return rounds;
};

/**
 * Group bracket matches by type (winners, losers, finals)
 * Useful for double elimination brackets
 * @param bracket The playoff bracket
 * @returns Object with matches grouped by type and round
 */
export const groupBracketMatchesByType = (bracket: PlayoffBracket): BracketMatchesByType => {
  // First, separate matches by type
  const winnerMatches = bracket.matches.filter(m => m.matchType === 'winners' || m.matchType === 'play-in');
  const loserMatches = bracket.matches.filter(m => m.matchType === 'losers');
  const finalMatches = bracket.matches.filter(m => m.matchType === 'finals');
  
  // Then group each type by round
  const winners = groupMatchesByRound(winnerMatches);
  const losers = groupMatchesByRound(loserMatches);
  
  return {
    winners,
    losers,
    finals: finalMatches
  };
};
