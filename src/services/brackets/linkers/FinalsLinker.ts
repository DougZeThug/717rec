
import { nanoid } from "nanoid";
import { BracketMatch } from "../types";

/**
 * Responsible for generating and linking the finals match
 */
export class FinalsLinker {
  private bracketId: string;
  private matchMap: Record<string, BracketMatch>;
  
  constructor(
    bracketId: string,
    matchMap: Record<string, BracketMatch>
  ) {
    this.bracketId = bracketId;
    this.matchMap = matchMap;
  }
  
  /**
   * Generate the finals match
   */
  generateFinals(): void {
    const finalsMatch: BracketMatch = {
      id: nanoid(),
      round: 1,
      position: 1,
      matchType: "finals",
      team1Id: null, // Winner of winners bracket
      team2Id: null, // Winner of losers bracket
      team1Seed: null,
      team2Seed: null,
      nextWinMatchId: null,
      nextLoseMatchId: null,
      winnerId: null,
      bracket_id: this.bracketId
    };
    
    this.matchMap['finals-1'] = finalsMatch;
  }
}
