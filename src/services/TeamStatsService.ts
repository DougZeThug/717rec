
import { supabase } from "@/integrations/supabase/client";
import { Match, Team } from "@/types";
import { calculateStreak } from "@/utils/rankingUtils/calculateStreak";
import { calculateHeadToHead } from "@/utils/rankingUtils/calculateHeadToHead";
import { calculateSOS } from "@/utils/rankingUtils/calculateSOS";
import { calculatePowerScore } from "@/utils/teamDetailsUtils/powerScoreUtils";
import { calculateWinPercentage } from "@/utils/rankingUtils/calculateWinPercentage";

export const updateTeamStatsRecord = async (winnerId: string, loserId: string) => {
  try {
    const currentDate = new Date().toISOString();
    
    // Get all matches to calculate complete stats
    const { data: allMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('iscompleted', true);

    // Get all teams to calculate SOS and other stats
    const { data: allTeams } = await supabase
      .from('teams')
      .select('*, divisions(name, division_weight)');
      
    if (!allMatches || !allTeams) {
      throw new Error("Failed to fetch data for stats calculation");
    }

    // Map DB data to our expected format with proper typing
    const mappedTeams: Team[] = allTeams.map(team => ({
      id: team.id,
      name: team.name,
      logoUrl: team.logo_url,
      imageUrl: team.image_url,
      players: Array.isArray(team.players) 
        ? team.players.map(playerName => ({ name: playerName })) 
        : [],
      wins: team.wins || 0,
      losses: team.losses || 0,
      created_at: team.created_at,
      division: team.division_id,
      divisionName: team.divisions?.name
    }));

    const mappedMatches: Match[] = allMatches.map(match => ({
      id: match.id,
      team1Id: match.team1_id || '',
      team2Id: match.team2_id || '',
      team1Score: match.team1_score,
      team2Score: match.team2_score,
      date: match.date || match.created_at,
      location: match.location || '',
      iscompleted: match.iscompleted || false,
      winnerId: match.winner_id,
      loserId: match.loser_id,
      team1_game_wins: match.team1_game_wins,
      team2_game_wins: match.team2_game_wins
    }));

    // Process both winner and loser stats
    await Promise.all([
      updateSingleTeamStats(winnerId, mappedTeams, mappedMatches, currentDate),
      updateSingleTeamStats(loserId, mappedTeams, mappedMatches, currentDate)
    ]);
    
    return true;
  } catch (error) {
    console.error("Error updating team stats record:", error);
    return false;
  }
};

const updateSingleTeamStats = async (teamId: string, teams: Team[], matches: Match[], snapshotDate: string) => {
  try {
    const team = teams.find(t => t.id === teamId);
    if (!team) return false;

    // Calculate streak
    const streak = calculateStreak(teamId, matches);
    
    // Calculate head-to-head records
    const headToHead = calculateHeadToHead(teamId, teams, matches);
    
    // Calculate win percentage
    const winPercentage = calculateWinPercentage(team.wins, team.losses);
    
    // Calculate strength of schedule
    const sos = await calculateSOS(team, teams, matches);
    
    // Calculate game stats
    const teamMatches = matches.filter(m => 
      m.team1Id === teamId || m.team2Id === teamId
    );
    
    let gamesWon = 0;
    let gamesLost = 0;
    
    teamMatches.forEach(match => {
      if (match.team1Id === teamId) {
        gamesWon += match.team1_game_wins || 0;
        gamesLost += match.team2_game_wins || 0;
      } else {
        gamesWon += match.team2_game_wins || 0;
        gamesLost += match.team1_game_wins || 0;
      }
    });
    
    const gameWinPercentage = (gamesWon + gamesLost > 0) ? 
      gamesWon / (gamesWon + gamesLost) : 0;
    
    // Calculate power score
    const powerScore = calculatePowerScore(winPercentage, sos, gameWinPercentage);
    
    // Get previous rank information
    const { data: previousStats } = await supabase
      .from('team_stats')
      .select('current_rank')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const previousRank = previousStats && previousStats.length > 0 ? 
      previousStats[0].current_rank : undefined;
    
    // Save all calculated stats
    await supabase
      .from('team_stats')
      .insert({
        team_id: teamId,
        wins: team.wins,
        losses: team.losses,
        win_percentage: winPercentage,
        sos,
        streak,
        previous_rank: previousRank,
        head_to_head: headToHead,
        snapshot_date: snapshotDate,
        power_score: powerScore
      });
    
    return true;
  } catch (error) {
    console.error(`Error updating stats for team ${teamId}:`, error);
    return false;
  }
};
