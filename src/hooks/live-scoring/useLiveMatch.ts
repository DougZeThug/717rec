import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { GamePlayerRow, LiveGameRow, MatchRoundRow } from '@/services/liveScoring/dbTypes';
import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';
import { LiveMatchService } from '@/services/liveScoring/LiveMatchService';
import { LiveScoringNotEnabledError } from '@/types/errors';
import type { MatchState } from '@/utils/liveScoring/bestOfThree';
import { deriveMatchState, nextRoundNumber } from '@/utils/liveScoring/bestOfThree';
import { foldGameTotals } from '@/utils/liveScoring/scoring';
import { deriveNextThrowers } from '@/utils/liveScoring/throwerRotation';
import type { GameSummary, RoundRecord, TeamSide } from '@/utils/liveScoring/types';
import { checkGameWinner } from '@/utils/liveScoring/winnerDetection';

import { liveScoringKeys } from './liveScoringKeys';

export interface LiveGameDerived {
  game: LiveGameRow;
  rounds: MatchRoundRow[];
  totals: { team1: number; team2: number };
  /** Winner by the fold + game rules — set while the game is still open. */
  pendingWinnerSide: TeamSide | null;
  players: { team1: GamePlayerRow[]; team2: GamePlayerRow[] };
  nextRoundNumber: number;
  nextThrowers: { team1ThrowerId: string | null; team2ThrowerId: string | null };
}

export interface LiveMatchDerived {
  games: LiveGameDerived[];
  matchState: MatchState;
  /** The open game being scored right now, if any. */
  currentGame: LiveGameDerived | null;
  lastCompletedGame: LiveGameDerived | null;
}

function winnerSideOf(game: LiveGameRow, bundle: LiveMatchBundle): TeamSide | null {
  if (!game.winner_team_id) return null;
  if (game.winner_team_id === bundle.match.team1_id) return 1;
  if (game.winner_team_id === bundle.match.team2_id) return 2;
  return null;
}

function toRoundRecords(rounds: MatchRoundRow[]): RoundRecord[] {
  return rounds.map((r) => ({
    roundNumber: r.round_number,
    team1: r.team1_score,
    team2: r.team2_score,
    team1ThrowerId: r.team1_thrower_id,
    team2ThrowerId: r.team2_thrower_id,
  }));
}

export function deriveLiveMatch(bundle: LiveMatchBundle): LiveMatchDerived {
  const games = [...bundle.games]
    .sort((a, b) => a.game_number - b.game_number)
    .map((game) => {
      const rounds = bundle.rounds
        .filter((r) => r.game_id === game.id)
        .sort((a, b) => a.round_number - b.round_number);
      const roundRecords = toRoundRecords(rounds);
      const totals = foldGameTotals(roundRecords);
      const players = {
        team1: bundle.gamePlayers.filter(
          (gp) => gp.game_id === game.id && gp.team_id === bundle.match.team1_id
        ),
        team2: bundle.gamePlayers.filter(
          (gp) => gp.game_id === game.id && gp.team_id === bundle.match.team2_id
        ),
      };
      return {
        game,
        rounds,
        totals,
        pendingWinnerSide: checkGameWinner(totals.team1, totals.team2),
        players,
        nextRoundNumber: nextRoundNumber(roundRecords),
        nextThrowers: deriveNextThrowers(roundRecords, {
          team1: players.team1.map((gp) => gp.player_id),
          team2: players.team2.map((gp) => gp.player_id),
        }),
      };
    });

  const summaries: GameSummary[] = games.map((g) => ({
    gameNumber: g.game.game_number,
    status: g.game.status,
    winnerSide: winnerSideOf(g.game, bundle),
  }));

  const inProgress = games.filter((g) => g.game.status === 'in_progress');
  const completed = games.filter((g) => g.game.status === 'completed');

  return {
    games,
    matchState: deriveMatchState(summaries),
    currentGame: inProgress.length > 0 ? inProgress[inProgress.length - 1] : null,
    lastCompletedGame: completed.length > 0 ? completed[completed.length - 1] : null,
  };
}

export function useLiveMatch(matchId: string | undefined) {
  const query = useQuery({
    queryKey: liveScoringKeys.liveMatch(matchId ?? ''),
    queryFn: () => LiveMatchService.fetchLiveMatchBundle(matchId!),
    enabled: !!matchId,
    // Realtime invalidation keeps this fresh; keep staleTime short as a backstop.
    staleTime: 15_000,
    retry: (failureCount, error) =>
      !(error instanceof LiveScoringNotEnabledError) && failureCount < 1,
  });

  const derived = useMemo(
    () => (query.data ? deriveLiveMatch(query.data) : undefined),
    [query.data]
  );

  return {
    bundle: query.data,
    derived,
    isLoading: query.isLoading,
    error: query.error,
    isNotEnabled: query.error instanceof LiveScoringNotEnabledError,
  };
}
