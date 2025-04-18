
import { supabase } from "@/integrations/supabase/client";
import { Match, Team } from "@/types";
import { calculateStreak } from "@/utils/rankingUtils/calculateStreak";
import { calculateSOS } from "@/utils/rankingUtils/calculateSOS";
import { calculatePowerScore } from "@/utils/teamDetailsUtils/powerScoreUtils";
import { calculateWinPercentage } from "@/utils/rankingUtils/calculateWinPercentage";
import { calculateGameStats } from "@/utils/teamDetailsUtils/gameStatsUtils";
import { calculateHeadToHead } from "@/utils/teamDetailsUtils/headToHeadUtils";

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
    
    console.log(`Stats updated for teams: ${winnerId} and ${loserId}`);
    return true;
  } catch (error) {
    console.error("Error updating team stats record:", error);
    return false;
  }
};

const updateSingleTeamStats = async (teamId: string, teams: Team[], matches: Match[], snapshotDate: string) => {
  try {
    const team = teams.find(t => t.id === teamId);
    if (!team) {
      console.error(`Team not found: ${teamId}`);
      return false;
    }

    // Calculate basic stats
    const streak = calculateStreak(teamId, matches);
    const headToHead = calculateHeadToHead(teamId, teams, matches);
    const winPercentage = calculateWinPercentage(team.wins || 0, team.losses || 0);
    const sos = await calculateSOS(team, teams, matches);
    
    // Calculate game stats
    const { gamesWon, gamesLost, gameWinPercentage, closeMatchLosses } = calculateGameStats(teamId, matches);
    
    // Calculate power score
    const powerScore = calculatePowerScore(winPercentage, sos, gameWinPercentage);
    
    console.log(`Team ${team.name} (${teamId}) stats:`, {
      wins: team.wins,
      losses: team.losses,
      winPercentage,
      gamesWon,
      gamesLost,
      gameWinPercentage,
      powerScore,
      sos
    });
    
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
