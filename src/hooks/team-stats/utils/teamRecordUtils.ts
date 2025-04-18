import { supabase } from "@/integrations/supabase/client";

export async function applyMatchResult(
  winnerId: string,
  loserId: string,
  winnerGameWins: number,
  loserGameWins: number
) {
  // Convert parameters to numbers to ensure proper math
  const winnerGameWinsNum = Number(winnerGameWins || 0);
  const loserGameWinsNum = Number(loserGameWins || 0);

  console.log(`Updating stats → winner:${winnerId} (+1 W / +${winnerGameWinsNum} GW) loser:${loserId} (+1 L / +${loserGameWinsNum} GL)`);

  try {
    // Use the RPC function for atomic updates to both teams
    const { data, error } = await supabase.rpc('update_team_stats', {
      p_winner_id: winnerId,
      p_loser_id: loserId,
      p_winner_game_wins: winnerGameWinsNum,
      p_loser_game_wins: loserGameWinsNum
    });

    if (error) {
      console.error("❌ update_team_stats RPC failed", error);
      throw error;
    }

    // Fetch the updated team data to log
    const { data: teams } = await supabase
      .from("teams")
      .select("id,name,wins,losses,game_wins,game_losses")
      .in("id", [winnerId, loserId]);

    if (teams && teams.length === 2) {
      const winner = teams.find(t => t.id === winnerId);
      const loser = teams.find(t => t.id === loserId);

      if (winner && loser) {
        console.log("✅ Team stats updated:", {
          winner: {
            team: winner.name || winnerId,
            wins: winner.wins, 
            losses: winner.losses, 
            game_wins: winner.game_wins, 
            game_losses: winner.game_losses
          },
          loser: {
            team: loser.name || loserId,
            wins: loser.wins, 
            losses: loser.losses, 
            game_wins: loser.game_wins, 
            game_losses: loser.game_losses
          }
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error("Failed to update team stats:", error);
    throw error;
  }
}
