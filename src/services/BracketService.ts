
import { PlayoffBracket, PlayoffMatch, Team } from "@/types";
import { BracketFormat } from "@/constants/brackets";
import { BracketQueryService } from "./brackets/services/BracketQueryService";
import { BracketCreationService } from "./brackets/services/BracketCreationService";
import { BracketUpdateService } from "./brackets/services/BracketUpdateService";
import { BracketDeleteService } from "./brackets/services/BracketDeleteService";
import { MatchScoreService } from "./brackets/services/MatchScoreService";

/**
 * Service for bracket-related operations
 * This is a facade service that delegates to specialized services
 */
export class BracketService {
  /**
   * Create a new bracket
   */
  static async createBracket(
    name: string,
    format: BracketFormat,
    divisionId: string,
    teamIds: string[]
  ): Promise<string> {
    return BracketCreationService.createBracket(format, name, divisionId, teamIds);
  }

  /**
   * Delete a bracket and its matches
   */
  static async deleteBracket(bracketId: string): Promise<void> {
    return BracketDeleteService.deleteBracket(bracketId);
  }
  
  /**
   * Update a bracket's basic information
   */
  static async updateBracket(
    bracketId: string,
    updates: {
      name?: string;
      format?: BracketFormat;
      divisionId?: string;
    }
  ): Promise<void> {
    return BracketUpdateService.updateBracket(bracketId, updates);
  }

  /**
   * Update a match's score
   */
  static async updateMatchScore(
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ): Promise<void> {
    return MatchScoreService.updateMatchScore(
      matchId, team1Score, team2Score, games, team1GameWins, team2GameWins
    );
  }
  
  /**
   * Get bracket details including matches
   */
  static async getBracketDetails(bracketId: string): Promise<PlayoffBracket | null> {
    return BracketQueryService.getBracketDetails(bracketId);
  }
}
