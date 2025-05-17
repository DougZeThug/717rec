
import { PlayoffGame } from "../types";
import { BracketRepository } from "./BracketRepository";
import { PlayoffGamesRepository } from "./PlayoffGamesRepository";
import { PlayoffMatchesRepository } from "./PlayoffMatchesRepository";
import { ResetMatchService } from "./ResetMatchService";
import { TeamAdvancementService } from "./TeamAdvancementService";
import { DatabaseOperationError, MatchResultDTO, DatabaseMatchResult } from "./types";

/**
 * Service for handling match results and advancing teams
 */
export class MatchResultService {
  private matchesRepository: PlayoffMatchesRepository;
  private gamesRepository: PlayoffGamesRepository;
  private bracketRepository: BracketRepository;
  private teamAdvancementService: TeamAdvancementService;
  private resetMatchService: ResetMatchService;

  constructor() {
    this.matchesRepository = new PlayoffMatchesRepository();
    this.gamesRepository = new PlayoffGamesRepository();
    this.bracketRepository = new BracketRepository();
    this.teamAdvancementService = new TeamAdvancementService();
    this.resetMatchService = new ResetMatchService();
  }

  /**
   * Record match result and advance teams in bracket
   */
  async recordMatchResult(matchResult: DatabaseMatchResult): Promise<void> {
    try {
      // First, get the match details to determine bracket flow
      const match = await this.matchesRepository.getMatchById(matchResult.match_id);
      if (!match) {
        throw new DatabaseOperationError('recordMatchResult', `Match not found: ${matchResult.match_id}`);
      }
      
      // 1. Update the current match with the result
      const resultDTO: MatchResultDTO = {
        winnerId: matchResult.winner_id,
        loserId: matchResult.loser_id,
        team1Score: matchResult.team1_score,
        team2Score: matchResult.team2_score,
        team1GameWins: matchResult.team1_game_wins,
        team2GameWins: matchResult.team2_game_wins,
        games: matchResult.games
      };
      
      await this.matchesRepository.updateMatchResult(match.id, resultDTO);
      
      // 2. Save individual game results if they exist
      if (matchResult.games && Array.isArray(matchResult.games) && matchResult.games.length > 0) {
        await this.gamesRepository.saveGames(matchResult.games);
      }
      
      // 3. Handle winners bracket champion
      if (match.match_type === 'winners' && !match.next_win_match_id) {
        // This is the winners bracket final
        await this.bracketRepository.markWinnersBracketChampion(match.bracket_id, matchResult.winner_id);
      }

      // 4. Handle special case for grand finals first match (GF1)
      if (match.match_type === 'finals' && match.round === 1) {
        await this.handleGrandFinalsResult(match.bracket_id, matchResult);
      } 
      // 5. Handle special case for grand finals reset match (GF2)
      else if (match.match_type === 'finals' && match.round === 2) {
        // This is the reset match, winner is tournament champion
        await this.bracketRepository.markTournamentComplete(match.bracket_id, matchResult.winner_id);
      }
      // 6. Standard bracket advancement 
      else {
        // Advance winning team to next round if applicable
        if (match.next_win_match_id) {
          await this.teamAdvancementService.advanceTeam(match.next_win_match_id, matchResult.winner_id, true);
        }
        
        // Send loser to losers bracket if applicable
        if (match.match_type === 'winners' && match.next_lose_match_id) {
          await this.teamAdvancementService.advanceTeam(match.next_lose_match_id, matchResult.loser_id, false);
        }
      }
    } catch (error) {
      console.error('Error recording match result:', error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('recordMatchResult', `Failed to record result for match ${matchResult.match_id}`, error as Error);
    }
  }

  /**
   * Handle the result of the first grand finals match
   */
  private async handleGrandFinalsResult(bracketId: string, matchResult: DatabaseMatchResult): Promise<void> {
    const bracketState = await this.bracketRepository.getBracketState(bracketId);
    
    const { winner_id, loser_id } = matchResult;
    const isWinnerFromLosersBracket = winner_id === bracketState.losersBracketChampionId;
    
    if (isWinnerFromLosersBracket) {
      // Losers bracket champion won, need reset match
      await this.bracketRepository.setResetMatchNeeded(bracketId, true);
      
      // Create the reset match (GF2)
      if (bracketState.losersBracketChampionId && bracketState.winnersBracketChampionId) {
        await this.resetMatchService.createResetMatch(
          bracketId,
          bracketState.losersBracketChampionId, // GF1 winner goes to team1
          bracketState.winnersBracketChampionId, // GF1 loser goes to team2
          "finals" // Match type for reset match
        );
      }
    } else {
      // Winner's bracket champion won again, tournament complete
      await this.bracketRepository.markTournamentComplete(bracketId, winner_id);
    }
  }
}
