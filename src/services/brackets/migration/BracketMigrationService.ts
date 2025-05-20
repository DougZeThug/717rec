
import { supabase } from "@/integrations/supabase/client";
import { bracketManager } from "../manager/BracketManager";
import { PlayoffBracket, PlayoffMatch, Team } from "@/types";
import { mapBracketsToAppFormat } from "../utils/BracketConversionUtils";
import { BRACKET_FORMATS, BracketState } from "@/constants/brackets";

/**
 * Service for migrating brackets from old format to new format
 */
export class BracketMigrationService {
  /**
   * Get brackets that need migration
   */
  static async getBracketsForMigration(): Promise<PlayoffBracket[]> {
    try {
      const { data: brackets, error } = await supabase
        .from('brackets')
        .select('*, division:division_id(name)')
        .is('migrated', null);
      
      if (error) throw error;
      
      return brackets.map(bracket => ({
        id: bracket.id,
        name: bracket.title,
        division: bracket.division?.name,
        divisionId: bracket.division_id,
        format: bracket.format as any, // Convert string to BracketFormat
        matches: [], // Matches will be fetched separately
        champion: bracket.wb_champion_id,
        state: bracket.state as BracketState, // Cast to BracketState
        created_at: bracket.created_at
      }));
    } catch (error) {
      console.error('Error getting brackets for migration:', error);
      throw error;
    }
  }
  
  /**
   * Get all matches for a bracket
   */
  static async getMatchesForBracket(bracketId: string): Promise<PlayoffMatch[]> {
    try {
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .eq('bracket_id', bracketId);
      
      if (error) throw error;
      
      // Convert to PlayoffMatch format
      return matches.map(match => {
        const metadata = match.metadata as Record<string, any> || {};
        
        return {
          id: match.id,
          round: match.round_number,
          position: match.position,
          team1Id: match.team1_id,
          team2Id: match.team2_id,
          winnerId: match.winner_id,
          loserId: match.loser_id,
          team1Score: match.team1_score,
          team2Score: match.team2_score,
          team1GameWins: match.team1_game_wins,
          team2GameWins: match.team2_game_wins,
          matchType: match.match_type,
          bestOf: match.best_of || 3,
          team1Seed: metadata.team1_seed || null,
          team2Seed: metadata.team2_seed || null,
          nextWinMatchId: match.next_match_id,
          nextLoseMatchId: match.next_loser_match_id,
          bracket_id: match.bracket_id,
          status: match.iscompleted ? 'completed' : 'pending'
        };
      });
    } catch (error) {
      console.error('Error getting matches for bracket:', error);
      throw error;
    }
  }
  
  /**
   * Get all teams for a bracket
   */
  static async getTeamsForBracket(bracketId: string): Promise<Team[]> {
    try {
      console.log(`Getting teams for bracket ${bracketId}`);
      
      // First try to get teams from matches
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('bracket_id', bracketId);
      
      if (matchesError) throw matchesError;
      
      // Extract all team IDs
      const teamIds = new Set<string>();
      matches.forEach(match => {
        if (match.team1_id) teamIds.add(match.team1_id);
        if (match.team2_id) teamIds.add(match.team2_id);
      });
      
      // If no teams found in matches, try to get from the division
      if (teamIds.size === 0) {
        console.log(`No teams found in matches for bracket ${bracketId}, trying to get from division`);
        const { data: bracketData, error: bracketError } = await supabase
          .from('brackets')
          .select('division_id')
          .eq('id', bracketId)
          .single();
        
        if (bracketError) throw bracketError;
        
        if (bracketData.division_id) {
          const { data: divisionTeams, error: divisionError } = await supabase
            .from('teams')
            .select('*')
            .eq('division_id', bracketData.division_id);
          
          if (divisionError) throw divisionError;
          
          console.log(`Found ${divisionTeams.length} teams from division ${bracketData.division_id}`);
          return divisionTeams;
        }
      }
      
      if (teamIds.size === 0) {
        console.log('No teams found for bracket, returning empty array');
        return [];
      }
      
      // Get teams data
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .in('id', Array.from(teamIds));
      
      if (teamsError) throw teamsError;
      
      console.log(`Found ${teams.length} teams for bracket ${bracketId}`);
      return teams;
    } catch (error) {
      console.error('Error getting teams for bracket:', error);
      throw error;
    }
  }
  
  /**
   * Migrate a bracket from old format to new format
   */
  static async migrateBracket(bracketId: string): Promise<{ 
    success: boolean; 
    message: string;
    validation: {
      matches: number;
      teams: number;
    };
  }> {
    try {
      console.log(`Starting migration for bracket ${bracketId}`);
      
      // Get bracket data
      const bracket = await this.getBracketsForMigration()
        .then(brackets => brackets.find(b => b.id === bracketId));
      
      if (!bracket) {
        return {
          success: false,
          message: 'Bracket not found or already migrated',
          validation: { matches: 0, teams: 0 }
        };
      }
      
      // Get matches and teams
      const matches = await this.getMatchesForBracket(bracketId);
      bracket.matches = matches;
      const teams = await this.getTeamsForBracket(bracketId);
      
      if (teams.length === 0) {
        console.error(`No teams found for bracket ${bracketId}`);
        return {
          success: false,
          message: 'No teams found for this bracket',
          validation: { matches: 0, teams: 0 }
        };
      }
      
      console.log(`Migrating bracket: ${bracket.name} with ${teams.length} teams and ${matches.length} matches`);
      
      // Create stage in brackets-manager
      const stageType = bracket.format === BRACKET_FORMATS.DOUBLE ? 'double_elimination' : 'single_elimination';
      const seeding = teams.map(team => team.id);
      
      // Convert to brackets-manager format and create
      await bracketManager.createStage({
        id: bracketId,
        name: bracket.name,
        type: stageType,
        seeding: seeding,
        settings: {
          grandFinal: 'double',
          seedOrdering: ['natural'], // Added this required parameter
          matchesChildCount: 0,
          size: teams.length
        },
        divisionId: bracket.divisionId,
        tournamentId: bracketId // Using bracketId as tournamentId
      });
      
      // Register teams (participants)
      const participants = teams.map((team, index) => ({
        id: team.id,
        name: team.name,
        tournament_id: bracketId,
        position: index + 1 // Add position information
      }));
      
      console.log(`Registering ${participants.length} participants`);
      await bracketManager.registerParticipants(participants);
      
      // Mark the bracket as migrated
      const { error: updateError } = await supabase
        .from('brackets')
        .update({ 
          migrated: true,
          migrated_at: new Date().toISOString() 
        })
        .eq('id', bracketId);
      
      if (updateError) throw updateError;
      
      return {
        success: true,
        message: 'Bracket migrated successfully',
        validation: {
          matches: matches.length,
          teams: teams.length
        }
      };
    } catch (error) {
      console.error('Error migrating bracket:', error);
      
      return {
        success: false,
        message: `Migration failed: ${error.message}`,
        validation: { matches: 0, teams: 0 }
      };
    }
  }
  
  /**
   * Migrate all brackets
   */
  static async migrateAllBrackets(): Promise<{
    successful: number;
    failed: number;
    results: { id: string; success: boolean; message: string }[];
  }> {
    try {
      const brackets = await this.getBracketsForMigration();
      const results = [];
      let successful = 0;
      let failed = 0;
      
      for (const bracket of brackets) {
        const result = await this.migrateBracket(bracket.id);
        results.push({
          id: bracket.id,
          success: result.success,
          message: result.message
        });
        
        if (result.success) successful++;
        else failed++;
      }
      
      return { successful, failed, results };
    } catch (error) {
      console.error('Error migrating all brackets:', error);
      throw error;
    }
  }
  
  /**
   * Rollback a migration
   */
  static async rollbackMigration(bracketId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Remove from brackets-manager
      await bracketManager.deleteMatches({ bracket_id: bracketId });
      
      // Mark as not migrated
      const { error: updateError } = await supabase
        .from('brackets')
        .update({ 
          migrated: null,
          migrated_at: null 
        })
        .eq('id', bracketId);
      
      if (updateError) throw updateError;
      
      return {
        success: true,
        message: 'Migration rolled back successfully'
      };
    } catch (error) {
      console.error('Error rolling back migration:', error);
      return {
        success: false,
        message: `Rollback failed: ${error.message}`
      };
    }
  }
}
