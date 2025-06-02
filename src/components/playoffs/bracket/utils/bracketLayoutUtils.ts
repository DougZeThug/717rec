
import { PlayoffMatch } from "@/types";

/**
 * Function to calculate vertical spacing based on round index
 */
export const getVerticalSpacing = (roundIndex: number): number => {
  // We want less space in later rounds
  if (roundIndex >= 3) return 2;
  if (roundIndex >= 2) return 3;
  return 4;
};

/**
 * Function to find the next match for a given match
 */
export const getNextMatch = (
  match: PlayoffMatch,
  winners: PlayoffMatch[][],
  losers: PlayoffMatch[][],
  finals: PlayoffMatch[]
): PlayoffMatch | null => {
  // 1️⃣ If this match feeds into the losers bracket, resolve that first.
  if (match.nextLoseMatchId) {
    for (const round of losers) {
      const target = round.find(m => m.id === match.nextLoseMatchId);
      if (target) return target;
    }
  }

  // First check in winners bracket
  for (const round of winners) {
    const nextMatch = round.find(m => m.id === match.nextWinMatchId);
    if (nextMatch) return nextMatch;
  }
  
  // Then check in losers bracket
  for (const round of losers) {
    const nextMatch = round.find(m => m.id === match.nextWinMatchId);
    if (nextMatch) return nextMatch;
  }
  
  // Finally check in finals
  return finals.find(m => m.id === match.nextWinMatchId) || null;
};
