
import { supabase } from "@/integrations/supabase/client";
import { BracketFormat, BRACKET_FORMATS } from '@/constants/brackets';
import { Team } from "@/types";
import { SimpleBracketCreationService } from './SimpleBracketCreationService';
import { BracketMapper } from '../mappers/BracketMapper';
import { BracketDto } from '@/types/supabase.generated';
import { PlayoffBracket } from '@/types/playoffs';

/**
 * Core service for bracket operations - consolidates main bracket functionality
 */
export class BracketCoreService {
  /**
   * Create a new tournament bracket
   */
  static async createBracket(
    format: BracketFormat,
    name: string,
    divisionId: string,
    teamIds: string[]
  ): Promise<string> {
    if (!name?.trim()) {
      throw new Error('Bracket name is required');
    }

    if (!divisionId) {
      throw new Error('Division ID is required');
    }

    if (!teamIds.length) {
      throw new Error('Teams are required');
    }

    const validFormat: BracketFormat = Object.values(BRACKET_FORMATS).includes(format as any) 
      ? format 
      : BRACKET_FORMATS.SINGLE;
      
    return SimpleBracketCreationService.createBracket(
      validFormat,
      name, 
      divisionId, 
      teamIds
    );
  }

  /**
   * List all brackets
   */
  static async listBrackets(): Promise<PlayoffBracket[]> {
    const { data, error } = await supabase
      .from('brackets')
      .select('*, matches(*)');
    
    if (error) throw new Error(error.message);
    
    return data.map(bracketDto => {
      const matchesDto = bracketDto.matches || [];
      return BracketMapper.bracketDtoToDomain(bracketDto as BracketDto, matchesDto);
    });
  }

  /**
   * Get bracket by ID
   */
  static async getBracketById(id: string): Promise<PlayoffBracket> {
    if (!id) {
      throw new Error('Bracket ID is required');
    }

    const { data, error } = await supabase
      .from('brackets')
      .select('*, matches(*)')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    
    return BracketMapper.bracketDtoToDomain(
      data as BracketDto, 
      (data.matches || [])
    );
  }

  /**
   * Delete a bracket
   */
  static async deleteBracket(id: string): Promise<void> {
    if (!id) {
      throw new Error('Bracket ID is required');
    }

    const { error } = await supabase.from('brackets').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  /**
   * Fetch bracket with playoff matches
   */
  static async fetchBracketById(bracketId: string): Promise<PlayoffBracket> {
    if (!bracketId) {
      throw new Error('Bracket ID is required');
    }

    // Get the bracket details
    const { data: bracket, error: bracketError } = await supabase
      .from('brackets')
      .select('*')
      .eq('id', bracketId)
      .single();
      
    if (bracketError) throw bracketError;
    
    // Get all matches for this bracket
    const { data: matches, error: matchesError } = await supabase
      .from('playoff_matches')
      .select('*')
      .eq('bracket_id', bracketId);
      
    if (matchesError) throw matchesError;
    
    return BracketMapper.bracketDtoToDomain(
      bracket as BracketDto, 
      (matches || [])
    );
  }
}
