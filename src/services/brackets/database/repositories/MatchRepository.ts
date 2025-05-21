
import { supabase } from "@/integrations/supabase/client";
import { PlayoffMatch } from "../../types";
import { BaseRepository } from "./BaseRepository";
import { DatabaseOperationError, DatabasePlayoffMatch, IMatchRepository } from "../types/DatabaseTypes";
import { nanoid } from "nanoid";

/**
 * Repository for match operations
 */
export class MatchRepository extends BaseRepository implements IMatchRepository {
  private static PLACEHOLDER_PREFIX = 'play-in-';

  /**
   * Save playoff matches to the database
   * @param matches Matches to save
   * @returns Number of matches saved
   */
  async saveMatches(matches: PlayoffMatch[]): Promise<number> {
    if (!matches || matches.length === 0) {
      console.log("No matches to save");
      return 0;
    }
    
    console.log(`Saving ${matches.length} playoff matches`);
    
    // Convert matches to database model
    const dbMatches = matches.map(match => {
      // Validate match ID
      if (!match.id) {
        console.error("Match is missing ID:", match);
        throw new Error("Match ID is required");
      }
      
      // Validate bracket_id
      if (!match.bracket_id || match.bracket_id === 'undefined') {
        console.error(`Match ${match.id} is missing bracket_id:`, match);
        throw new Error(`Match ${match.id} is missing bracket_id`);
      }
      
      return {
        id: match.id,
        bracket_id: match.bracket_id,
        round: match.round,
        position: match.position,
        match_type: match.matchType,
        // Replace placeholder IDs with null before saving to database
        team1_id: match.team1Id?.startsWith(this.PLACEHOLDER_PREFIX) ? null : (match.team1Id ?? null),
        team2_id: match.team2Id?.startsWith(this.PLACEHOLDER_PREFIX) ? null : (match.team2Id ?? null),
        team1_score: match.team1Score ?? null,
        team2_score: match.team2Score ?? null,
        team1_game_wins: match.team1GameWins ?? null,
        team2_game_wins: match.team2GameWins ?? null,
        team1_seed: match.team1Seed ?? null,
        team2_seed: match.team2Seed ?? null,
        winner_id: match.winnerId ?? null,
        loser_id: match.loserId ?? null,
        next_win_match_id: match.nextWinMatchId ?? null,
        next_lose_match_id: match.nextLoseMatchId ?? null,
        best_of: match.bestOf ?? 3,
        status: match.status ?? 'pending'
      };
    });

    return await this.executeOperation('saveMatches', () => 
      supabase.from('playoff_matches').insert(dbMatches)
    );
  }

  /**
   * Get bracket matches from the database
   * @param bracketId Bracket ID
   * @returns Array of database matches
   */
  async getMatches(bracketId: string): Promise<DatabasePlayoffMatch[]> {
    return await this.executeQuery<DatabasePlayoffMatch[]>('getMatches', () =>
      supabase
        .from('playoff_matches')
        .select('*')
        .eq('bracket_id', bracketId)
        .order('round', { ascending: true })
        .order('position', { ascending: true })
    );
  }

  /**
   * Create a reset match in the database
   * @param bracketId Bracket ID
   * @param team1Id First team ID
   * @param team2Id Second team ID
   * @returns Created match
   */
  async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<PlayoffMatch> {
    const newMatch: Partial<DatabasePlayoffMatch> = {
      id: nanoid(),
      bracket_id: bracketId,
      round: 999, // Special round number for reset match
      position: 1,
      match_type: 'finals',
      team1_id: team1Id,
      team2_id: team2Id,
      status: 'pending',
      best_of: 3
    };

    await this.executeOperation('createResetMatch', () =>
      supabase.from('playoff_matches').insert([newMatch])
    );

    // Convert database match to application model
    return {
      id: newMatch.id!,
      bracket_id: bracketId,
      round: 999,
      position: 1,
      matchType: 'finals',
      team1Id: team1Id,
      team2Id: team2Id,
      status: 'pending',
      bestOf: 3
    };
  }
  
  /**
   * Record a match result in the database
   * @param matchId Match ID
   * @param result Match result data
   * @returns Number of matches updated (1 for success, 0 for failure)
   */
  async recordMatchResult(matchId: string, result: DatabaseMatchResult): Promise<number> {
    const updateData = {
      winner_id: result.winner_id,
      loser_id: result.loser_id,
      team1_score: result.team1_score,
      team2_score: result.team2_score,
      team1_game_wins: result.team1_game_wins,
      team2_game_wins: result.team2_game_wins,
      status: 'completed'
    };
    
    return this.executeOperation('recordMatchResult', () =>
      supabase.from('playoff_matches').update(updateData).eq('id', matchId)
    );
  }
  
  /**
   * Advance a team to the next match
   * @param nextMatchId Next match ID
   * @param teamId Team ID to advance
   * @param isWinner Whether the team is advancing as a winner
   * @returns Number of matches updated (1 for success, 0 for failure)
   */
  async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<number> {
    // First, get the match to determine placement
    const { data: nextMatch, error } = await supabase
      .from('playoff_matches')
      .select('team1_id, team2_id')
      .eq('id', nextMatchId)
      .single();
    
    if (error) {
      console.error(`Error getting next match ${nextMatchId}:`, error);
      return 0;
    }
    
    // Determine whether to place in team1 or team2 slot
    const updateData = !nextMatch.team1_id
      ? { team1_id: teamId }
      : { team2_id: teamId };
    
    return this.executeOperation('advanceTeam', () => 
      supabase.from('playoff_matches').update(updateData).eq('id', nextMatchId)
    );
  }
}
