
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Team } from "@/types";

export const useTeamWinLossUpdate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Updates team records for match results and game wins/losses
   * @param winnerId The ID of the team that won the match
   * @param loserId The ID of the team that lost the match
   * @param teams Array of team data objects
   * @param winnerGameWins Number of games won by winner in the match
   * @param loserGameWins Number of games won by loser in the match
   */
  const updateTeamRecords = async (
    winnerId: string, 
    loserId: string, 
    teams: Team[], 
    winnerGameWins: number = 0, 
    loserGameWins: number = 0
  ) => {
    try {
      console.log(`---TEAM RECORD UPDATE STARTED---`);
      console.log(`Match result: Winner: ${winnerId}, Loser: ${loserId}`);
      console.log(`Games - Winner won: ${winnerGameWins}, Loser won: ${loserGameWins}`);
      
      // First, let's verify the teams exist and get their current records
      const { data: winnerTeam, error: winnerFetchError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', winnerId)
        .maybeSingle();
      
      if (winnerFetchError || !winnerTeam) {
        console.error("ERROR FETCHING WINNER:", winnerFetchError || "No winner found with ID: " + winnerId);
        return false;
      }
      
      const { data: loserTeam, error: loserFetchError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', loserId)
        .maybeSingle();
      
      if (loserFetchError || !loserTeam) {
        console.error("ERROR FETCHING LOSER:", loserFetchError || "No loser found with ID: " + loserId);
        return false;
      }
      
      console.log("Winner team before update:", winnerTeam);
      console.log("Loser team before update:", loserTeam);
      
      // Parse and ensure we're working with numbers for all values
      // IMPORTANT: Match wins/losses are separate from game wins/losses
      const currentWinnerWins = parseInt(String(winnerTeam.wins ?? 0));
      const currentLoserLosses = parseInt(String(loserTeam.losses ?? 0));
      const currentWinnerGameWins = parseInt(String(winnerTeam.game_wins ?? 0));
      const currentLoserGameWins = parseInt(String(loserTeam.game_wins ?? 0));
      const currentWinnerGameLosses = parseInt(String(winnerTeam.game_losses ?? 0));
      const currentLoserGameLosses = parseInt(String(loserTeam.game_losses ?? 0));
      
      console.log(`BEFORE UPDATE - Winner ${winnerTeam.name}:`);
      console.log(`Match record: ${currentWinnerWins} wins`);
      console.log(`Game stats: ${currentWinnerGameWins} wins, ${currentWinnerGameLosses} losses`);
      
      console.log(`BEFORE UPDATE - Loser ${loserTeam.name}:`);
      console.log(`Match record: ${currentLoserLosses} losses`);
      console.log(`Game stats: ${currentLoserGameWins} wins, ${currentLoserGameLosses} losses`);
      
      if (isNaN(currentWinnerWins) || isNaN(currentLoserLosses) || 
          isNaN(currentWinnerGameWins) || isNaN(currentLoserGameWins)) {
        console.error("ERROR: Invalid win/loss/game values detected");
        return false;
      }
      
      // CRITICAL FIX: Always add exactly 1 win or 1 loss per match
      // Match outcome: Winner gets exactly 1 win, loser gets exactly 1 loss
      const newWinnerWins = currentWinnerWins + 1; // Exactly +1 for winning the match
      const newLoserLosses = currentLoserLosses + 1; // Exactly +1 for losing the match
      
      // Game-level stats: Update with the actual games won/lost in this match
      const newWinnerGameWins = currentWinnerGameWins + winnerGameWins;
      const newLoserGameWins = currentLoserGameWins + loserGameWins;
      const newWinnerGameLosses = currentWinnerGameLosses + loserGameWins;
      const newLoserGameLosses = currentLoserGameLosses + winnerGameWins;
      
      console.log("Match Result - Winner:", { 
        teamId: winnerId,
        isWinner: true,
        teamScore: winnerGameWins,
        opponentScore: loserGameWins 
      });
      
      console.log("Updating winner with:", {
        wins: 1, // Always exactly 1 win per match
        losses: 0, // No change to losses
        game_wins: winnerGameWins,
        game_losses: loserGameWins
      });
      
      console.log(`Updating winner ${winnerTeam.name} (${winnerId})`);
      console.log(`Match wins: ${currentWinnerWins} -> ${newWinnerWins}`);
      console.log(`Game wins: ${currentWinnerGameWins} -> ${newWinnerGameWins}`);
      console.log(`Game losses: ${currentWinnerGameLosses} -> ${newWinnerGameLosses}`);
      
      // Update winner's records
      const winnerUpdateResult = await supabase
        .from('teams')
        .update({ 
          wins: newWinnerWins, // ONLY match wins counted here - exactly +1
          game_wins: newWinnerGameWins,
          game_losses: newWinnerGameLosses
        })
        .eq('id', winnerId)
        .select();
      
      if (winnerUpdateResult.error || !winnerUpdateResult.data?.length) {
        console.error("CRITICAL ERROR updating winner record:", winnerUpdateResult.error);
        return false;
      }
      
      console.log(`Winner ${winnerTeam.name} updated successfully`);
      
      // Update loser's records
      console.log("Match Result - Loser:", { 
        teamId: loserId,
        isWinner: false,
        teamScore: loserGameWins,
        opponentScore: winnerGameWins 
      });
      
      console.log("Updating loser with:", {
        wins: 0, // No change to wins
        losses: 1, // Always exactly 1 loss per match
        game_wins: loserGameWins,
        game_losses: winnerGameWins
      });
      
      console.log(`Updating loser ${loserTeam.name} (${loserId})`);
      console.log(`Match losses: ${currentLoserLosses} -> ${newLoserLosses}`);
      console.log(`Game wins: ${currentLoserGameWins} -> ${newLoserGameWins}`);
      console.log(`Game losses: ${currentLoserGameLosses} -> ${newLoserGameLosses}`);
      
      const loserUpdateResult = await supabase
        .from('teams')
        .update({ 
          losses: newLoserLosses, // ONLY match losses counted here - exactly +1
          game_wins: newLoserGameWins,
          game_losses: newLoserGameLosses
        })
        .eq('id', loserId)
        .select();
      
      if (loserUpdateResult.error || !loserUpdateResult.data?.length) {
        console.error("CRITICAL ERROR updating loser record:", loserUpdateResult.error);
        return false;
      }
      
      console.log(`Loser ${loserTeam.name} updated successfully`);
      
      // Verify the updates by fetching the updated records
      const { data: updatedWinnerData } = await supabase
        .from('teams')
        .select('wins, losses, game_wins, game_losses, name')
        .eq('id', winnerId)
        .single();
        
      const { data: updatedLoserData } = await supabase
        .from('teams')
        .select('wins, losses, game_wins, game_losses, name')
        .eq('id', loserId)
        .single();
        
      if (updatedWinnerData && updatedLoserData) {
        console.log(`AFTER UPDATE - Winner ${updatedWinnerData.name}:`);
        console.log(`Match record: ${updatedWinnerData.wins}W-${updatedWinnerData.losses}L`);
        console.log(`Game record: ${updatedWinnerData.game_wins}W-${updatedWinnerData.game_losses}L`);
        
        console.log(`AFTER UPDATE - Loser ${updatedLoserData.name}:`);
        console.log(`Match record: ${updatedLoserData.wins}W-${updatedLoserData.losses}L`);
        console.log(`Game record: ${updatedLoserData.game_wins}W-${updatedLoserData.game_losses}L`);
      }
      
      // Immediately invalidate caches to update UI
      console.log("Invalidating query caches to ensure UI updates...");
      const queriesToInvalidate = [
        'rankings', 'teams', 'matches', 'teamStats', 'team', 'team-matches'
      ];
      
      for (const queryKey of queriesToInvalidate) {
        await queryClient.invalidateQueries({ queryKey: [queryKey] });
        console.log(`Invalidated query cache for ${queryKey}`);
      }
      
      console.log(`---TEAM RECORD UPDATE COMPLETED SUCCESSFULLY---`);
      return true;
    } catch (error) {
      console.error("---TEAM RECORD UPDATE FAILED---");
      console.error("Error updating team records:", error);
      toast({
        title: "Error",
        description: "Failed to update team records. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  return { updateTeamRecords };
};
