
import { nanoid } from "nanoid";
import { PlayoffMatch, PlayoffMatchType } from "../types";
import { PlayoffMatchesRepository } from "./PlayoffMatchesRepository";

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
    const resetMatch: PlayoffMatch = {
      id: nanoid(),
      bracket_id: bracketId,
      round: 2, // Second round of finals is the reset match
      position: 1,
      matchType: "finals" as PlayoffMatchType,
      team1Id,
      team2Id,
      team1Seed: null, // Usually not relevant for reset match
      team2Seed: null,
      team1Score: null,
      team2Score: null,
      team1GameWins: null,
      team2GameWins: null,
      bestOf: 3, // Default value, can be changed
      winnerId: null,
      loserId: null,
      nextWinMatchId: null, // No next match for reset
      nextLoseMatchId: null,
      status: "pending"
    };

    // Save the reset match to the database
    await this.matchesRepository.saveMatches([resetMatch]); // Fixed: using saveMatches instead of saveMatch

    return resetMatch;
  }
}
