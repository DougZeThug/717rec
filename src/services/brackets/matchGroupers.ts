
import { PlayoffMatch } from "@/types";
import { BracketMatchesByType } from "./types";

/**
 * Groups matches by type (winners bracket, losers bracket, finals)
 * and organizes them by round for easy rendering
 */
export function groupBracketMatchesByType(bracket: { matches: PlayoffMatch[] }): BracketMatchesByType {
  // Start with empty arrays for each bracket section
  const winners: PlayoffMatch[][] = [];
  const losers: PlayoffMatch[][] = [];
  const finals: PlayoffMatch[] = [];
  
  // Process each match in the bracket
  bracket.matches.forEach(match => {
    // Determine which array to add to based on match type
    if (match.matchType === 'winners' || match.matchType === 'play-in' || match.matchType === 'play-in-2') {
      // Add match to winners bracket
      if (!winners[match.round - 1]) {
        winners[match.round - 1] = [];
      }
      winners[match.round - 1].push(match);
    } 
    else if (match.matchType === 'losers') {
      // Add match to losers bracket
      if (!losers[match.round - 1]) {
        losers[match.round - 1] = [];
      }
      losers[match.round - 1].push(match);
    }
    else if (match.matchType === 'finals') {
      // Add match to finals
      finals.push(match);
    }
  });
  
  return {
    winners,
    losers,
    finals
  };
}
