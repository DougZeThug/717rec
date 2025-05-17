
import { MatchResult } from "../types";
import { BracketRepository } from "./BracketRepository";
import { PlayoffGamesRepository } from "./PlayoffGamesRepository";
import { PlayoffMatchesRepository } from "./PlayoffMatchesRepository";
import { ResetMatchService } from "./ResetMatchService";
import { TeamAdvancementService } from "./TeamAdvancementService";
import { DatabaseOperationError, MatchResultDTO } from "./types";

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
  async recordMatchResult(matchResult: MatchResult): Promise<void> {
    try {
      // First, get the match details to determine bracket flow
      const match = await this.matchesRepository.getMatchById(matchResult.matchId);
      if (!match) {
        throw new DatabaseOperationError('recordMatchResult', `Match not found: ${matchResult.matchId}`);
      }
      
      // 1. Update the current match with the result
      const resultDTO: MatchResultDTO = {
        winnerId: matchResult.winnerId,
        loserId: matchResult.loserId,
        team1Score: matchResult.team1Score,
        team2Score: matchResult.team2Score
      };
      
      await this.matchesRepository.updateMatchResult(matchResult.matchId, resultDTO);
      
      // 2. Save individual game results
      if (matchResult.games && matchResult.games.length > 0) {
        await this.gamesRepository.saveGames(matchResult.games);
      }
      
      // 3. Handle winners bracket champion
      if (match.matchType === 'winners' && !match.nextWinMatchId) {
        // This is the winners bracket final
        await this.bracketRepository.markWinnersBracketChampion(match.bracket_id, matchResult.winnerId);
      }

      // 4. Handle special case for grand finals first match (GF1)
      if (match.matchType === 'finals' && match.round === 1) {
        await this.handleGrandFinalsResult(match.bracket_id, matchResult);
      } 
      // 5. Handle special case for grand finals reset match (GF2)
      else if (match.matchType === 'finals' && match.round === 2) {
        // This is the reset match, winner is tournament champion
        await this.bracketRepository.markTournamentComplete(match.bracket_id, matchResult.winnerId);
      }
      // 6. Standard bracket advancement 
      else {
        // Advance winning team to next round if applicable
        if (match.nextWinMatchId) {
          await this.teamAdvancementService.advanceTeam(match.nextWinMatchId, matchResult.winnerId, true);
        }
        
        // Send loser to losers bracket if applicable
        if (match.matchType === 'winners' && match.nextLoseMatchId) {
          await this.teamAdvancementService.advanceTeam(match.nextLoseMatchId, matchResult.loserId, false);
        }
      }
    } catch (error) {
      console.error('Error recording match result:', error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('recordMatchResult', `Failed to record result for match ${matchResult.matchId}`, error as Error);
    }
  }

  /**
   * Handle the result of the first grand finals match
   */
  private async handleGrandFinalsResult(bracketId: string, matchResult: MatchResult): Promise<void> {
    const bracketState = await this.bracketRepository.getBracketState(bracketId);
    
    const { winnerId, loserId } = matchResult;
    const isWinnerFromLosersBracket = winnerId === bracketState.losersBracketChampionId;
    
    if (isWinnerFromLosersBracket) {
      // Losers bracket champion won, need reset match
      await this.bracketRepository.setResetMatchNeeded(bracketId, true);
      
      // Create the reset match (GF2)
      if (bracketState.losersBracketChampionId && bracketState.winnersBracketChampionId) {
        await this.resetMatchService.createResetMatch(
          bracketId,
          bracketState.losersBracketChampionId, // GF1 winner goes to team1
          bracketState.winnersBracketChampionId  // GF1 loser goes to team2
        );
      }
    } else {
      // Winner's bracket champion won again, tournament complete
      await this.bracketRepository.markTournamentComplete(bracketId, winnerId);
    }
  }
}
