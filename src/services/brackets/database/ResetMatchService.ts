
import { nanoid } from "nanoid";
import { PlayoffMatch, PlayoffMatchType } from "../types";
import { PlayoffMatchesRepository } from "./PlayoffMatchesRepository";
import { DatabasePlayoffMatch } from "./types";

/**
 * Service responsible for handling reset match creation and management
 */
export class ResetMatchService {
  private matchesRepository: PlayoffMatchesRepository;

  constructor() {
    this.matchesRepository = new PlayoffMatchesRepository();
  }

  /**
   * Create a reset match for the grand finals
   * @param bracketId ID of the bracket
   * @param team1Id ID of the first team (losers bracket champion)
   * @param team2Id ID of the second team (winners bracket champion)
   * @returns Newly created reset match
   */
  async createResetMatch(
    bracketId: string,
    team1Id: string,
    team2Id: string
  ): Promise<PlayoffMatch> {
    // Create database-compatible reset match
    const resetMatch: DatabasePlayoffMatch = {
      id: nanoid(),
      bracket_id: bracketId,
      round: 2, // Second round of finals is the reset match
      position: 1,
      match_type: "finals" as PlayoffMatchType, // Use the database field naming
      team1_id: team1Id,
      team2_id: team2Id,
      team1_seed: null, // Usually not relevant for reset match
      team2_seed: null,
      team1_score: null,
      team2_score: null,
      team1_game_wins: null,
      team2_game_wins: null,
      best_of: 3, // Default value, can be changed
      winner_id: null,
      loser_id: null,
      next_win_match_id: null, // No next match for reset
      next_lose_match_id: null,
      status: "pending" // Using valid string literal type
    };

    // Save the reset match to the database
    await this.matchesRepository.saveMatches([resetMatch]);

    // Convert back to application model before returning
    return {
      id: resetMatch.id,
      bracket_id: resetMatch.bracket_id,
      round: resetMatch.round,
      position: resetMatch.position,
      matchType: resetMatch.match_type,
      team1Id: resetMatch.team1_id,
      team2Id: resetMatch.team2_id,
      team1Score: resetMatch.team1_score,
      team2Score: resetMatch.team2_score,
      team1GameWins: resetMatch.team1_game_wins,
      team2GameWins: resetMatch.team2_game_wins,
      team1Seed: resetMatch.team1_seed,
      team2Seed: resetMatch.team2_seed,
      bestOf: resetMatch.best_of,
      winnerId: resetMatch.winner_id,
      loserId: resetMatch.loser_id,
      nextWinMatchId: resetMatch.next_win_match_id,
      nextLoseMatchId: resetMatch.next_lose_match_id,
      status: resetMatch.status
    };
  }
}
