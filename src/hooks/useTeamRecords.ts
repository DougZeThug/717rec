
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Team, Match } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { calculateStreak } from "@/utils/rankingUtils/calculateStreak";
import { calculateHeadToHead } from "@/utils/rankingUtils/calculateHeadToHead";
import { calculateSOS } from "@/utils/rankingUtils/calculateSOS";
import { calculatePowerScore } from "@/utils/teamDetailsUtils/powerScoreUtils";
import { calculateWinPercentage } from "@/utils/rankingUtils/calculateWinPercentage";

export const useTeamRecords = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getTeamName = (teams: Team[], teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : "Unknown Team";
  };

  const updateTeamRecords = async (winnerId: string, loserId: string, teams: Team[]) => {
    try {
      // Get the current records for both teams
      const { data: winnerData, error: winnerError } = await supabase
        .from('teams')
        .select('wins, losses')
        .eq('id', winnerId)
        .single();
      
      if (winnerError) throw winnerError;
      
      const { data: loserData, error: loserError } = await supabase
        .from('teams')
        .select('wins, losses')
        .eq('id', loserId)
        .single();
      
      if (loserError) throw loserError;
      
      // Update winner's record
      const { error: updateWinnerError } = await supabase
        .from('teams')
        .update({ wins: (winnerData.wins || 0) + 1 })
        .eq('id', winnerId);
      
      if (updateWinnerError) throw updateWinnerError;
      
      // Update loser's record
      const { error: updateLoserError } = await supabase
        .from('teams')
        .update({ losses: (loserData.losses || 0) + 1 })
        .eq('id', loserId);
      
      if (updateLoserError) throw updateLoserError;
      
      // Store the match result in the team_stats table for historical tracking
      await updateTeamStatsRecord(winnerId, loserId);
      
      const winnerName = getTeamName(teams, winnerId);
      const loserName = getTeamName(teams, loserId);
      
      toast({
        title: "Team Records Updated",
        description: `${winnerName} (W) and ${loserName} (L) records have been updated.`,
      });
      
      // Invalidate all relevant queries to ensure data consistency
      invalidateAllDataQueries();
      
      return true;
    } catch (error) {
      console.error("Error updating team records:", error);
      toast({
        title: "Error",
        description: "Failed to update team records. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Save team stats snapshot for historical tracking and calculate derived stats
  const updateTeamStatsRecord = async (winnerId: string, loserId: string) => {
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
        // Convert string array to Player array with the correct structure
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

  // Update stats for a single team
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
      
      // Get previous rank information (would ideally come from past records)
      const { data: previousStats } = await supabase
        .from('team_stats')
        .select('current_rank')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const previousRank = previousStats && previousStats.length > 0 ? 
        previousStats[0].current_rank : undefined;
      
      // Save all calculated stats to the team_stats table
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

  // Helper function to invalidate all related queries
  const invalidateAllDataQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['rankings'] });
    queryClient.invalidateQueries({ queryKey: ['teamStats'] });
    queryClient.invalidateQueries({ queryKey: ['team'] });
    queryClient.invalidateQueries({ queryKey: ['team-matches'] });
  };

  return {
    updateTeamRecords,
    invalidateAllDataQueries
  };
};
