
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTeamRecords } from "@/hooks/useTeamRecords";
import { useQueryClient } from "@tanstack/react-query";
import { Team } from "@/types";

export const useMatchSubmission = () => {
  const { toast } = useToast();
  const { updateTeamRecords } = useTeamRecords();
  const queryClient = useQueryClient();

  const handleSubmitScore = async (matchId: string, team1Score: number, team2Score: number, team1GameWins?: number, team2GameWins?: number) => {
    try {
      let winnerId: string | null = null;
      let loserId: string | null = null;
      
      // Fetch the match data to get team IDs
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();
        
      if (matchError) throw matchError;

      console.log(`[useMatchSubmission] Match ${matchId} data:`, matchData);
      console.log(`[useMatchSubmission] Scores - Team1: ${team1Score}, Team2: ${team2Score}`);

      // Determine winner and loser
      if (team1Score > team2Score) {
        winnerId = matchData.team1_id;
        loserId = matchData.team2_id;
      } else if (team2Score > team1Score) {
        winnerId = matchData.team2_id;
        loserId = matchData.team1_id;
      }

      console.log(`[useMatchSubmission] Winner ID: ${winnerId}, Loser ID: ${loserId}`);

      // Update the match with game level details if provided
      const updateData: any = {
        team1_score: team1Score,
        team2_score: team2Score,
        iscompleted: true,
        winner_id: winnerId,
        loser_id: loserId
      };

      // Add game wins if provided
      if (team1GameWins !== undefined) updateData.team1_game_wins = team1GameWins;
      if (team2GameWins !== undefined) updateData.team2_game_wins = team2GameWins;

      const { error, data: updatedMatch } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) throw error;

      console.log(`[useMatchSubmission] Match ${matchId} updated successfully:`, updatedMatch);

      // If we have both winner and loser, update team records
      if (winnerId && loserId) {
        // First fetch full teams data to satisfy the Team type
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', [winnerId, loserId]);
          
        if (teamsError) {
          console.error("[useMatchSubmission] Error fetching team data:", teamsError);
          throw teamsError;
        }
          
        if (teamsData && teamsData.length > 0) {
          console.log(`[useMatchSubmission] Found ${teamsData.length} teams for W/L update:`, 
            teamsData.map(t => ({ id: t.id, name: t.name, wins: t.wins, losses: t.losses })));
          
          // Transform to proper Team objects
          const formattedTeams: Team[] = teamsData.map(team => ({
            id: team.id,
            name: team.name,
            logoUrl: team.logo_url || null,
            imageUrl: team.image_url || null,
            players: Array.isArray(team.players) 
              ? team.players.map((playerName: string) => ({ name: playerName })) 
              : [],
            wins: team.wins || 0,
            losses: team.losses || 0,
            created_at: team.created_at || '',
            division: team.division_id || null,
            divisionName: null
          }));
          
          console.log("[useMatchSubmission] Formatted teams for update:", 
            formattedTeams.map(t => ({ id: t.id, name: t.name, wins: t.wins, losses: t.losses })));
            
          const updateSuccess = await updateTeamRecords(winnerId, loserId, formattedTeams);
          console.log(`[useMatchSubmission] Team records update ${updateSuccess ? 'succeeded' : 'failed'}`);
        } else {
          console.error("[useMatchSubmission] Could not find team data for winner/loser");
        }
      }

      toast({
        title: 'Scores Updated',
        description: 'Match scores have been successfully updated and team records are now current.',
      });
      
      // Invalidate relevant queries to ensure fresh data
      const queriesToInvalidate = [
        'rankings', 'teams', 'matches', 'teamStats', 'team', 'team-matches'
      ];
      
      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      
      return true;
    } catch (error) {
      console.error('[useMatchSubmission] Error updating scores:', error);
      toast({
        title: 'Error',
        description: 'Failed to update scores. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { handleSubmitScore };
};
