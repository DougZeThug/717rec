
import { Team } from "@/types";
import { BracketMatch, PlayInResult, PlayoffMatch, SeedTeam } from "../types";
import { TeamSeeding } from "../utils/TeamSeeding";
import { BracketSizeCalculator } from "../utils/BracketSizeCalculator";
import { PlayInGenerator } from "../utils/PlayInGenerator";

/**
 * Base abstract class for bracket generators
 */
export abstract class BaseBracketGenerator {
  protected bracketId: string;
  protected teams: SeedTeam[];
  protected bracketSize: number;
  
  constructor(bracketId: string, teams: Team[]) {
    this.bracketId = bracketId;
    this.teams = TeamSeeding.prepareTeams(teams);
    this.bracketSize = BracketSizeCalculator.calculateBracketSize(this.teams.length);
  }
  
  /**
   * Handle play-in matches if necessary
   * @returns Object containing play-in matches and teams that advance to the main bracket
   */
  protected handlePlayInMatches(): PlayInResult {
    if (this.teams.length <= this.bracketSize) {
      return { playInMatches: [], advancingTeams: this.teams };
    }
    
    return PlayInGenerator.createPlayInMatches(
      this.teams,
      this.bracketSize,
      this.bracketId
    );
  }
  
  /**
   * Generate the bracket
   * @returns Array of matches for the bracket
   */
  abstract generate(): BracketMatch[] | PlayoffMatch[];
}
