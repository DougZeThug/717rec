import { PlayoffBracket, PlayoffMatch } from '@/types';

import { BracketMatchesByType } from './types';

/**
 * Group bracket matches by type (winners, losers, finals) and round
 */
export function groupBracketMatchesByType(bracket: PlayoffBracket): BracketMatchesByType {
  // Initialize result structure
  const result: BracketMatchesByType = {
    winners: [],
    losers: [],
    finals: [],
  };

  // If no matches, return empty structure
  if (!bracket.matches || bracket.matches.length === 0) {
    return result;
  }

  // Group matches by type and round
  bracket.matches.forEach((match) => {
    if (
      match.matchType === 'winners' ||
      match.matchType === 'play-in' ||
      match.matchType === 'play-in-2'
    ) {
      // Initialize winners array at this round if needed
      while (result.winners.length <= match.round) {
        result.winners.push([]);
      }

      // Add match to the appropriate round
      result.winners[match.round].push(match);
    } else if (match.matchType === 'losers') {
      // Initialize losers array at this round if needed
      while (result.losers.length <= match.round) {
        result.losers.push([]);
      }

      // Add match to the appropriate round
      result.losers[match.round].push(match);
    } else if (match.matchType === 'finals') {
      // Add to finals array (not round-separated)
      result.finals.push(match);
    }
  });

  // Sort matches in each round by position
  result.winners.forEach((round) => round.sort((a, b) => a.position - b.position));
  result.losers.forEach((round) => round.sort((a, b) => a.position - b.position));
  result.finals.sort((a, b) => (a.round !== b.round ? a.round - b.round : a.position - b.position));

  return result;
}
