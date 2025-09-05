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

      // Get recent regular season matches between these teams
      const { data: matches, error } = await supabase
        .from('matches')
        .select(`
          id,
          date,
          team1_id,
          team2_id,
          team1_score,
          team2_score,
          team1_game_wins,
          team2_game_wins,
          winner_id,
          location,
          team1:team1_id(name),
          team2:team2_id(name),
          winner:winner_id(name)
        `)
        .or(`and(team1_id.eq.${teamId},team2_id.eq.${opponentId}),and(team1_id.eq.${opponentId},team2_id.eq.${teamId})`)
        .eq('iscompleted', true)
        .order('date', { ascending: false })
        .limit(15);

      if (error) throw error;

      console.log('Regular season matches found:', matches?.length || 0);

      // Get archived matches from previous seasons
      console.log('Querying archived matches with teamId:', teamId, 'opponentId:', opponentId);
      
      // Query for matches where team1 is our team and team2 is opponent
      const { data: archivedMatches1, error: error1 } = await supabase
        .from('matches_archive')
        .select(`
          id,
          date,
          team1_id,
          team2_id,
          team1_score,
          team2_score,
          team1_game_wins,
          team2_game_wins,
          winner_id,
          loser_id,
          location
        `)
        .eq('team1_id', teamId)
        .eq('team2_id', opponentId);

      // Query for matches where team1 is opponent and team2 is our team  
      const { data: archivedMatches2, error: error2 } = await supabase
        .from('matches_archive')
        .select(`
          id,
          date,
          team1_id,
          team2_id,
          team1_score,
          team2_score,
          team1_game_wins,
          team2_game_wins,
          winner_id,
          loser_id,
          location
        `)
        .eq('team1_id', opponentId)
        .eq('team2_id', teamId);

      if (error1 || error2) {
        console.error('Archived matches query error:', error1 || error2);
        throw error1 || error2;
      }
      
      // Combine both result sets
      const archivedMatches = [...(archivedMatches1 || []), ...(archivedMatches2 || [])]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);
      
      const archivedError = error1 || error2;
      console.log('Archived matches found:', archivedMatches?.length || 0);
      console.log('Raw archived matches data:', archivedMatches);

      // Get recent playoff matches between these teams
      const { data: playoffMatches, error: playoffError } = await supabase
        .from('playoff_matches')
        .select('id, created_at, team1_id, team2_id, team1_score, team2_score, winner_id')
        .or(`and(team1_id.eq.${teamId},team2_id.eq.${opponentId}),and(team1_id.eq.${opponentId},team2_id.eq.${teamId})`)
        .not('winner_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (playoffError) throw playoffError;

      // Get team names for all matches (regular, archived, playoff)
      const regularTeamIds = [...new Set(matches?.flatMap(match => [match.team1_id, match.team2_id, match.winner_id]).filter(Boolean) || [])];
      const archivedTeamIds = [...new Set(archivedMatches?.flatMap(match => [match.team1_id, match.team2_id, match.winner_id]).filter(Boolean) || [])];
      const playoffTeamIds = [...new Set(playoffMatches?.flatMap(match => [match.team1_id, match.team2_id, match.winner_id]).filter(Boolean) || [])];
      const allTeamIds = [...new Set([...regularTeamIds, ...archivedTeamIds, ...playoffTeamIds])];
      
      const { data: teamNames } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', allTeamIds);

      const teamNameMap = new Map(teamNames?.map(team => [team.id, team.name]) || []);

      // Format regular season matches
      const formattedMatches = matches?.map(match => ({
        id: match.id,
        date: match.date,
        team1_name: (match.team1 as any)?.name || 'Unknown',
        team2_name: (match.team2 as any)?.name || 'Unknown',
        team1_score: match.team1_score || 0,
        team2_score: match.team2_score || 0,
        team1_game_wins: match.team1_game_wins || 0,
        team2_game_wins: match.team2_game_wins || 0,
        winner_name: (match.winner as any)?.name || 'Unknown',
        location: match.location || 'Unknown'
      })) || [];

      // Format archived matches
      const formattedArchivedMatches = archivedMatches?.map(match => ({
        id: match.id,
        date: match.date,
        team1_name: teamNameMap.get(match.team1_id) || 'Unknown',
        team2_name: teamNameMap.get(match.team2_id) || 'Unknown',
        team1_score: match.team1_score || 0,
        team2_score: match.team2_score || 0,
        team1_game_wins: match.team1_game_wins || 0,
        team2_game_wins: match.team2_game_wins || 0,
        winner_name: teamNameMap.get(match.winner_id) || 'Unknown',
        location: match.location || 'Previous Season'
      })) || [];

      console.log('Formatted archived matches:', formattedArchivedMatches.length);
      console.log('Sample archived match:', formattedArchivedMatches[0]);

      // Format playoff matches
      const formattedPlayoffMatches = playoffMatches?.map(match => ({
        id: match.id,
        date: match.created_at, // Use created_at for playoff matches since they don't have a date field
        team1_name: teamNameMap.get(match.team1_id) || 'Unknown',
        team2_name: teamNameMap.get(match.team2_id) || 'Unknown',
        team1_score: match.team1_score || 0,
        team2_score: match.team2_score || 0,
        team1_game_wins: match.team1_score || 0, // For playoff matches, use score as game wins
        team2_game_wins: match.team2_score || 0,
        winner_name: teamNameMap.get(match.winner_id) || 'Unknown',
        location: 'Playoff Match'
      })) || [];

      // Combine and sort all matches by date
      const allMatches = [...formattedMatches, ...formattedArchivedMatches, ...formattedPlayoffMatches]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15); // Keep only the 15 most recent matches

      console.log('Total combined matches:', allMatches.length);
      console.log('Match sources:', {
        regular: formattedMatches.length,
        archived: formattedArchivedMatches.length,
        playoff: formattedPlayoffMatches.length
      });

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