import { supabase } from "@/integrations/supabase/client";
import { HeadToHeadRecord, HeadToHeadResponse, OpponentHistory } from "@/types/headToHead";
import { matchLog, errorLog } from "@/utils/logger";

export class HeadToHeadService {
  /**
   * Get all head-to-head records for a specific team
   */
  static async getTeamHeadToHead(teamId: string): Promise<HeadToHeadRecord[]> {
    const startTime = performance.now();
    matchLog('Fetching head-to-head records for team:', teamId);
    
    try {
      // Step 1: Get head-to-head records from database function
      const { data, error } = await supabase.rpc('get_head_to_head_records', {
        p_team_id: teamId
      });

      if (error) {
        errorLog('RPC Error:', error);
        throw error;
      }

      // Step 2: Get team names and logos for opponents
      const opponentIds = data?.map(record => record.opponent_id) || [];

      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, image_url')
        .in('id', opponentIds);

      if (teamsError) {
        errorLog('Teams fetch error:', teamsError);
        throw teamsError;
      }

      // Step 3: Create team mapping
      const teamMap = new Map(teams?.map(team => [team.id, { name: team.name, image_url: team.image_url }]) || []);

      // Step 4: Transform data
      const result = data?.map((record: HeadToHeadResponse): HeadToHeadRecord => {
        const opponentInfo = teamMap.get(record.opponent_id);
        return {
          ...record,
          opponent_name: opponentInfo?.name || 'Unknown Team',
          opponent_image_url: opponentInfo?.image_url
        };
      }) || [];

      const endTime = performance.now();
      matchLog(`Head-to-head complete: ${result.length} records in ${(endTime - startTime).toFixed(2)}ms`);

      return result;
    } catch (error) {
      const endTime = performance.now();
      errorLog('Head-to-head error:', {
        error,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        teamId
      });
      throw error;
    }
  }

  /**
   * Get detailed match history between two specific teams
   */
  static async getOpponentHistory(teamId: string, opponentId: string): Promise<OpponentHistory | null> {
    const startTime = performance.now();
    matchLog('Fetching opponent history:', teamId, 'vs', opponentId);

    try {
      // First get the head-to-head summary for this specific opponent
      const headToHeadRecords = await this.getTeamHeadToHead(teamId);
      
      const summary = headToHeadRecords.find(record => record.opponent_id === opponentId);
      
      if (!summary) {
        matchLog('No head-to-head summary found');
        return null;
      }

      // Use the new database function to get all match history
      const { data: matchHistory, error } = await supabase
        .rpc('get_opponent_match_history', {
          p_team_id: teamId,
          p_opponent_id: opponentId
        });

      if (error) {
        errorLog('RPC Error:', error);
        throw error;
      }

      const endTime = performance.now();
      matchLog(`Opponent history complete: ${matchHistory?.length || 0} matches in ${(endTime - startTime).toFixed(2)}ms`);

      return {
        matches: matchHistory || [],
        summary
      };

    } catch (error) {
      const endTime = performance.now();
      errorLog('Opponent history error:', {
        error,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        teamId,
        opponentId
      });
      return null;
    }
  }
}
