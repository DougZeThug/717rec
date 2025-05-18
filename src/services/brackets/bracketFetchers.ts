
import { supabase } from '@/integrations/supabase/client';
import { PlayoffBracket, PlayoffMatch, Team } from '@/types';
import { transformDoubleEliminationMatches } from './transformers/doubleElimination';
import { transformSingleEliminationMatches } from './transformers/singleElimination';
import { normalizeBracketFormat, normalizeBracketState, determineChampion } from './bracketFormatters';

/**
 * Fetch a specific bracket by ID
 * @param bracketId ID of the bracket to fetch
 * @returns The full bracket data with matches
 */
export const fetchBracketById = async (bracketId: string): Promise<PlayoffBracket | null> => {
  if (!bracketId) return null;
  
  try {
    // Fetch the bracket data
    const { data: bracketData, error: bracketError } = await supabase
      .from('brackets')  // Changed from 'playoff_brackets' to 'brackets'
      .select(`
        id,
        title,
        division:division_id (name),
        format,
        state,
        wb_champion_id,
        challonge_tournament_id,
        challonge_tournament_url
      `)
      .eq('id', bracketId)
      .single();
    
    if (bracketError) throw bracketError;
    if (!bracketData) return null;
    
    // Fetch all matches for the bracket
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')  // Changed from 'playoff_matches' to 'matches'
      .select('*')
      .eq('bracket_id', bracketId)
      .order('round_number', { ascending: true })  // Changed from 'round' to 'round_number'
      .order('position', { ascending: true });
    
    if (matchesError) throw matchesError;
    
    // Determine which transformation to use based on bracket format
    const format = normalizeBracketFormat(bracketData.format);
    const matches = format === 'Double Elimination' 
      ? transformDoubleEliminationMatches(matchesData)
      : transformSingleEliminationMatches(matchesData);
    
    // Determine the champion if the bracket is complete
    const champion = determineChampion(matches);
    
    return {
      id: bracketData.id,
      name: bracketData.title,  // Changed from 'name' to 'title'
      division: bracketData.division?.name || 'Unknown',
      format,
      matches,
      champion: champion || bracketData.wb_champion_id,  // Changed from 'champion_id' to 'wb_champion_id'
      challongeTournamentId: bracketData.challonge_tournament_id,
      challongeTournamentUrl: bracketData.challonge_tournament_url,
      state: normalizeBracketState(bracketData.state)
    };
  } catch (error) {
    console.error('Error fetching bracket by ID:', error);
    throw error;
  }
};

/**
 * Fetch all brackets
 * @returns Array of all brackets (with minimal data, no matches)
 */
export const fetchAllBrackets = async (): Promise<Partial<PlayoffBracket>[]> => {
  try {
    const { data, error } = await supabase
      .from('brackets')  // Changed from 'playoff_brackets' to 'brackets'
      .select(`
        id,
        title,
        division:division_id (name),
        format,
        state,
        wb_champion_id,
        challonge_tournament_id,
        challonge_tournament_url
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(bracket => ({
      id: bracket.id,
      name: bracket.title,  // Changed from 'name' to 'title'
      division: bracket.division?.name || 'Unknown',
      format: normalizeBracketFormat(bracket.format),
      champion: bracket.wb_champion_id,  // Changed from 'champion_id' to 'wb_champion_id'
      challongeTournamentId: bracket.challonge_tournament_id,
      challongeTournamentUrl: bracket.challonge_tournament_url,
      state: normalizeBracketState(bracket.state)
    }));
  } catch (error) {
    console.error('Error fetching all brackets:', error);
    throw error;
  }
};
