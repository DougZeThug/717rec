
import { Team } from "@/types";
import { BaseBracketGenerator } from "./generators/BaseBracketGenerator";
import { SingleEliminationGenerator } from "./generators/SingleEliminationGenerator";
import { DoubleEliminationGenerator } from "./generators/DoubleEliminationGenerator";
import { PlayoffBracketGenerator } from "./generators/PlayoffBracketGenerator";

export type BracketType = 'single-elimination' | 'double-elimination' | 'playoff';

/**
 * Factory for creating appropriate bracket generators
 */
export class BracketFactory {
  /**
   * Create a generator for the specified bracket type
   * @param type Type of bracket to generate
   * @param bracketId ID of the bracket
   * @param teams Teams to include in the bracket
   * @returns Appropriate bracket generator
   */
  static createGenerator(type: BracketType, bracketId: string, teams: Team[]): BaseBracketGenerator {
    switch (type) {
      case 'single-elimination':
        return new SingleEliminationGenerator(bracketId, teams);
      case 'double-elimination':
        return new DoubleEliminationGenerator(bracketId, teams);
      case 'playoff':
        return new PlayoffBracketGenerator(bracketId, teams);
      default:
        throw new Error(`Unsupported bracket type: ${type}`);
    }
  }
}
