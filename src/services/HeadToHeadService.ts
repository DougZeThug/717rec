import { supabase } from "@/integrations/supabase/client";
import { HeadToHeadRecord, HeadToHeadResponse, OpponentHistory } from "@/types/headToHead";

export class HeadToHeadService {
  /**
   * Get all head-to-head records for a specific team
   */
  static async getTeamHeadToHead(teamId: string): Promise<HeadToHeadRecord[]> {
    try {
      const { data, error } = await supabase.rpc('get_head_to_head_records', {
        p_team_id: teamId
      });

      if (error) throw error;

      // Get team names and logos for opponents
      const opponentIds = data?.map(record => record.opponent_id) || [];
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, image_url')
        .in('id', opponentIds);

      if (teamsError) throw teamsError;

      const teamMap = new Map(teams?.map(team => [team.id, { name: team.name, image_url: team.image_url }]) || []);

      return data?.map((record: HeadToHeadResponse): HeadToHeadRecord => ({
        ...record,
        opponent_name: teamMap.get(record.opponent_id)?.name || 'Unknown Team',
        opponent_image_url: teamMap.get(record.opponent_id)?.image_url
      })) || [];
    } catch (error) {
      console.error('Error fetching head-to-head records:', error);
      return [];
    }
  }

  /**
   * Get detailed match history between two specific teams
   */
  static async getOpponentHistory(teamId: string, opponentId: string): Promise<OpponentHistory | null> {
    try {
      // Get head-to-head summary
      const headToHeadRecords = await this.getTeamHeadToHead(teamId);
      const summary = headToHeadRecords.find(record => record.opponent_id === opponentId);

      if (!summary) return null;

      // Use v_match_pairs view to get all matches (current + archived) between these teams
      // Query 1: teamId as a_id, opponentId as b_id
      const { data: matchPairs1, error: matchPairsError1 } = await supabase
        .from('v_match_pairs')
        .select('*')
        .eq('a_id', teamId)
        .eq('b_id', opponentId)
        .order('completed_at', { ascending: false });

      if (matchPairsError1) throw matchPairsError1;

      // Query 2: opponentId as a_id, teamId as b_id
      const { data: matchPairs2, error: matchPairsError2 } = await supabase
        .from('v_match_pairs')
        .select('*')
        .eq('a_id', opponentId)
        .eq('b_id', teamId)
        .order('completed_at', { ascending: false });

      if (matchPairsError2) throw matchPairsError2;

      // Combine and sort all matches by date
      const matchPairs = [...(matchPairs1 || []), ...(matchPairs2 || [])]
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
        .slice(0, 15);

      // Get recent playoff matches between these teams
      const { data: playoffMatches, error: playoffError } = await supabase
        .from('playoff_matches')
        .select('id, created_at, team1_id, team2_id, team1_score, team2_score, winner_id')
        .or(`and(team1_id.eq.${teamId},team2_id.eq.${opponentId}),and(team1_id.eq.${opponentId},team2_id.eq.${teamId})`)
        .not('winner_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (playoffError) throw playoffError;

      // Get team names for formatting
      const allTeamIds = [...new Set([
        teamId, 
        opponentId,
        ...playoffMatches?.flatMap(match => [match.team1_id, match.team2_id, match.winner_id]).filter(Boolean) || []
      ])];
      
      const { data: teamNames } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', allTeamIds);

      const teamNameMap = new Map(teamNames?.map(team => [team.id, team.name]) || []);

      // Format match pairs from v_match_pairs view
      const formattedMatches = matchPairs?.map(match => ({
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
      })) || [];

      // Format playoff matches
      const formattedPlayoffMatches = playoffMatches?.map(match => ({
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
      })) || [];

      // Combine and sort all matches by date
      const allMatches = [...formattedMatches, ...formattedPlayoffMatches]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);

      return {
        matches: allMatches,
        summary
      };
    } catch (error) {
      console.error('Error fetching opponent history:', error);
      return null;
    }
  }
}