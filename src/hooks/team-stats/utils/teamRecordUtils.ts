
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
    .select("id,wins,losses,game_wins,game_losses")
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
  const { error: wErr } = await supabase
    .from("teams")
    .update(winnerUpdate)
    .eq("id", winnerId);

  const { error: lErr } = await supabase
    .from("teams")
    .update(loserUpdate)
    .eq("id", loserId);

  if (wErr || lErr) {
    console.error("❌ update failed", { wErr, lErr });
    throw wErr || lErr;
  }

  /* ───── done ───── */
  console.log("✅ Team records updated successfully", {
    winner: winnerUpdate,
    loser: loserUpdate
  });
  
  return true;
}
