import { updateTeamWinLossRecord } from '@/services/teams/TeamUpdateService';
import { handleDatabaseError } from '@/utils/errorHandler';
import { dbLog } from '@/utils/logger';

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
  currentGameLosses,
}: UpdateTeamRecordParams) => {
  // Calculate new values
  // Match win/loss is binary (0 or 1), while game wins/losses are the actual scores
  const newWins = currentWins + (isWinner ? 1 : 0);
  const newLosses = currentLosses + (isWinner ? 0 : 1);
  const newGameWins = currentGameWins + gameWins;
  const newGameLosses = currentGameLosses + gameLosses;

  dbLog(`Updating ${isWinner ? 'winner' : 'loser'} team ${teamId}:`);
  dbLog(`Match record: ${currentWins}-${currentLosses} → ${newWins}-${newLosses}`);
  dbLog(`Game stats: ${currentGameWins}-${currentGameLosses} → ${newGameWins}-${newGameLosses}`);
  dbLog('Game stats details:', {
    teamId: teamId,
    game_wins: gameWins,
    game_losses: gameLosses,
  });

  await updateTeamWinLossRecord(teamId, {
    wins: newWins,
    losses: newLosses,
    game_wins: newGameWins,
    game_losses: newGameLosses,
  });

  return true;
};
