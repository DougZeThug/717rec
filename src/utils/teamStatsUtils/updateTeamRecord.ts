
import { supabase } from "@/integrations/supabase/client";

interface UpdateTeamRecordParams {
  teamId: string;
  isWinner: boolean;
  gameWins: number;
  gameLosses: number;
  currentWins: number;
  currentLosses: number;
  currentGameWins: number;
  currentGameLosses: number;
}

export const updateTeamRecord = async ({
  teamId,
  isWinner,
  gameWins,
  gameLosses,
  currentWins,
  currentLosses,
  currentGameWins,
  currentGameLosses
}: UpdateTeamRecordParams) => {
  // Calculate new values
  const newWins = currentWins + (isWinner ? 1 : 0);
  const newLosses = currentLosses + (isWinner ? 0 : 1);
  const newGameWins = currentGameWins + gameWins;
  const newGameLosses = currentGameLosses + gameLosses;
  
  console.log(`Updating ${isWinner ? 'winner' : 'loser'} team ${teamId}:`);
  console.log(`Match record: ${currentWins}-${currentLosses} → ${newWins}-${newLosses}`);
  console.log(`Game stats: ${currentGameWins}-${currentGameLosses} → ${newGameWins}-${newGameLosses}`);
  
  const { error, data } = await supabase
    .from('teams')
    .update({ 
      wins: newWins,
      losses: newLosses,
      game_wins: newGameWins,
      game_losses: newGameLosses
    })
    .eq('id', teamId)
    .select();
    
  if (error || !data?.length) {
    console.error(`CRITICAL ERROR updating ${isWinner ? 'winner' : 'loser'} record:`, error);
    return false;
  }
  
  return true;
};
