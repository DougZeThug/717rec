
import { BracketMatch } from "./types";
import { StandardBracketLinker } from "./linkers/implementations/StandardBracketLinker";

/**
 * Handles linking of matches between different parts of a bracket
 * This class now serves as a facade for the more modular implementation
 */
export class BracketLinker extends StandardBracketLinker<BracketMatch> {
  /**
   * Create a new BracketLinker
   * @param bracketId The unique identifier for the bracket
   * @param matchMap Optional pre-existing map of matches
   */
  constructor(
    bracketId: string,
    matchMap: Record<string, BracketMatch> = {}
  ) {
    super(bracketId, matchMap);
  }
  
  /**
   * Connect different sections of the bracket
   * @param matches Array of all matches in the bracket
   */
  connectBrackets(matches: BracketMatch[]): void {
    // For backward compatibility with tests
    this.connectBracketSections(matches);
  }
}
