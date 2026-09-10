import React, { useState } from 'react';

import type { useGameFlow } from '@/hooks/live-scoring/useGameFlow';
import type { LiveGameDerived } from '@/hooks/live-scoring/useLiveMatch';
import { usePausedRoundCount } from '@/hooks/live-scoring/usePausedRoundCount';
import type { useRoundMutations } from '@/hooks/live-scoring/useRoundMutations';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from '@/hooks/useToast';
import { DuplicateRoundError } from '@/types/errors';

import { GameScoreboard } from './GameScoreboard';
import { GameWonBanner } from './GameWonBanner';
import { LiveScoringControls } from './LiveScoringControls';
import { RoundLog } from './RoundLog';
import type { SavedRound } from './RoundSavedNotice';
import { RoundSavedNotice } from './RoundSavedNotice';
import type { RoundSaveOutcome, RoundSubmission } from './RoundScoreInput';
import { RoundScoreInput } from './RoundScoreInput';
import { SyncStatusNotice } from './SyncStatusNotice';
import { ThrowerBar } from './ThrowerBar';

interface ActiveGamePanelProps {
  game: LiveGameDerived;
  matchId: string;
  team1Name: string;
  team2Name: string;
  team1Id: string | null;
  team2Id: string | null;
  playerNames: Record<string, string>;
  canScore: boolean;
  rulesLabel: string;
  submitRound: ReturnType<typeof useRoundMutations>['submitRound'];
  undoLastRound: ReturnType<typeof useRoundMutations>['undoLastRound'];
  confirmGameComplete: ReturnType<typeof useGameFlow>['confirmGameComplete'];
}

/** Which side is ahead, or null while the totals are level. */
const leaderSide = (totals: { team1: number; team2: number }): 1 | 2 | null => {
  if (totals.team1 === totals.team2) return null;
  return totals.team1 > totals.team2 ? 1 : 2;
};

/**
 * The game in progress: scoreboard, thrower pills, the score grid, undo, and
 * the round history. Lifted out of LiveMatchView, which was carrying this
 * whole screen inside one render function.
 */
export const ActiveGamePanel: React.FC<ActiveGamePanelProps> = ({
  game,
  matchId,
  team1Name,
  team2Name,
  team1Id,
  team2Id,
  playerNames,
  canScore,
  rulesLabel,
  submitRound,
  undoLastRound,
  confirmGameComplete,
}) => {
  // Which thrower the scorer picked, if they overrode the automatic rotation.
  // Keyed by game and round so it clears itself when the round moves on.
  const [throwerOverride, setThrowerOverride] = useState<{
    key: string;
    team1: string | null;
    team2: string | null;
  } | null>(null);

  /** The last round this scorer filed, for the on-screen confirmation. */
  const [savedRound, setSavedRound] = useState<SavedRound | null>(null);

  const isOnline = useOnlineStatus();
  const pausedRounds = usePausedRoundCount(matchId);

  /**
   * A round held for a missing connection stays `isPending` for as long as the
   * signal is gone. Reading that as "saving" would freeze the whole panel — the
   * grids disabled, Undo blocked and the button spinning — for a round that is
   * already filed. Only a save actually on its way counts.
   */
  const isSavingRound = submitRound.isPending && !submitRound.isPaused;

  const overrideKey = `${game.game.id}:${game.nextRoundNumber}`;
  const override = throwerOverride?.key === overrideKey ? throwerOverride : null;
  const team1ThrowerId = override?.team1 ?? game.nextThrowers.team1ThrowerId;
  const team2ThrowerId = override?.team2 ?? game.nextThrowers.team2ThrowerId;

  /** Builds the selectable thrower buttons for one side of the current game. */
  const throwerOptions = (side: 1 | 2) =>
    (side === 1 ? game.players.team1 : game.players.team2).map((gp) => ({
      id: gp.player_id,
      name: playerNames[gp.player_id] ?? 'Player',
    }));

  /**
   * Tells the scorer their kept scores were dropped because the round moved
   * on under them — otherwise the taps would vanish with nothing said.
   */
  const announceDiscardedSelection = () =>
    toast({
      title: 'The round number moved',
      description: `Round ${game.nextRoundNumber} is now next, so your tapped scores were cleared.`,
    });

  const lastRound = game.rounds.length > 0 ? game.rounds[game.rounds.length - 1] : null;
  const gameWon = game.pendingWinnerSide !== null;
  const pendingWinnerName = game.pendingWinnerSide === 1 ? team1Name : team2Name;

  /**
   * Saves the next round using the currently selected throwers. Rejecting
   * tells RoundScoreInput to keep the tapped scores for a retry.
   */
  const handleSubmit = (submission: RoundSubmission): Promise<RoundSaveOutcome> => {
    const roundNumber = game.nextRoundNumber;
    const input = {
      gameId: game.game.id,
      roundNumber,
      team1Score: submission.team1Score,
      team2Score: submission.team2Score,
      team1ThrowerId,
      team2ThrowerId,
      team1Bags: submission.team1Bags,
      team2Bags: submission.team2Bags,
    };

    if (!isOnline) {
      // With no signal the save is parked, and its promise never settles until
      // the connection comes back — so awaiting it would leave the scorer stuck
      // on a round they have already filed. Fire it and say it is queued: the
      // optimistic round is in the log, the round number moves on, and the
      // notice above explains where it went. No "Round N saved": it has not
      // been.
      submitRound.mutate(input);
      return Promise.resolve('queued');
    }

    return (
      submitRound
        .mutateAsync(input)
        // Say so plainly, whatever the realtime channel is doing. A duplicate
        // takes the catch below instead: that round is the other scorer's.
        .then((): RoundSaveOutcome => {
          setSavedRound({ round: roundNumber, at: Date.now() });
          return 'saved';
        })
        .catch((error: unknown): RoundSaveOutcome => {
          // Another scorer already recorded this round, so the tapped scores
          // are stale — resolve and let the grids clear for the next round.
          if (error instanceof DuplicateRoundError) return 'saved';
          throw error;
        })
    );
  };

  const undoLabel = lastRound
    ? `round ${lastRound.round_number} (${lastRound.team1_score}–${lastRound.team2_score})`
    : null;

  return (
    <div className="space-y-3">
      <GameScoreboard
        gameNumber={game.game.game_number}
        team1Name={team1Name}
        team2Name={team2Name}
        totals={game.totals}
        leaderSide={leaderSide(game.totals)}
        rulesLabel={rulesLabel}
      />

      <RoundSavedNotice saved={savedRound} />

      <SyncStatusNotice isOnline={isOnline} pausedCount={pausedRounds} />

      {gameWon && (
        <GameWonBanner
          gameNumber={game.game.game_number}
          winnerName={pendingWinnerName}
          totals={game.totals}
          canScore={canScore}
          isConfirming={confirmGameComplete.isPending}
          onConfirm={() =>
            confirmGameComplete.mutate({
              gameId: game.game.id,
              winnerTeamId: game.pendingWinnerSide === 1 ? (team1Id ?? '') : (team2Id ?? ''),
              finalTotals: game.totals,
            })
          }
        />
      )}

      {/*
        The optimistic round can win the game while the save is still in
        flight. Stay mounted until it settles, so a failure that rolls the
        round back does not take the scorer's tapped scores with it.
      */}
      {canScore && (!gameWon || isSavingRound) && (
        <>
          <ThrowerBar
            team1Label={team1Name}
            team2Label={team2Name}
            team1Options={throwerOptions(1)}
            team2Options={throwerOptions(2)}
            team1ActiveId={team1ThrowerId}
            team2ActiveId={team2ThrowerId}
            onChangeTeam1={(id) =>
              setThrowerOverride({ key: overrideKey, team1: id, team2: override?.team2 ?? null })
            }
            onChangeTeam2={(id) =>
              setThrowerOverride({ key: overrideKey, team1: override?.team1 ?? null, team2: id })
            }
            disabled={isSavingRound}
          />
          <RoundScoreInput
            roundNumber={game.nextRoundNumber}
            team1Name={team1Name}
            team2Name={team2Name}
            gameId={game.game.id}
            onSubmit={handleSubmit}
            roundKey={overrideKey}
            onSelectionDiscarded={announceDiscardedSelection}
            isSubmitting={isSavingRound}
            disabled={undoLastRound.isPending}
          />
        </>
      )}

      {canScore && (
        <LiveScoringControls
          canUndo={lastRound !== null && !isSavingRound}
          isUndoing={undoLastRound.isPending}
          lastRoundLabel={undoLabel}
          onUndo={() =>
            lastRound &&
            undoLastRound.mutate({ gameId: game.game.id, roundNumber: lastRound.round_number })
          }
        />
      )}

      <RoundLog
        rounds={game.rounds}
        team1Name={team1Name}
        team2Name={team2Name}
        playerNames={playerNames}
      />
    </div>
  );
};
