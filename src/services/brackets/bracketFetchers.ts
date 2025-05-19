
import { supabase } from "@/integrations/supabase/client";
import { PlayoffBracket, PlayoffMatch } from "@/types";
import { bracketManager } from './manager/BracketManager';
import { DatabasePlayoffMatch } from './database/types';
import { BracketFormat, BracketState, BRACKET_FORMATS, BRACKET_STATES } from '@/constants/brackets';

/**
 * Fetch all brackets
 */
export async function fetchAllBrackets(): Promise<Partial<PlayoffBracket>[]> {
  try {
    const { data: brackets, error } = await supabase
      .from('brackets')
      .select('id, title, format, created_at, division_id');
    
    if (error) throw error;
    
    return brackets.map(bracket => ({
      id: bracket.id,
      name: bracket.title,
      format: convertToBracketFormat(bracket.format),
      createdAt: bracket.created_at,
      divisionId: bracket.division_id
    }));
  } catch (error) {
    console.error("Error fetching all brackets:", error);
    throw error;
  }
}

/**
 * Convert string format to BracketFormat enum
 */
function convertToBracketFormat(format: string): BracketFormat {
  if (format === 'Single Elimination') return BRACKET_FORMATS.SINGLE;
  if (format === 'Double Elimination') return BRACKET_FORMATS.DOUBLE;
  return BRACKET_FORMATS.SINGLE; // Default
}

/**
 * Convert string state to BracketState enum
 */
function convertToBracketState(state: string | null): BracketState {
  if (state === 'pending') return BRACKET_STATES.PENDING;
  if (state === 'underway') return BRACKET_STATES.UNDERWAY;
  if (state === 'complete') return BRACKET_STATES.COMPLETE;
  return BRACKET_STATES.PENDING; // Default
}

/**
 * Fetch a bracket by ID including all matches
 */
export async function fetchBracketById(bracketId: string): Promise<PlayoffBracket | null> {
  try {
    // Fetch bracket details
    const { data: bracket, error: bracketError } = await supabase
      .from('brackets')
      .select('*')
      .eq('id', bracketId)
      .single();
    
    if (bracketError) {
      if (bracketError.code === 'PGRST116') return null; // No rows returned
      throw bracketError;
    }
    
    if (!bracket) return null;
    
    // Fetch matches
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*, games(*)')
      .eq('bracket_id', bracketId);
    
    if (matchesError) throw matchesError;
    
    // Convert to our PlayoffMatch format
    const playoffMatches: PlayoffMatch[] = matches.map((match: any) => {
      // Extract team seeds from metadata
      const metadata = match.metadata || {};
      const team1Seed = metadata.team1_seed || null;
      const team2Seed = metadata.team2_seed || null;
      
      return {
        id: match.id,
        round: match.round_number,
        position: match.position,
        matchType: match.match_type,
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        team1Seed: team1Seed,
        team2Seed: team2Seed,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        team1GameWins: match.team1_game_wins,
        team2GameWins: match.team2_game_wins,
        winnerId: match.winner_id,
        loserId: match.loser_id,
        nextWinMatchId: match.next_match_id,
        nextLoseMatchId: match.next_loser_match_id,
        bestOf: match.best_of || 3,
        bracket_id: match.bracket_id,
        status: match.iscompleted ? 'completed' : 'pending',
        // Add games if available
        games: match.games?.map((game: any) => ({
          id: game.id,
          matchId: game.match_id,
          gameNumber: game.game_number,
          team1Score: game.team1_score,
          team2Score: game.team2_score,
          winnerId: game.winner_id
        })) || []
      };
    });
    
    // Return full bracket
    return {
      id: bracket.id,
      name: bracket.title,
      format: convertToBracketFormat(bracket.format),
      createdAt: bracket.created_at,
      divisionId: bracket.division_id,
      state: convertToBracketState(bracket.state),
      matches: playoffMatches
    };
  } catch (error) {
    console.error(`Error fetching bracket by ID ${bracketId}:`, error);
    throw error;
  }
}
