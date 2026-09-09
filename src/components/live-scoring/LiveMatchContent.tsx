import React from 'react';

import type { useFinalizeMatch } from '@/hooks/live-scoring/useFinalizeMatch';
import type { useGameFlow } from '@/hooks/live-scoring/useGameFlow';
import type { LiveMatchDerived } from '@/hooks/live-scoring/useLiveMatch';
import type { useRoundMutations } from '@/hooks/live-scoring/useRoundMutations';
import type { useTeamPlayers } from '@/hooks/live-scoring/useTeamPlayers';
import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';

import { ActiveGamePanel } from './ActiveGamePanel';
import { CompletedMatchReview } from './CompletedMatchReview';
import type { GameLine } from './CompleteMatchDialog';
import { MatchDecidedPanel } from './MatchDecidedPanel';
import { NextGameSetupPanel } from './NextGameSetupPanel';

interface LiveMatchContentProps {
  bundle: LiveMatchBundle;
  derived: LiveMatchDerived;
  team1Name: string;
  team2Name: string;
  playerNames: Record<string, string>;
  winnerName: string | null;
  officialWinnerName: string | null;
  gameLines: GameLine[];
  isOfficiallyCompleted: boolean;
  canScore: boolean;
  isAdmin: boolean;
  rulesLabel: string;
  team1Players: ReturnType<typeof useTeamPlayers>;
  team2Players: ReturnType<typeof useTeamPlayers>;
  submitRound: ReturnType<typeof useRoundMutations>['submitRound'];
  undoLastRound: ReturnType<typeof useRoundMutations>['undoLastRound'];
  startGame: ReturnType<typeof useGameFlow>['startGame'];
  confirmGameComplete: ReturnType<typeof useGameFlow>['confirmGameComplete'];
  reopenGame: ReturnType<typeof useGameFlow>['reopenGame'];
  finalize: ReturnType<typeof useFinalizeMatch>['finalize'];
  reopen: ReturnType<typeof useFinalizeMatch>['reopen'];
}

/**
 * Picks the panel for whichever state the match is in: official and reviewed,
 * decided but not yet saved, a game in progress, or waiting for the next game
 * to be set up. Held apart from LiveMatchView so the shell stays a shell.
 */
export const LiveMatchContent: React.FC<LiveMatchContentProps> = ({
  bundle,
  derived,
  team1Name,
  team2Name,
  playerNames,
  winnerName,
  officialWinnerName,
  gameLines,
  isOfficiallyCompleted,
  canScore,
  isAdmin,
  rulesLabel,
  team1Players,
  team2Players,
  submitRound,
  undoLastRound,
  startGame,
  confirmGameComplete,
  reopenGame,
  finalize,
  reopen,
}) => {
  const { match } = bundle;
  const { matchState, currentGame, lastCompletedGame } = derived;

  if (isOfficiallyCompleted) {
    return (
      <CompletedMatchReview
        team1Name={team1Name}
        team2Name={team2Name}
        winnerName={officialWinnerName}
        gameWins={{
          team1: match.team1_game_wins ?? matchState.gameWins.team1,
          team2: match.team2_game_wins ?? matchState.gameWins.team2,
        }}
        games={derived.games}
        rounds={bundle.rounds}
        playerNames={playerNames}
        isAdmin={isAdmin}
        isReopening={reopen.isPending}
        onReopen={() => reopen.mutate()}
        team1Id={match.team1_id}
        team2Id={match.team2_id}
      />
    );
  }

  if (matchState.isComplete) {
    return (
      <MatchDecidedPanel
        team1Name={team1Name}
        team2Name={team2Name}
        winnerName={winnerName}
        gameWins={matchState.gameWins}
        gameLines={gameLines}
        rounds={bundle.rounds}
        playerNames={playerNames}
        canScore={canScore}
        lastCompletedGame={lastCompletedGame}
        isFinalizing={finalize.isPending}
        finalizeError={finalize.isError ? finalize.error : null}
        isReopeningGame={reopenGame.isPending}
        onFinalize={() => finalize.mutate()}
        onReopenGame={(gameId) => reopenGame.mutate(gameId)}
      />
    );
  }

  if (currentGame) {
    return (
      <ActiveGamePanel
        game={currentGame}
        matchId={match.id}
        team1Name={team1Name}
        team2Name={team2Name}
        team1Id={match.team1_id}
        team2Id={match.team2_id}
        playerNames={playerNames}
        canScore={canScore}
        rulesLabel={rulesLabel}
        submitRound={submitRound}
        undoLastRound={undoLastRound}
        confirmGameComplete={confirmGameComplete}
      />
    );
  }

  return (
    <NextGameSetupPanel
      nextGameNumber={matchState.nextGameNumber}
      team1Name={team1Name}
      team2Name={team2Name}
      team1Id={match.team1_id}
      team2Id={match.team2_id}
      team1Players={team1Players}
      team2Players={team2Players}
      previousGame={lastCompletedGame}
      rounds={bundle.rounds}
      playerNames={playerNames}
      canScore={canScore}
      startGame={startGame}
      reopenGame={reopenGame}
    />
  );
};
