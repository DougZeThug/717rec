import { BRACKET_FORMATS, BRACKET_STATES } from '@/constants/brackets';
import { BracketState, PlayoffBracket } from '@/utils/playoffs/playoffTypes';

/**
 * Computes the current state of a bracket based on its matches
 *
 * @param bracket The playoff bracket to analyze
 * @returns The computed bracket state
 */
export function computeBracketState(bracket: PlayoffBracket): BracketState {
  if (!bracket || !bracket.matches || bracket.matches.length === 0) {
    return BRACKET_STATES.PENDING;
  }

  // Get all matches that have teams assigned (i.e., are ready to be played)
  const activeMatches = bracket.matches.filter((match) => match.team1Id && match.team2Id);

  // No active matches means pending
  if (activeMatches.length === 0) {
    return BRACKET_STATES.PENDING;
  }

  // Check if all matches are completed

  // For a completed bracket, the finals must be played and have a winner
  const finalsMatches = bracket.matches.filter((match) => match.matchType === 'finals');

  // In double elimination, we need to check whether the bracket reset happened
  if (bracket.format === BRACKET_FORMATS.DOUBLE) {
    // Get the championship match (finals round 1)
    const championshipMatch = finalsMatches.find((m) => m.round === 1);

    // Get the potential reset match (finals round > 1)
    const resetMatch = finalsMatches.find((m) => m.round > 1);

    // If the championship match is complete
    if (championshipMatch && championshipMatch.winnerId) {
      // If it was won by the winners bracket champion, bracket is complete
      const winnerFromWinnersBracket = bracket.matches.find(
        (m) => m.matchType === 'winners' && m.winnerId && !m.nextWinMatchId
      );

      if (
        winnerFromWinnersBracket &&
        championshipMatch.winnerId === winnerFromWinnersBracket.winnerId
      ) {
        return BRACKET_STATES.COMPLETED;
      }

      // If there's a reset match and it's complete, bracket is complete
      if (resetMatch && resetMatch.winnerId) {
        return BRACKET_STATES.COMPLETED;
      }

      // If championship match complete but won by losers bracket champion, and no reset match yet, in progress
      return BRACKET_STATES.IN_PROGRESS;
    }
  } else {
    // For single elimination, if the finals match is complete, bracket is complete
    const finalsMatch = finalsMatches.find((m) => m.round === 1);
    if (finalsMatch && finalsMatch.winnerId) {
      return BRACKET_STATES.COMPLETED;
    }
  }

  // If any matches are complete but not all, bracket is in progress
  const anyMatchComplete = activeMatches.some((match) => !!match.winnerId);
  if (anyMatchComplete) {
    return BRACKET_STATES.IN_PROGRESS;
  }

  // Default to pending if no other condition is met
  return BRACKET_STATES.PENDING;
}
