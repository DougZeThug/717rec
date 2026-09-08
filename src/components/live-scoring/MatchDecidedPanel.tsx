import React from 'react';

import type { LiveGameDerived } from '@/hooks/live-scoring/useLiveMatch';
import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';

import { CompleteMatchDialog, type GameLine } from './CompleteMatchDialog';
import { ReopenGameButton } from './ReopenGameButton';
import { RoundLog } from './RoundLog';

interface MatchDecidedPanelProps {
  team1Name: string;
  team2Name: string;
  winnerName: string | null;
  gameWins: { team1: number; team2: number };
  gameLines: GameLine[];
  rounds: LiveMatchBundle['rounds'];
  playerNames: Record<string, string>;
  canScore: boolean;
  lastCompletedGame: LiveGameDerived | null;
  isFinalizing: boolean;
  finalizeError: Error | null;
  isReopeningGame: boolean;
  onFinalize: () => void;
  onReopenGame: (gameId: string) => void;
}

/**
 * A match that has been won on the scoreboard but not yet saved as official —
 * the point of no return, plus the way back out of it.
 */
export const MatchDecidedPanel: React.FC<MatchDecidedPanelProps> = ({
  team1Name,
  team2Name,
  winnerName,
  gameWins,
  gameLines,
  rounds,
  playerNames,
  canScore,
  lastCompletedGame,
  isFinalizing,
  finalizeError,
  isReopeningGame,
  onFinalize,
  onReopenGame,
}) => (
  <div className="space-y-3">
    <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-center">
      <h2 className="text-base font-semibold">
        {winnerName} wins the match {gameWins.team1}–{gameWins.team2}
      </h2>
      <p className="text-xs text-muted-foreground">
        Save the official result to update standings and team records.
      </p>
    </div>
    {canScore && (
      <CompleteMatchDialog
        team1Name={team1Name}
        team2Name={team2Name}
        winnerName={winnerName ?? ''}
        gameWins={gameWins}
        gameLines={gameLines}
        isFinalizing={isFinalizing}
        finalizeError={finalizeError}
        onConfirm={onFinalize}
      />
    )}
    {canScore && lastCompletedGame && (
      <ReopenGameButton
        gameNumber={lastCompletedGame.game.game_number}
        isPending={isReopeningGame}
        onReopen={() => onReopenGame(lastCompletedGame.game.id)}
      />
    )}
    <RoundLog
      rounds={rounds}
      team1Name={team1Name}
      team2Name={team2Name}
      playerNames={playerNames}
    />
  </div>
);
