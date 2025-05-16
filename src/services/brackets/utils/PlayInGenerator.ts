
import { nanoid } from "nanoid";
import { BracketMatch, PlayInResult, SeedTeam } from "../types";
import { BracketSizeCalculator } from "./BracketSizeCalculator";

/**
 * Handles generation of play-in matches when the number of teams
 * is not a power of 2
 */
export class PlayInGenerator {
  /**
   * Create play-in matches for the lowest seeds when teamCount is not a power of 2
   * @param teams Array of teams to create play-in matches for
   * @param targetSize Target bracket size (power of 2)
   * @param bracketId ID of the bracket these matches belong to
   * @returns Object containing play-in matches and advancing teams
   */
  static createPlayInMatches(
    teams: SeedTeam[], 
    targetSize: number,
    bracketId: string
  ): PlayInResult {
    const playInMatches: BracketMatch[] = [];
    const advancingTeams = [...teams];
    
    const numPlayInMatches = BracketSizeCalculator.calculatePlayInMatchCount(
      teams.length, 
      targetSize
    );
    
    if (numPlayInMatches <= 0) {
      return { playInMatches: [], advancingTeams };
    }
    
    // For play-in matches, we match highest remaining seed vs lowest remaining seed
    // 1 & 16, 8 & 9, etc. to get 8 teams advancing
    const playInTeams = advancingTeams.splice(-numPlayInMatches * 2);
    
    for (let i = 0; i < numPlayInMatches; i++) {
      const team1Index = i;
      const team2Index = (numPlayInMatches * 2) - i - 1;
      
      if (team1Index < playInTeams.length && team2Index < playInTeams.length) {
        const team1 = playInTeams[team1Index];
        const team2 = playInTeams[team2Index];
        
        playInMatches.push({
          id: nanoid(),
          round: 0, // Play-in round is 0
          position: i + 1,
          matchType: "play-in",
          team1Id: team1.id,
          team2Id: team2.id,
          team1Seed: team1.seed,
          team2Seed: team2.seed,
          nextWinMatchId: null, // Will be set later
          nextLoseMatchId: null, // No loser bracket for play-in
          winnerId: null,
          bracket_id: bracketId
        });
        
        // Add a placeholder for the winner
        advancingTeams.push({
          id: `play-in-${i+1}`, // Temporary ID that will be replaced with winner
          name: `Play-in ${i+1} Winner`,
          seed: Math.min(team1.seed, team2.seed), // Winner keeps the better seed
          imageUrl: undefined,
          logoUrl: undefined
        });
      }
    }
    
    return { playInMatches, advancingTeams };
  }
}
