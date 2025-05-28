
import { PlayoffMatch } from "@/types/playoffs";

/**
 * Handles linking of matches between different parts of a bracket
 * This class now serves as a wrapper for functionality provided by brackets-manager
 * @deprecated Use brackets-manager functionality directly
 */
export class BracketLinker {
  private bracketId: string;
  private matchMap: Record<string, PlayoffMatch>;

  /**
   * Create a new BracketLinker
   * @param bracketId The unique identifier for the bracket
   * @param matchMap Optional pre-existing map of matches
   */
  constructor(
    bracketId: string,
    matchMap: Record<string, PlayoffMatch> = {}
  ) {
    this.bracketId = bracketId;
    this.matchMap = matchMap;
  }
  
  /**
   * Connect different sections of the bracket
   * @param matches Array of all matches in the bracket
   * @deprecated Use brackets-manager functionality directly
   */
  connectBrackets(matches: PlayoffMatch[]): void {
    // This functionality is now handled by brackets-manager
    console.log("connectBrackets is deprecated - brackets-manager handles connections");
  }

  /**
   * @deprecated Use brackets-manager functionality directly
   */
  connectBracketSections(matches: PlayoffMatch[]): void {
    // This functionality is now handled by brackets-manager
    console.log("connectBracketSections is deprecated - brackets-manager handles connections");
  }
}
