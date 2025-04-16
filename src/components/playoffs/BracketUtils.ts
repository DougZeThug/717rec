
import type { PlayoffMatch } from "@/types";

// Function to get the next match based on current match's winner
export const getNextMatch = (match: PlayoffMatch, allMatches: PlayoffMatch[]): PlayoffMatch | null => {
  // In a real implementation, we would use the next_match_id from the database
  // For now, we'll find it based on rounds
  if (!match.winnerId) return null;
  
  // For each match in higher rounds, check if it could be the next match
  for (const nextRoundMatch of allMatches.filter(m => m.round > match.round)) {
    // If this match is from winners bracket and the next match is for winners
    if (match.matchType === "Winners" && nextRoundMatch.matchType === "Winners") {
      // Check if this match feeds into that one (simplified logic)
      if (nextRoundMatch.team1Id === null || nextRoundMatch.team2Id === null) {
        return nextRoundMatch;
      }
    }
    
    // For losers bracket, similar logic would apply
    // This is simplified, a real implementation would use the next_match_id from the database
  }
  
  return null;
};

// Function to calculate vertical spacing for teams
export const getVerticalSpacing = (roundIndex: number): number => {
  // Exponential spacing based on round
  // First round: 12, second: 24, third: 48, etc.
  return Math.pow(2, roundIndex) * 12;
};
