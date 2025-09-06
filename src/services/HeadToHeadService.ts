import { supabase } from "@/integrations/supabase/client";
import { HeadToHeadRecord, HeadToHeadResponse, OpponentHistory } from "@/types/headToHead";

export class HeadToHeadService {
  /**
   * Get all head-to-head records for a specific team
   */
  static async getTeamHeadToHead(teamId: string): Promise<HeadToHeadRecord[]> {
    const startTime = performance.now();
    console.log('🎯 HEAD-TO-HEAD START:', { teamId, timestamp: new Date().toISOString() });
    
    try {
      // Step 1: Get head-to-head records from database function
      console.log('📊 Calling get_head_to_head_records function...');
      const { data, error } = await supabase.rpc('get_head_to_head_records', {
        p_team_id: teamId
      });

      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }

      console.log('📊 RPC Results:', {
        recordCount: data?.length || 0,
        rawData: data?.slice(0, 3),
        dataStructure: data?.[0] ? Object.keys(data[0]) : 'No data'
      });

      // Step 2: Get team names and logos for opponents
      const opponentIds = data?.map(record => record.opponent_id) || [];
      console.log('👥 Fetching team details for opponents:', { 
        opponentCount: opponentIds.length,
        opponentIds: opponentIds.slice(0, 5)
      });

      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, image_url')
        .in('id', opponentIds);

      if (teamsError) {
        console.error('❌ Teams fetch error:', teamsError);
        throw teamsError;
      }

      console.log('👥 Teams data:', {
        teamCount: teams?.length || 0,
        teams: teams?.map(t => ({ id: t.id, name: t.name }))
      });

      // Step 3: Create team mapping
      const teamMap = new Map(teams?.map(team => [team.id, { name: team.name, image_url: team.image_url }]) || []);
      console.log('🗺️ Team mapping created:', { mapSize: teamMap.size });

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
      console.log('✅ HEAD-TO-HEAD COMPLETE:', {
        resultCount: result.length,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        sampleResult: result.slice(0, 2)
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      console.error('💥 HEAD-TO-HEAD ERROR:', {
        error,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        teamId
      });
      return [];
    }
  }

  /**
   * Get detailed match history between two specific teams
   */
  static async getOpponentHistory(teamId: string, opponentId: string): Promise<OpponentHistory | null> {
    const startTime = performance.now();
    console.log('🏆 OPPONENT-HISTORY START:', { 
      teamId, 
      opponentId, 
      timestamp: new Date().toISOString() 
    });

    try {
      // First get the head-to-head summary for this specific opponent
      console.log('📋 Getting head-to-head summary...');
      const headToHeadRecords = await this.getTeamHeadToHead(teamId);
      console.log('📋 Head-to-head records received:', {
        totalRecords: headToHeadRecords.length,
        recordsWithOpponent: headToHeadRecords.filter(r => r.opponent_id === opponentId).length
      });
      
      const summary = headToHeadRecords.find(record => record.opponent_id === opponentId);
      
      if (!summary) {
        console.log('❌ No head-to-head summary found');
        return null;
      }
      
      console.log('✅ Summary found:', summary);

      // Use the new database function to get all match history
      console.log('🔍 CALLING get_opponent_match_history function...');
      const rpcStart = performance.now();
      const { data: matchHistory, error } = await supabase
        .rpc('get_opponent_match_history', {
          p_team_id: teamId,
          p_opponent_id: opponentId
        });

      const rpcDuration = performance.now() - rpcStart;
      console.log('🔍 RPC Results:', {
        count: matchHistory?.length || 0,
        duration: `${rpcDuration.toFixed(2)}ms`,
        rawData: matchHistory || [],
        dataStructure: matchHistory?.length ? Object.keys(matchHistory[0]) : 'No data'
      });

      if (error) {
        console.error('❌ RPC Error:', error);
        return null;
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log('✅ OPPONENT-HISTORY COMPLETE:', {
        totalMatches: matchHistory?.length || 0,
        duration: `${duration.toFixed(2)}ms`,
        finalResult: matchHistory?.slice(0, 2) || []
      });

      return {
        matches: matchHistory || [],
        summary
      };

    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.error('❌ OPPONENT-HISTORY ERROR:', {
        error,
        duration: `${duration.toFixed(2)}ms`,
        teamId,
        opponentId
      });
      return null;
    }
  }
}