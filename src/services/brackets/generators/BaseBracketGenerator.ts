
import { Team } from "@/types";
import { BracketMatch, PlayoffMatch, SeedTeam } from "../types";
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
   * @returns Teams that advance to the main bracket
   */
  protected handlePlayInMatches(): SeedTeam[] {
    if (this.teams.length <= this.bracketSize) {
      return this.teams;
    }
    
    const playInResult = PlayInGenerator.createPlayInMatches(
      this.teams,
      this.bracketSize,
      this.bracketId
    );
    
    return playInResult.advancingTeams;
  }
  
  /**
   * Generate the bracket
   * @returns Array of matches for the bracket
   */
  abstract generate(): BracketMatch[] | PlayoffMatch[];
}
