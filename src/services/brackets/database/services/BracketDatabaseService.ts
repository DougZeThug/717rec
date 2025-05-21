import { supabase } from "@/integrations/supabase/client";
import { PlayoffGame } from "../../types";
import { MatchRepository } from "../repositories/MatchRepository";
import { GameRepository } from "../repositories/GameRepository";
import { BracketRepository } from "../repositories/BracketRepository";
import { BracketCreationParams, DatabaseBracketState, DatabaseMatchResult, DatabasePlayoffMatch, PlayoffMatch } from "../types/DatabaseTypes";
import { nanoid } from "nanoid";

/**
 * Service that provides a unified interface for bracket database operations
 */
export class BracketDatabaseService {
  private matchRepository: MatchRepository;
  private gameRepository: GameRepository;
  private bracketRepository: BracketRepository;
  
  constructor() {
    this.matchRepository = new MatchRepository();
    this.gameRepository = new GameRepository();
    this.bracketRepository = new BracketRepository();
  }
  
  /**
   * Convert application match model to database model
   */
  private convertToDbMatch(match: PlayoffMatch): DatabasePlayoffMatch {
    return {
      id: match.id,
      bracket_id: match.bracket_id || '',
      round: match.round,
      position: match.position,
      match_type: match.matchType,
      team1_id: match.team1Id,
      team2_id: match.team2Id,
      team1_score: match.team1Score || null,
      team2_score: match.team2Score || null,
      team1_seed: match.team1Seed || null,
      team2_seed: match.team2Seed || null,
      team1_game_wins: match.team1GameWins || null,
      team2_game_wins: match.team2GameWins || null,
      winner_id: match.winnerId || null,
      loser_id: match.loserId || null,
      next_win_match_id: match.nextWinMatchId || null,
      next_lose_match_id: match.nextLoseMatchId || null,
      best_of: match.bestOf || 3,
      status: match.status || 'pending'
    };
  }
  
  /**
   * Convert database match model to application model
   */
  private convertToAppMatch(dbMatch: DatabasePlayoffMatch): PlayoffMatch {
    return {
      id: dbMatch.id,
      bracket_id: dbMatch.bracket_id,
      round: dbMatch.round,
      position: dbMatch.position,
      matchType: dbMatch.match_type,
      team1Id: dbMatch.team1_id,
      team2Id: dbMatch.team2_id,
      team1Score: dbMatch.team1_score,
      team2Score: dbMatch.team2_score,
      team1Seed: dbMatch.team1_seed,
      team2Seed: dbMatch.team2_seed,
      team1GameWins: dbMatch.team1_game_wins,
      team2GameWins: dbMatch.team2_game_wins,
      winnerId: dbMatch.winner_id,
      loserId: dbMatch.loser_id,
      nextWinMatchId: dbMatch.next_win_match_id,
      nextLoseMatchId: dbMatch.next_lose_match_id,
      bestOf: dbMatch.best_of,
      status: dbMatch.status
    };
  }
  
  /**
   * Create a new bracket in the database
   */
  async createBracket(params: BracketCreationParams): Promise<{ error?: Error }> {
    return this.bracketRepository.createBracket(params);
  }
  
  /**
   * Save playoff matches to the database
   */
  async savePlayoffMatches(matches: PlayoffMatch[]): Promise<number> {
    if (!matches || matches.length === 0) return 0;
    
    const dbMatches = matches.map(match => this.convertToDbMatch(match));
    await this.matchRepository.saveMatches(dbMatches);
    return matches.length;
  }
  
  /**
   * Get all matches for a bracket
   */
  async getBracketMatches(bracketId: string): Promise<PlayoffMatch[]> {
    const dbMatches = await this.matchRepository.getBracketMatches(bracketId);
    return dbMatches.map(dbMatch => this.convertToAppMatch(dbMatch));
  }
  
  /**
   * Save playoff games to the database
   */
  async savePlayoffGames(games: PlayoffGame[]): Promise<number> {
    if (!games || games.length === 0) return 0;
    
    await this.gameRepository.saveGames(games);
    return games.length;
  }
  
  /**
   * Get games for a match
   */
  async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    return this.gameRepository.getMatchGames(matchId);
  }
  
  /**
   * Record a match result
   */
  async recordMatchResult(result: DatabaseMatchResult): Promise<void> {
    const { match_id, winner_id, loser_id, team1_score, team2_score, team1_game_wins, team2_game_wins, games } = result;
    
    // Update the match with the result
    await this.matchRepository.updateMatchResult(match_id, {
      winnerId: winner_id,
      loserId: loser_id,
      team1Score: team1_score,
      team2Score: team2_score,
      team1GameWins: team1_game_wins,
      team2GameWins: team2_game_wins,
      games
    });
    
    // If there are games associated with this result, save them too
    if (games && games.length > 0) {
      const gamesWithMatchId = games.map(game => ({
        ...game,
        matchId: match_id,
        id: game.id || nanoid()
      }));
      
      await this.savePlayoffGames(gamesWithMatchId);
    }
  }
  
  /**
   * Advance a team to the next match
   */
  async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    try {
      // Get the match to update
      const match = await this.matchRepository.getMatchById(nextMatchId);
      
      if (!match) {
        console.error(`Match ${nextMatchId} not found for advancement`);
        return;
      }
      
      // For simplicity, always assign to team1 if empty, otherwise team2
      const updatedMatch: DatabasePlayoffMatch = {
        ...match,
        team1_id: match.team1_id || teamId,
        team2_id: match.team1_id ? teamId : match.team2_id
      };
      
      await this.matchRepository.saveMatches([updatedMatch]);
    } catch (error) {
      console.error('Error advancing team:', error);
      throw error;
    }
  }
  
  /**
   * Mark a team as the winners bracket champion
   */
  async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    return this.bracketRepository.markWinnersBracketChampion(bracketId, teamId);
  }
  
  /**
   * Set whether a reset match is needed
   */
  async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    return this.bracketRepository.setResetMatchNeeded(bracketId, needed);
  }
  
  /**
   * Mark a tournament as complete
   */
  async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    return this.bracketRepository.markTournamentComplete(bracketId, championId);
  }
  
  /**
   * Get the current state of a bracket
   */
  async getBracketState(bracketId: string): Promise<DatabaseBracketState> {
    return this.bracketRepository.getBracketState(bracketId);
  }
  
  /**
   * Create a participant in the database
   */
  async createParticipant(participant: {
    id: string;
    tournament_id: string;
    name: string;
    position?: number;
    seeding?: number;
  }): Promise<string> {
    try {
      const { error } = await supabase
        .from('participants')
        .insert({
          team_id: participant.id,
          bracket_id: participant.tournament_id,
          name: participant.name,
          position: participant.position || 0,
          seeding: participant.seeding
        });
      
      if (error) throw new Error(`Failed to create participant: ${error.message}`);
      
      return participant.id;
    } catch (error) {
      console.error('Error creating participant:', error);
      throw error;
    }
  }
  
  /**
   * Select participants from the database
   */
  async selectParticipants(filters?: {
    tournament_id?: string;
    name?: string;
  }): Promise<Array<{
    id: string;
    name: string;
    tournament_id: string;
    position?: number;
    seeding?: number;
  }>> {
    try {
      let query = supabase
        .from('participants')
        .select('team_id, name, bracket_id, position, seeding');
      
      if (filters?.tournament_id) {
        query = query.eq('bracket_id', filters.tournament_id);
      }
      
      if (filters?.name) {
        query = query.ilike('name', `%${filters.name}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw new Error(`Failed to select participants: ${error.message}`);
      
      return (data || []).map(p => ({
        id: p.team_id,
        name: p.name || '',
        tournament_id: p.bracket_id,
        position: p.position,
        seeding: p.seeding
      }));
    } catch (error) {
      console.error('Error selecting participants:', error);
      return [];
    }
  }
  
  /**
   * Create a reset match for grand finals
   */
  async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<PlayoffMatch> {
    const resetMatch: PlayoffMatch = {
      id: nanoid(),
      bracket_id: bracketId,
      round: 0, // Special round for reset match
      position: 0, // Special position for reset match
      matchType: 'finals',
      team1Id,
      team2Id,
      bestOf: 3,
      status: 'pending'
    };
    
    await this.savePlayoffMatches([resetMatch]);
    return resetMatch;
  }
}
