
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
    
    console.log(`Starting stat updates for winner: ${winnerId}, loser: ${loserId}`);
    
    // Get all matches to calculate complete stats
    const { data: allMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('iscompleted', true);

    if (matchesError) {
      console.error("Error fetching matches:", matchesError);
      throw matchesError;
    }

    console.log(`Found ${allMatches?.length || 0} completed matches for stats calculation`);
    
    // Get all teams to calculate SOS and other stats
    const { data: allTeams, error: teamsError } = await supabase
      .from('teams')
      .select('*, divisions(name, division_weight)');
      
    if (teamsError) {
      console.error("Error fetching teams:", teamsError);
      throw teamsError;
    }

    console.log(`Found ${allTeams?.length || 0} teams for stats calculation`);

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

    // Log the match details for debugging
    console.log("Match details for processing:");
    mappedMatches.forEach(match => {
      if (match.winnerId === winnerId || match.loserId === loserId) {
        console.log(`Match ${match.id}: Team1 (${match.team1Id}): ${match.team1Score}, Team2 (${match.team2Id}): ${match.team2Score}, Winner: ${match.winnerId}, Loser: ${match.loserId}, Completed: ${match.iscompleted}`);
      }
    });

    // Process both winner and loser stats
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

    // Output the current team record from database
    console.log(`Team ${team.name} database record: ${team.wins || 0}W-${team.losses || 0}L`);

    // Calculate basic stats
    const streak = calculateStreak(teamId, matches);
    const headToHead = calculateHeadToHead(teamId, teams, matches);
    const winPercentage = calculateWinPercentage(team.wins || 0, team.losses || 0);
    const sos = await calculateSOS(team, teams, matches);
    
    // Calculate game stats
    const { gamesWon, gamesLost, gameWinPercentage, closeMatchLosses } = calculateGameStats(teamId, matches);
    
    // Calculate power score
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
