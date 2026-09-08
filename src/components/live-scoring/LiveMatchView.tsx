import React from 'react';

import { useFinalizeMatch } from '@/hooks/live-scoring/useFinalizeMatch';
import { useGameFlow } from '@/hooks/live-scoring/useGameFlow';
import type { LiveMatchDerived } from '@/hooks/live-scoring/useLiveMatch';
import { usePlayerNames } from '@/hooks/live-scoring/usePlayerNames';
import { useRoundMutations } from '@/hooks/live-scoring/useRoundMutations';
import { useTeamPlayers } from '@/hooks/live-scoring/useTeamPlayers';
import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';
import {
  buildGameLines,
  resolveOfficialWinnerName,
  resolveWinnerName,
} from '@/utils/liveScoring/matchWinner';
import { DEFAULT_GAME_RULES } from '@/utils/liveScoring/rules';

import { LiveMatchContent } from './LiveMatchContent';
import { MatchScoringHeader } from './MatchScoringHeader';

interface LiveMatchViewProps {
  matchId: string;
  bundle: LiveMatchBundle;
  derived: LiveMatchDerived;
  canScore: boolean;
  isAdmin: boolean;
  realtimeStatus: string;
}

const RULES_LABEL = `First to ${DEFAULT_GAME_RULES.targetScore}, win by ${DEFAULT_GAME_RULES.winBy}`;

/** Renders the complete live-scoring workflow for setup, scoring, deciding, and reviewing a match. */
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

  const playerNames = usePlayerNames(team1Players.players, team2Players.players);

  const { matchState } = derived;
  const isOfficiallyCompleted = match.iscompleted === true;

  const winnerName = resolveWinnerName(matchState.matchWinner, team1Name, team2Name);
  const officialWinnerName = resolveOfficialWinnerName(
    match.winner_id,
    match.team1_id,
    match.team2_id,
    team1Name,
    team2Name,
    winnerName
  );

  const gameLines = buildGameLines(derived.games, match.team1_id, team1Name, team2Name);

  return (
    <div className="space-y-3">
      {/* The page had no heading at all: the team names are paragraphs inside
          the scoreboard, so a screen reader had nothing naming the match. */}
      <h1 className="sr-only">
        Live scoring: {team1Name} vs {team2Name}
      </h1>
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
      <LiveMatchContent
        bundle={bundle}
        derived={derived}
        team1Name={team1Name}
        team2Name={team2Name}
        playerNames={playerNames}
        winnerName={winnerName}
        officialWinnerName={officialWinnerName}
        gameLines={gameLines}
        isOfficiallyCompleted={isOfficiallyCompleted}
        canScore={canScore}
        isAdmin={isAdmin}
        rulesLabel={RULES_LABEL}
        team1Players={team1Players}
        team2Players={team2Players}
        submitRound={submitRound}
        undoLastRound={undoLastRound}
        startGame={startGame}
        confirmGameComplete={confirmGameComplete}
        reopenGame={reopenGame}
        finalize={finalize}
        reopen={reopen}
      />
    </div>
  );
};
