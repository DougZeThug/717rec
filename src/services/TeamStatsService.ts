
import { supabase } from "@/integrations/supabase/client";
import { Match, Team } from "@/types";
import { calculateStreak } from "@/utils/rankingUtils/calculateStreak";
import { calculateSOS } from "@/utils/rankingUtils/calculateSOS";
import { calculatePowerScore } from "@/utils/powerScore";
import { calculateWinPercentage } from "@/utils/rankingUtils/calculateWinPercentage";
import { calculateGameStats } from "@/utils/teamDetailsUtils/gameStatsUtils";
import { calculateHeadToHead } from "@/utils/teamDetailsUtils/headToHeadUtils";

export const updateTeamStatsRecord = async (winnerId: string, loserId: string) => {
  try {
    const currentDate = new Date().toISOString();
    
    const { data: allMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('iscompleted', true);

    if (matchesError) {
      console.error("Error fetching matches:", matchesError);
      throw matchesError;
    }

    const { data: allTeams, error: teamsError } = await supabase
      .from('teams')
      .select('*, divisions(name, division_weight)');
      
    if (teamsError) {
      console.error("Error fetching teams:", teamsError);
      throw teamsError;
    }

    if (!allMatches || !allTeams) {
      throw new Error("Failed to fetch data for stats calculation");
    }

    const mappedTeams: Team[] = allTeams.map(team => ({
      id: team.id,
      name: team.name,
      logoUrl: team.logo_url || null,
      imageUrl: team.image_url || null,
      players: Array.isArray(team.players) 
        ? team.players.map(playerName => playerName) 
        : [],
      wins: team.wins || 0,
      losses: team.losses || 0,
      created_at: team.created_at,
      division: team.division_id,
      divisionName: team.divisions?.name,
      power_score: 0,
      sos: 0.5,
      win_percentage: 0,
      game_win_percentage: 0,
      game_wins: team.game_wins || 0,
      game_losses: team.game_losses || 0
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

    console.log("Match details for processing:");
    mappedMatches.forEach(match => {
      if (match.winnerId === winnerId || match.loserId === loserId) {
        console.log(`Match ${match.id}: Team1 (${match.team1Id}): ${match.team1Score}, Team2 (${match.team2Id}): ${match.team2Score}, Winner: ${match.winnerId}, Loser: ${match.loserId}, Completed: ${match.iscompleted}`);
      }
    });

    const results = await Promise.all([
      updateSingleTeamStats(winnerId, mappedTeams, mappedMatches, currentDate),
      updateSingleTeamStats(loserId, mappedTeams, mappedMatches, currentDate)
    ]);
    
    const success = results.every(result => result === true);
    console.log(`Stats update ${success ? 'completed successfully' : 'had some issues'} for teams: ${winnerId} and ${loserId}`);
    
    return success;
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

    console.log(`Team ${team.name} database record: ${team.wins || 0}W-${team.losses || 0}L`);

    const streak = calculateStreak(teamId, matches);
    const headToHead = calculateHeadToHead(teamId, teams, matches);
    const winPercentage = calculateWinPercentage(team.wins || 0, team.losses || 0);
    const sos = await calculateSOS(team, teams, matches);
    
    const { gamesWon, gamesLost, gameWinPercentage, closeMatchLosses } = calculateGameStats(teamId, matches);
    
    const powerScore = calculatePowerScore(winPercentage, sos, gameWinPercentage);
    
    console.log(`Team ${team.name} (${teamId}) stats calculated:`, {
      wins: team.wins,
      losses: team.losses,
      winPercentage: winPercentage.toFixed(4),
      gamesWon,
      gamesLost,
      gameWinPercentage: gameWinPercentage.toFixed(4),
      powerScore: powerScore.toFixed(2),
      sos: sos.toFixed(4)
    });
    
    const { data: previousStats } = await supabase
      .from('team_stats')
      .select('current_rank')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const previousRank = previousStats && previousStats.length > 0 ? 
      previousStats[0].current_rank : undefined;
    
    const { error: insertError } = await supabase
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
      
    if (insertError) {
      console.error("Error inserting team stats:", insertError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating stats for team ${teamId}:`, error);
    return false;
  }
};
