
import { supabase } from "@/integrations/supabase/client";

export async function applyMatchResult(
  winnerId: string,
  loserId: string,
  winnerGameWins: number,
  loserGameWins: number
) {
  /* ───── fetch current numbers for both teams ───── */
  const { data: teams, error: fetchErr } = await supabase
    .from("teams")
    .select("id,wins,losses,game_wins,game_losses,name")  // Add 'name' to the select
    .in("id", [winnerId, loserId]);

  if (fetchErr || !teams?.length) {
    console.error("❌ fetch teams failed", fetchErr);
    throw fetchErr;
  }

  const winner = teams.find(t => t.id === winnerId)!;
  const loser = teams.find(t => t.id === loserId)!;

  /* ───── compute new counts ───── */
  const winnerUpdate = {
    wins: (winner.wins ?? 0) + 1,
    losses: (winner.losses ?? 0),
    game_wins: (winner.game_wins ?? 0) + winnerGameWins,
    game_losses: (winner.game_losses ?? 0) + loserGameWins,
  };

  const loserUpdate = {
    wins: (loser.wins ?? 0),
    losses: (loser.losses ?? 0) + 1,
    game_wins: (loser.game_wins ?? 0) + loserGameWins,
    game_losses: (loser.game_losses ?? 0) + winnerGameWins,
  };

  /* ───── persist ───── */
  // Use Promise.all to update both teams simultaneously
  const [winnerResult, loserResult] = await Promise.all([
    supabase
      .from("teams")
      .update(winnerUpdate)
      .eq("id", winnerId),
    supabase
      .from("teams")
      .update(loserUpdate)
      .eq("id", loserId)
  ]);

  const wErr = winnerResult.error;
  const lErr = loserResult.error;

  if (wErr || lErr) {
    console.error("❌ update failed", { wErr, lErr });
    throw wErr || lErr;
  }

  /* ───── done ───── */
  console.log("✅ Team stats updated:", {
    winner: {
      team: winner.name || winnerId,  // Use name if available, fallback to ID
      wins: winnerUpdate.wins, 
      losses: winnerUpdate.losses, 
      game_wins: winnerUpdate.game_wins, 
      game_losses: winnerUpdate.game_losses
    },
    loser: {
      team: loser.name || loserId,  // Use name if available, fallback to ID
      wins: loserUpdate.wins, 
      losses: loserUpdate.losses, 
      game_wins: loserUpdate.game_wins, 
      game_losses: loserUpdate.game_losses
    }
  });
  
  return true;
}
