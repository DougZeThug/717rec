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
      // Step 1: Get head-to-head summary
      console.log('📋 Getting head-to-head summary...');
      const headToHeadRecords = await this.getTeamHeadToHead(teamId);
      console.log('📋 Head-to-head records received:', {
        totalRecords: headToHeadRecords.length,
        recordsWithOpponent: headToHeadRecords.filter(r => r.opponent_id === opponentId).length
      });

      const summary = headToHeadRecords.find(record => record.opponent_id === opponentId);
      if (!summary) {
        console.log('❌ No summary found for opponent:', opponentId);
        return null;
      }
      console.log('✅ Summary found:', summary);

      // Step 2: Query v_match_pairs view
      console.log('🔍 QUERYING MATCH PAIRS VIEW...');
      console.log('🔍 Team IDs for queries:', { teamId, opponentId });
      
      // Query 1: teamId as a_id, opponentId as b_id
      const query1Start = performance.now();
      console.log('🔍 Executing Query 1: teamId as a_id, opponentId as b_id');
      const { data: matchPairs1, error: matchPairsError1 } = await supabase
        .from('v_match_pairs')
        .select('*')
        .eq('a_id', teamId)
        .eq('b_id', opponentId)
        .order('completed_at', { ascending: false });

      const query1End = performance.now();
      if (matchPairsError1) {
        console.error('❌ Query 1 Error:', matchPairsError1);
        throw matchPairsError1;
      }
      console.log('🔍 Query 1 Results:', {
        count: matchPairs1?.length || 0,
        duration: `${(query1End - query1Start).toFixed(2)}ms`,
        rawData: matchPairs1?.slice(0, 2),
        dataStructure: matchPairs1?.[0] ? Object.keys(matchPairs1[0]) : 'No data'
      });

      // Query 2: opponentId as a_id, teamId as b_id
      const query2Start = performance.now();
      console.log('🔍 Executing Query 2: opponentId as a_id, teamId as b_id');
      const { data: matchPairs2, error: matchPairsError2 } = await supabase
        .from('v_match_pairs')
        .select('*')
        .eq('a_id', opponentId)
        .eq('b_id', teamId)
        .order('completed_at', { ascending: false });

      const query2End = performance.now();
      if (matchPairsError2) {
        console.error('❌ Query 2 Error:', matchPairsError2);
        throw matchPairsError2;
      }
      console.log('🔍 Query 2 Results:', {
        count: matchPairs2?.length || 0,
        duration: `${(query2End - query2Start).toFixed(2)}ms`,
        rawData: matchPairs2?.slice(0, 2),
        dataStructure: matchPairs2?.[0] ? Object.keys(matchPairs2[0]) : 'No data'
      });

      // Step 3: Combine and sort matches
      console.log('🔄 Combining match pairs...');
      const matchPairs = [...(matchPairs1 || []), ...(matchPairs2 || [])]
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
        .slice(0, 15);
      
      console.log('🔄 Combined match pairs:', {
        totalCombined: matchPairs?.length || 0,
        fromQuery1: matchPairs1?.length || 0,
        fromQuery2: matchPairs2?.length || 0,
        afterLimit: matchPairs.length,
        sampleMatches: matchPairs?.slice(0, 3)?.map(m => ({
          id: m.match_id,
          date: m.completed_at,
          a_id: m.a_id,
          b_id: m.b_id,
          a_score: m.a_match_score,
          b_score: m.b_match_score
        }))
      });

      // Step 4: Get playoff matches
      console.log('🏆 Getting playoff matches...');
      const playoffStart = performance.now();
      const { data: playoffMatches, error: playoffError } = await supabase
        .from('playoff_matches')
        .select('id, created_at, team1_id, team2_id, team1_score, team2_score, winner_id')
        .or(`and(team1_id.eq.${teamId},team2_id.eq.${opponentId}),and(team1_id.eq.${opponentId},team2_id.eq.${teamId})`)
        .not('winner_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      const playoffEnd = performance.now();
      if (playoffError) {
        console.error('❌ Playoff query error:', playoffError);
        throw playoffError;
      }
      console.log('🏆 Playoff matches:', {
        count: playoffMatches?.length || 0,
        duration: `${(playoffEnd - playoffStart).toFixed(2)}ms`,
        matches: playoffMatches?.map(m => ({
          id: m.id,
          date: m.created_at,
          team1: m.team1_id,
          team2: m.team2_id,
          winner: m.winner_id
        }))
      });

      // Step 5: Get team names for formatting
      console.log('👥 Getting team names for formatting...');
      const allTeamIds = [...new Set([
        teamId, 
        opponentId,
        ...playoffMatches?.flatMap(match => [match.team1_id, match.team2_id, match.winner_id]).filter(Boolean) || []
      ])];
      
      console.log('👥 Team IDs to fetch names for:', { count: allTeamIds.length, ids: allTeamIds });

      const { data: teamNames } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', allTeamIds);

      console.log('👥 Team names fetched:', {
        requestedCount: allTeamIds.length,
        receivedCount: teamNames?.length || 0,
        teams: teamNames?.map(t => ({ id: t.id, name: t.name }))
      });

      const teamNameMap = new Map(teamNames?.map(team => [team.id, team.name]) || []);

      // Step 6: Format match pairs from v_match_pairs view
      console.log('🔄 Formatting match pairs...');
      const formattedMatches = matchPairs?.map(match => {
        const formatted = {
          id: match.match_id,
          date: match.completed_at,
          team1_name: teamNameMap.get(match.a_id) || 'Unknown',
          team2_name: teamNameMap.get(match.b_id) || 'Unknown',
          team1_score: match.a_match_score || 0,
          team2_score: match.b_match_score || 0,
          team1_game_wins: match.a_game_wins || 0,
          team2_game_wins: match.b_game_wins || 0,
          winner_name: match.a_match_score === 1 
            ? teamNameMap.get(match.a_id) || 'Unknown'
            : teamNameMap.get(match.b_id) || 'Unknown',
          location: 'Regular Season'
        };
        console.log('🔄 Formatted match:', { 
          original: { id: match.match_id, a_id: match.a_id, b_id: match.b_id },
          formatted: { id: formatted.id, team1: formatted.team1_name, team2: formatted.team2_name }
        });
        return formatted;
      }) || [];

      // Step 7: Format playoff matches
      console.log('🏆 Formatting playoff matches...');
      const formattedPlayoffMatches = playoffMatches?.map(match => {
        const formatted = {
          id: match.id,
          date: match.created_at,
          team1_name: teamNameMap.get(match.team1_id) || 'Unknown',
          team2_name: teamNameMap.get(match.team2_id) || 'Unknown',
          team1_score: match.team1_score || 0,
          team2_score: match.team2_score || 0,
          team1_game_wins: match.team1_score || 0,
          team2_game_wins: match.team2_score || 0,
          winner_name: teamNameMap.get(match.winner_id) || 'Unknown',
          location: 'Playoff Match'
        };
        console.log('🏆 Formatted playoff match:', formatted);
        return formatted;
      }) || [];

      // Step 8: Combine and sort all matches by date
      console.log('🔗 Combining all matches...');
      const allMatches = [...formattedMatches, ...formattedPlayoffMatches]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);

      const endTime = performance.now();
      console.log('✅ OPPONENT-HISTORY COMPLETE:', {
        totalMatches: allMatches.length,
        regularSeasonMatches: formattedMatches.length,
        playoffMatches: formattedPlayoffMatches.length,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        finalResult: allMatches.slice(0, 3)
      });

      return {
        matches: allMatches,
        summary
      };
    } catch (error) {
      const endTime = performance.now();
      console.error('💥 OPPONENT-HISTORY ERROR:', {
        error,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        teamId,
        opponentId
      });
      return null;
    }
  }
}