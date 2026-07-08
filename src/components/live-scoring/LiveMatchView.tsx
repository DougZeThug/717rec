import { RotateCcw } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useFinalizeMatch } from '@/hooks/live-scoring/useFinalizeMatch';
import { useGameFlow } from '@/hooks/live-scoring/useGameFlow';
import type { LiveGameDerived, LiveMatchDerived } from '@/hooks/live-scoring/useLiveMatch';
import { useRoundMutations } from '@/hooks/live-scoring/useRoundMutations';
import { useTeamPlayers } from '@/hooks/live-scoring/useTeamPlayers';
import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';
import { DEFAULT_GAME_RULES } from '@/utils/liveScoring/rules';

import { CompletedMatchReview } from './CompletedMatchReview';
import type { GameLine } from './CompleteMatchDialog';
import { CompleteMatchDialog } from './CompleteMatchDialog';
import { GameScoreboard } from './GameScoreboard';
import { GameSetupPanel } from './GameSetupPanel';
import { GameWonBanner } from './GameWonBanner';
import { LiveScoringControls } from './LiveScoringControls';
import { MatchScoringHeader } from './MatchScoringHeader';
import { RoundLog } from './RoundLog';
import type { RoundSubmission } from './RoundScoreInput';
import { RoundScoreInput } from './RoundScoreInput';
import { ThrowerBar } from './ThrowerBar';

interface LiveMatchViewProps {
  matchId: string;
  bundle: LiveMatchBundle;
  derived: LiveMatchDerived;
  canScore: boolean;
  isAdmin: boolean;
  realtimeStatus: string;
}

const RULES_LABEL = `First to ${DEFAULT_GAME_RULES.targetScore}, win by ${DEFAULT_GAME_RULES.winBy}`;

export const LiveMatchView: React.FC<LiveMatchViewProps> = ({
  matchId,
  bundle,
  derived,
  canScore,
  isAdmin,
  realtimeStatus,
}) => {
  const { match } = bundle;
  const team1Name = match.team1?.name ?? 'Team 1';
  const team2Name = match.team2?.name ?? 'Team 2';

  const team1Players = useTeamPlayers(match.team1_id ?? undefined);
  const team2Players = useTeamPlayers(match.team2_id ?? undefined);
  const { submitRound, undoLastRound } = useRoundMutations(matchId);
  const { startGame, confirmGameComplete, reopenGame } = useGameFlow(matchId);
  const { finalize, reopen } = useFinalizeMatch(matchId);

  // Scorer's manual thrower override for the upcoming round; superseded once
  // that round is saved (the key no longer matches the next round).
  const [throwerOverride, setThrowerOverride] = useState<{
    key: string;
    team1: string | null;
    team2: string | null;
  } | null>(null);

  const playerNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const p of [...team1Players.players, ...team2Players.players]) {
      names[p.id] = p.display_name;
    }
    return names;
  }, [team1Players.players, team2Players.players]);

  const { matchState, currentGame, lastCompletedGame } = derived;
  const isOfficiallyCompleted = match.iscompleted === true;

  const winnerName =
    matchState.matchWinner === 1 ? team1Name : matchState.matchWinner === 2 ? team2Name : null;
  const officialWinnerName =
    match.winner_id === match.team1_id
      ? team1Name
      : match.winner_id === match.team2_id
        ? team2Name
        : winnerName;

  const gameLines: GameLine[] = derived.games
    .filter((g) => g.game.status === 'completed')
    .map((g) => ({
      gameNumber: g.game.game_number,
      team1Total: g.totals.team1,
      team2Total: g.totals.team2,
      winnerName: g.game.winner_team_id === match.team1_id ? team1Name : team2Name,
    }));

  const renderScoring = (game: LiveGameDerived) => {
    const overrideKey = `${game.game.id}:${game.nextRoundNumber}`;
    const override = throwerOverride?.key === overrideKey ? throwerOverride : null;
    const team1ThrowerId = override?.team1 ?? game.nextThrowers.team1ThrowerId;
    const team2ThrowerId = override?.team2 ?? game.nextThrowers.team2ThrowerId;

    const throwerOptions = (side: 1 | 2) =>
      (side === 1 ? game.players.team1 : game.players.team2).map((gp) => ({
        id: gp.player_id,
        name: playerNames[gp.player_id] ?? 'Player',
      }));

    const lastRound = game.rounds.length > 0 ? game.rounds[game.rounds.length - 1] : null;
    const gameWon = game.pendingWinnerSide !== null;
    const pendingWinnerName = game.pendingWinnerSide === 1 ? team1Name : team2Name;

    const handleSubmit = (submission: RoundSubmission) => {
      submitRound.mutate({
        gameId: game.game.id,
        roundNumber: game.nextRoundNumber,
        team1Score: submission.team1Score,
        team2Score: submission.team2Score,
        team1ThrowerId,
        team2ThrowerId,
        team1Bags: submission.team1Bags,
        team2Bags: submission.team2Bags,
      });
    };

    return (
      <div className="space-y-3">
        <GameScoreboard
          gameNumber={game.game.game_number}
          team1Name={team1Name}
          team2Name={team2Name}
          totals={game.totals}
          leaderSide={
            game.totals.team1 === game.totals.team2
              ? null
              : game.totals.team1 > game.totals.team2
                ? 1
                : 2
          }
          rulesLabel={RULES_LABEL}
        />

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
                winnerTeamId:
                  game.pendingWinnerSide === 1 ? (match.team1_id ?? '') : (match.team2_id ?? ''),
                finalTotals: game.totals,
              })
            }
          />
        )}

        {canScore && !gameWon && (
          <>
            <ThrowerBar
              team1Label={team1Name}
              team2Label={team2Name}
              team1Options={throwerOptions(1)}
              team2Options={throwerOptions(2)}
              team1ActiveId={team1ThrowerId}
              team2ActiveId={team2ThrowerId}
              onChangeTeam1={(id) =>
                setThrowerOverride({
                  key: overrideKey,
                  team1: id,
                  team2: override?.team2 ?? null,
                })
              }
              onChangeTeam2={(id) =>
                setThrowerOverride({
                  key: overrideKey,
                  team1: override?.team1 ?? null,
                  team2: id,
                })
              }
              disabled={submitRound.isPending}
            />
            <RoundScoreInput
              roundNumber={game.nextRoundNumber}
              team1Name={team1Name}
              team2Name={team2Name}
              onSubmit={handleSubmit}
              isSubmitting={submitRound.isPending}
            />
          </>
        )}

        {canScore && (
          <LiveScoringControls
            canUndo={lastRound !== null}
            isUndoing={undoLastRound.isPending}
            lastRoundLabel={
              lastRound
                ? `round ${lastRound.round_number} (${lastRound.team1_score}–${lastRound.team2_score})`
                : null
            }
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

  const renderSetup = () => {
    if (matchState.nextGameNumber === null) return null;
    const previous = lastCompletedGame;
    return (
      <div className="space-y-3">
        <GameSetupPanel
          key={`setup-game-${matchState.nextGameNumber}`}
          gameNumber={matchState.nextGameNumber}
          team1Name={team1Name}
          team2Name={team2Name}
          team1Roster={team1Players.players}
          team2Roster={team2Players.players}
          initialTeam1Ids={previous?.players.team1.map((gp) => gp.player_id) ?? []}
          initialTeam2Ids={previous?.players.team2.map((gp) => gp.player_id) ?? []}
          canScore={canScore}
          isStarting={startGame.isPending}
          onStart={(team1Ids, team2Ids) =>
            startGame.mutate({
              gameNumber: matchState.nextGameNumber!,
              team1Id: match.team1_id ?? '',
              team2Id: match.team2_id ?? '',
              team1PlayerIds: team1Ids,
              team2PlayerIds: team2Ids,
            })
          }
          onAddTeam1Player={(name) => team1Players.addPlayer.mutate(name)}
          onAddTeam2Player={(name) => team2Players.addPlayer.mutate(name)}
          isAddingTeam1Player={team1Players.addPlayer.isPending}
          isAddingTeam2Player={team2Players.addPlayer.isPending}
        />
        {canScore && previous && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-muted-foreground"
            disabled={reopenGame.isPending}
            onClick={() => reopenGame.mutate(previous.game.id)}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Reopen Game {previous.game.game_number} to fix a score
          </Button>
        )}
      </div>
    );
  };

  const renderDecided = () => (
    <div className="space-y-3">
      <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-center">
        <h2 className="text-base font-semibold">
          {winnerName} wins the match {matchState.gameWins.team1}–{matchState.gameWins.team2}
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
          gameWins={matchState.gameWins}
          gameLines={gameLines}
          isFinalizing={finalize.isPending}
          onConfirm={() => finalize.mutate()}
        />
      )}
      {canScore && lastCompletedGame && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-muted-foreground"
          disabled={reopenGame.isPending}
          onClick={() => reopenGame.mutate(lastCompletedGame.game.id)}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reopen Game {lastCompletedGame.game.game_number} to fix a score
        </Button>
      )}
      <RoundLog
        rounds={bundle.rounds}
        team1Name={team1Name}
        team2Name={team2Name}
        playerNames={playerNames}
      />
    </div>
  );

  let content: React.ReactNode;
  if (isOfficiallyCompleted) {
    content = (
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
      />
    );
  } else if (matchState.isComplete) {
    content = renderDecided();
  } else if (currentGame) {
    content = renderScoring(currentGame);
  } else {
    content = renderSetup();
  }

  return (
    <div className="space-y-3">
      <MatchScoringHeader
        team1Name={team1Name}
        team2Name={team2Name}
        team1Logo={match.team1?.logo_url ?? match.team1?.image_url ?? null}
        team2Logo={match.team2?.logo_url ?? match.team2?.image_url ?? null}
        gameWins={
          isOfficiallyCompleted
            ? {
                team1: match.team1_game_wins ?? 0,
                team2: match.team2_game_wins ?? 0,
              }
            : matchState.gameWins
        }
        canScore={canScore}
        realtimeStatus={realtimeStatus}
      />
      {content}
    </div>
  );
};
