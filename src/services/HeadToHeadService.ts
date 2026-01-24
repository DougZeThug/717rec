import { supabase } from '@/integrations/supabase/client';
import { HeadToHeadRecord, HeadToHeadResponse, OpponentHistory } from '@/types/headToHead';
import { errorLog, matchLog } from '@/utils/logger';
import { handleDatabaseError } from '@/utils/errorHandler';
import { withTiming } from '@/utils/performance';

export class HeadToHeadService {
  /**
   * Get all head-to-head records for a specific team
   * @throws {DatabaseError} When database operations fail
   */
  static async getTeamHeadToHead(teamId: string): Promise<HeadToHeadRecord[]> {
    matchLog('Fetching head-to-head records for team:', teamId);

    return withTiming(
      async () => {
        // Step 1: Get head-to-head records from database function
        const { data, error } = await supabase.rpc('get_head_to_head_records', {
          p_team_id: teamId,
        });

        if (error) {
          handleDatabaseError(error, 'Failed to fetch head-to-head records');
        }

        // Step 2: Get team names and logos for opponents
        const opponentIds = data?.map((record) => record.opponent_id) || [];

        // Skip team query if there are no opponents to look up (avoids .in('id', []) which 400s in PostgREST)
        if (opponentIds.length === 0) {
          return [];
        }

        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, image_url')
          .in('id', opponentIds);

        if (teamsError) {
          handleDatabaseError(teamsError, 'Failed to fetch team information');
        }

        // Step 3: Create team mapping
        const teamMap = new Map(
          teams?.map((team) => [team.id, { name: team.name, image_url: team.image_url }]) || []
        );

        // Step 4: Transform data
        const result =
          data?.map((record: HeadToHeadResponse): HeadToHeadRecord => {
            const opponentInfo = teamMap.get(record.opponent_id);
            return {
              ...record,
              opponent_name: opponentInfo?.name || 'Unknown Team',
              opponent_image_url: opponentInfo?.image_url,
            };
          }) || [];

        return result;
      },
      matchLog,
      'Head-to-head records fetch'
    );
  }

  /**
   * Get detailed match history between two specific teams
   * Returns null if no matches exist between the teams (not an error condition)
   * @throws {DatabaseError} When database operations fail
   */
  static async getOpponentHistory(
    teamId: string,
    opponentId: string
  ): Promise<OpponentHistory | null> {
    matchLog('Fetching opponent history:', teamId, 'vs', opponentId);

    return withTiming(
      async () => {
        // First get the head-to-head summary for this specific opponent
        const headToHeadRecords = await this.getTeamHeadToHead(teamId);

        const summary = headToHeadRecords.find((record) => record.opponent_id === opponentId);

        if (!summary) {
          matchLog('No head-to-head summary found');
          return null;
        }

        // Use the new database function to get all match history
        const { data: matchHistory, error } = await supabase.rpc('get_opponent_match_history', {
          p_team_id: teamId,
          p_opponent_id: opponentId,
        });

        if (error) {
          handleDatabaseError(error, 'Failed to fetch opponent match history');
        }

        return {
          matches: matchHistory || [],
          summary,
        };
      },
      matchLog,
      'Opponent history fetch'
    );
  }
}
