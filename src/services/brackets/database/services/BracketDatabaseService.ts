import { PlayoffMatch, PlayoffGame } from "@/types/playoffs";
import { supabase } from "@/integrations/supabase/client";
import { MatchResultDTO, DatabaseBracketState } from "../types/DatabaseTypes";
import { PlayoffMatchesRepository } from "../PlayoffMatchesRepository";
import { toRuntime } from "../mappers/MatchMapper";

// Import the repositories
import { MatchRepository } from "../repositories/MatchRepository";
import { GameRepository } from "../repositories/GameRepository";
import { BracketRepository } from "../repositories/BracketRepository";

/**
 * Service for database operations related to brackets
 */
export class BracketDatabaseService {
  private matchRepository: MatchRepository;
  private gameRepository: GameRepository;
  private bracketRepository: BracketRepository;
  
  constructor() {
    this.matchRepository = new PlayoffMatchesRepository();
    this.gameRepository = new GameRepository();
    this.bracketRepository = new BracketRepository();
  }

  /**
   * Save multiple playoff matches to the database
   */
  async savePlayoffMatches(matches: PlayoffMatch[]): Promise<void> {
    try {
      if (!matches || matches.length === 0) return;
      
      const matchesForDb = matches.map(match => ({
        id: match.id,
        bracket_id: match.bracket_id,
        round: match.round,
        position: match.position,
        match_type: match.matchType,
        team1_id: match.team1Id,
        team2_id: match.team2Id,
        team1_score: match.team1Score,
        team2_score: match.team2Score,
        team1_game_wins: match.team1GameWins || 0,
        team2_game_wins: match.team2GameWins || 0,
        team1_seed: match.team1Seed,
        team2_seed: match.team2Seed,
        winner_id: match.winnerId,
        loser_id: match.loserId,
        next_win_match_id: match.nextWinMatchId,
        next_lose_match_id: match.nextLoseMatchId,
        best_of: match.bestOf || 3,
        status: match.status || 'pending'
      }));
      
      const { error } = await supabase.from('playoff_matches').insert(matchesForDb);
      if (error) throw error;
    } catch (error) {
      console.error('Error saving playoff matches:', error);
      throw error;
    }
  }

  /**
   * Get all matches for a bracket
   */
  async getBracketMatches(bracketId: string): Promise<PlayoffMatch[]> {
    try {
      const { data, error } = await supabase
        .from('playoff_matches')
        .select('*')
        .eq('bracket_id', bracketId);
      
      if (error) throw error;
      
      return data.map(match => toRuntime({
        id: match.id,
        bracket_id: match.bracket_id,
        round: match.round,
        position: match.position,
        match_type: match.match_type,
        team1_id: match.team1_id,
        team2_id: match.team2_id,
        team1_score: match.team1_score,
        team2_score: match.team2_score,
        team1_game_wins: match.team1_game_wins || 0,
        team2_game_wins: match.team2_game_wins || 0,
        team1_seed: match.team1_seed,
        team2_seed: match.team2_seed,
        winner_id: match.winner_id,
        loser_id: match.loser_id,
        next_win_match_id: match.next_win_match_id,
        next_lose_match_id: match.next_lose_match_id,
        best_of: match.best_of || 3,
        status: match.status || 'pending'
      }));
    } catch (error) {
      console.error('Error getting bracket matches:', error);
      return [];
    }
  }

  /**
   * Create a new bracket in the database
   */
  async createBracket(params: {
    id: string;
    name: string;
    format: string;
    divisionId?: string;
  }): Promise<{ error?: Error }> {
    try {
      const { error } = await supabase
        .from('brackets')
        .insert({
          id: params.id,
          title: params.name,
          format: params.format,
          division_id: params.divisionId
        });
      
      if (error) return { error: new Error(error.message) };
      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Save playoff games to the database
   */
  async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    try {
      if (!games || games.length === 0) return;
      
      const gamesForDb = games.map(game => ({
        id: game.id,
        match_id: game.matchId,
        game_number: game.gameNumber,
        team1_score: game.team1Score,
        team2_score: game.team2Score,
        winner_id: game.winnerId
      }));
      
      const { error } = await supabase.from('playoff_games').insert(gamesForDb);
      if (error) throw error;
    } catch (error) {
      console.error('Error saving playoff games:', error);
      throw error;
    }
  }

  /**
   * Record match result
   */
  async recordMatchResult(result: MatchResultDTO): Promise<void> {
    try {
      // Update the match with the result
      const { error } = await supabase
        .from('playoff_matches')
        .update({
          winner_id: result.winnerId,
          loser_id: result.loserId,
          team1_score: result.team1Score,
          team2_score: result.team2Score,
          team1_game_wins: result.team1GameWins || 0,
          team2_game_wins: result.team2GameWins || 0,
          status: 'completed'
        })
        .eq('id', result.matchId);
      
      if (error) throw error;
      
      // Save games if provided
      if (result.games && result.games.length > 0) {
        await this.savePlayoffGames(result.games);
      }
    } catch (error) {
      console.error('Error recording match result:', error);
      throw error;
    }
  }

  /**
   * Get games for a match
   */
  async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    try {
      const { data, error } = await supabase
        .from('playoff_games')
        .select('*')
        .eq('match_id', matchId)
        .order('game_number', { ascending: true });
      
      if (error) throw error;
      
      return data.map(game => ({
        id: game.id,
        matchId: game.match_id,
        gameNumber: game.game_number,
        team1Score: game.team1_score,
        team2Score: game.team2_score,
        winnerId: game.winner_id
      }));
    } catch (error) {
      console.error('Error getting match games:', error);
      return [];
    }
  }

  /**
   * Get bracket state information
   */
  async getBracketState(bracketId: string): Promise<DatabaseBracketState> {
    try {
      const { data, error } = await supabase
        .from('brackets')
        .select('*')
        .eq('id', bracketId)
        .single();
      
      if (error) throw error;
      
      return {
        isWinnersBracketComplete: !!data.wb_champion_id,
        isLosersBracketComplete: false,
        isResetMatchNeeded: data.reset_match_needed || false,
        isComplete: data.state === 'completed',
        winnersBracketChampionId: data.wb_champion_id,
        losersBracketChampionId: null,
        championId: data.state === 'completed' ? data.wb_champion_id : null
      };
    } catch (error) {
      console.error('Error getting bracket state:', error);
      return {
        isWinnersBracketComplete: false,
        isLosersBracketComplete: false,
        isResetMatchNeeded: false,
        isComplete: false,
        winnersBracketChampionId: null,
        losersBracketChampionId: null,
        championId: null
      };
    }
  }

  /**
   * Create a reset match for a double elimination bracket
   */
  async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<PlayoffMatch> {
    try {
      const matchData = {
        bracket_id: bracketId,
        round: 1000, // A high number to indicate it's the final reset match
        position: 1,
        match_type: 'finals' as PlayoffMatchType,
        team1_id: team1Id,
        team2_id: team2Id,
        best_of: 3,
        status: 'pending'
      };
      
      const { data, error } = await supabase
        .from('playoff_matches')
        .insert(matchData)
        .select()
        .single();
      
      if (error) throw error;
      
      return toRuntime(data);
    } catch (error) {
      console.error('Error creating reset match:', error);
      throw error;
    }
  }

  /**
   * Select participants based on filters
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
      let query = supabase.from('participants').select('*');
      
      if (filters?.tournament_id) {
        query = query.eq('tournament_id', filters.tournament_id);
      }
      if (filters?.name) {
        query = query.eq('name', filters.name);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error selecting participants:', error);
        return [];
      }
      
      return data.map(participant => ({
        id: participant.id,
        name: participant.name,
        tournament_id: participant.tournament_id,
        position: participant.position,
        seeding: participant.seeding
      }));
    } catch (error) {
      console.error('Error selecting participants:', error);
      return [];
    }
  }

  /**
   * Create a participant
   */
  async createParticipant(participant: {
    id: string;
    tournament_id: string;
    name: string;
    position?: number;
    seeding?: number;
  }): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .insert([participant])
        .select('id')
        .single();
      
      if (error) {
        console.error('Error creating participant:', error);
        throw error;
      }
      
      return data.id;
    } catch (error) {
      console.error('Error creating participant:', error);
      throw error;
    }
  }

  /**
   * Advance team to the next match
   */
  async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('playoff_matches')
        .update({
          [isWinner ? 'team1_id' : 'team2_id']: teamId
        })
        .eq('id', nextMatchId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error advancing team:', error);
      throw error;
    }
  }

  /**
   * Mark winners bracket champion
   */
  async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({ wb_champion_id: teamId })
        .eq('id', bracketId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking winners bracket champion:', error);
      throw error;
    }
  }

  /**
   * Set reset match needed
   */
  async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({ reset_match_needed: needed })
        .eq('id', bracketId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error setting reset match needed:', error);
      throw error;
    }
  }

  /**
   * Mark tournament complete
   */
  async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({
          state: 'completed',
          wb_champion_id: championId
        })
        .eq('id', bracketId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking tournament complete:', error);
      throw error;
    }
  }
}
