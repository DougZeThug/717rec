
import { PlayoffMatch, PlayoffBracket } from "@/types";
import { BracketMatchesByType } from "./types";

/**
 * Groups matches by round number into separate arrays
 * @param matches Array of matches to group
 * @returns Array of arrays, where each inner array contains matches from one round
 */
export const groupMatchesByRound = (matches: PlayoffMatch[]): PlayoffMatch[][] => {
  if (!matches || matches.length === 0) return [];
  
  const roundsMap: Record<number, PlayoffMatch[]> = {};
  
  // Group matches by round number
  matches.forEach(match => {
    if (!roundsMap[match.round]) {
      roundsMap[match.round] = [];
    }
    roundsMap[match.round].push(match);
  });
  
  // Sort rounds by number and then sort matches within each round by position
  return Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map(roundNum => 
      roundsMap[roundNum].sort((a, b) => a.position - b.position)
    );
};

/**
 * Organizes a playoff bracket's matches by type (winners, losers, finals)
 * @param bracket The playoff bracket containing all matches
 * @returns Object with winners, losers, and finals matches grouped appropriately
 */
export const groupBracketMatchesByType = (bracket: PlayoffBracket): BracketMatchesByType => {
  // Filter matches by type
  const winnersMatches = bracket.matches.filter(m => m.matchType === 'winners');
  const losersMatches = bracket.matches.filter(m => m.matchType === 'losers');
  const finalsMatches = bracket.matches.filter(m => m.matchType === 'finals');
  
  return {
    winners: groupMatchesByRound(winnersMatches),
    losers: groupMatchesByRound(losersMatches),
    finals: finalsMatches
  };
};
