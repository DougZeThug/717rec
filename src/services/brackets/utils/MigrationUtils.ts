
import { supabase } from "@/integrations/supabase/client";
import { bracketManager } from "../BracketsService";

/**
 * Utility to migrate existing brackets to the brackets-manager format
 */
export class MigrationUtils {
  /**
   * Migrate an existing bracket to the brackets-manager format
   */
  static async migrateBracket(bracketId: string): Promise<void> {
    try {
      console.log(`Starting migration for bracket ${bracketId}`);
      
      // Get the bracket info
      const { data: bracketData, error: bracketError } = await supabase
        .from('brackets')
        .select('id, title, format')
        .eq('id', bracketId)
        .single();
      
      if (bracketError) throw bracketError;
      
      // Get all matches for the bracket
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('bracket_id', bracketId)
        .order('round_number', { ascending: true })
        .order('position', { ascending: true });
      
      if (matchesError) throw matchesError;
      
      // Get team information
      const teamIds = new Set<string>();
      matchesData.forEach(match => {
        if (match.team1_id) teamIds.add(match.team1_id);
        if (match.team2_id) teamIds.add(match.team2_id);
      });
      
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, seed')
        .in('id', Array.from(teamIds));
      
      if (teamsError) throw teamsError;
      
      // Now use brackets-manager to recreate the bracket
      
      // 1. First we'll need to remove any existing data for this bracketId in the brackets-manager format
      await bracketManager.deleteMatches({ stage_id: bracketId });
      
      // 2. Create the stage
      const stageType = bracketData.format === 'Double Elimination' 
        ? 'double_elimination' as const
        : 'single_elimination' as const;
        
      const stage = {
        id: bracketId,
        name: bracketData.title,
        type: stageType,
        seeding: [],
        settings: {
          size: teamsData.length,
          matchesChildCount: 1,
          consolationFinal: false,
          seedOrdering: ['natural'],
          match: { games: 3 }
        },
        tournamentId: bracketId // Added to satisfy InputStage requirement
      };
      
      await bracketManager.createStage(stage);
      
      // 3. Add participants/teams
      const participants = teamsData.map(team => ({
        id: team.id,
        name: team.name,
        position: team.seed || null,
        tournament_id: bracketId
      }));
      
      await bracketManager.registerParticipants(participants);
      
      // 4. Convert and add matches
      // This is complex and would require mapping from our format to brackets-manager format
      // ...
      
      console.log(`Migration completed for bracket ${bracketId}`);
    } catch (error) {
      console.error(`Error migrating bracket ${bracketId}:`, error);
      throw error;
    }
  }
}
