
import { nanoid } from "nanoid";
import { BracketMatch, SeedTeam } from "./types";
import { BracketSizeCalculator } from "./BracketSizeCalculator";

/**
 * Handles generation of the winners bracket portion of a tournament
 */
export class WinnersBracketGenerator {
  /**
   * Generate the winners bracket portion
   * @param bracketId ID of the bracket
   * @param teams Array of teams in the bracket
   * @param matchMap Storage for match references by position
   * @returns Array of winners bracket matches
   */
  static generateWinnersBracket(
    bracketId: string,
    teams: SeedTeam[],
    matchMap: Record<string, BracketMatch>
  ): BracketMatch[] {
    const matches: BracketMatch[] = [];
    const numRounds = Math.log2(BracketSizeCalculator.calculateBracketSize(teams.length));
    
    // First round teams
    const firstRoundTeams = [...teams];
    
    // Create all rounds in the winners bracket
    for (let round = 1; round <= numRounds; round++) {
      const matchesInRound = Math.pow(2, numRounds - round);
      
      for (let position = 1; position <= matchesInRound; position++) {
        const match: BracketMatch = {
          id: nanoid(),
          round,
          position,
          matchType: "winners",
          team1Id: null,
          team2Id: null,
          team1Seed: null,
          team2Seed: null,
          nextWinMatchId: null,
          nextLoseMatchId: null,
          winnerId: null,
          bracket_id: bracketId
        };
        
        // Set first round teams based on seeding
        if (round === 1) {
          const teamIndex = (position - 1) * 2;
          if (teamIndex < firstRoundTeams.length) {
            match.team1Id = firstRoundTeams[teamIndex].id;
            match.team1Seed = firstRoundTeams[teamIndex].seed;
          }
          
          if (teamIndex + 1 < firstRoundTeams.length) {
            match.team2Id = firstRoundTeams[teamIndex + 1].id;
            match.team2Seed = firstRoundTeams[teamIndex + 1].seed;
          }
        }
        
        matches.push(match);
        
        // Store match in map for linking
        const key = `winners-${round}-${position}`;
        matchMap[key] = match;
        
        // Link winners to next round
        if (round < numRounds) {
          const nextPosition = Math.ceil(position / 2);
          const nextKey = `winners-${round+1}-${nextPosition}`;
          match.nextWinMatchId = matchMap[nextKey]?.id || null;
        }
        
        // Link losers to losers bracket (except finals)
        if (round < numRounds) {
          const loserRound = round;
          const loserPosition = position;
          const loserKey = `losers-${loserRound}-${loserPosition}`;
          match.nextLoseMatchId = matchMap[loserKey]?.id || null;
        }
      }
    }
    
    return matches;
  }
}
