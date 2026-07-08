import { BEST_OF, GAMES_TO_WIN_MATCH } from './rules';
import type { GameSummary, RoundRecord, TeamSide } from './types';

export interface MatchState {
  gameWins: { team1: number; team2: number };
  matchWinner: TeamSide | null;
  /** Game number to create when starting the next game; null when the match
   *  is decided or all games exist. */
  nextGameNumber: number | null;
  isComplete: boolean;
}

export function deriveMatchState(games: GameSummary[]): MatchState {
  const completed = games.filter((g) => g.status === 'completed');
  const gameWins = {
    team1: completed.filter((g) => g.winnerSide === 1).length,
    team2: completed.filter((g) => g.winnerSide === 2).length,
  };

  let matchWinner: TeamSide | null = null;
  if (gameWins.team1 >= GAMES_TO_WIN_MATCH) matchWinner = 1;
  else if (gameWins.team2 >= GAMES_TO_WIN_MATCH) matchWinner = 2;

  const highestGameNumber = games.reduce((max, g) => Math.max(max, g.gameNumber), 0);
  const nextGameNumber =
    matchWinner !== null || highestGameNumber >= BEST_OF ? null : highestGameNumber + 1;

  return { gameWins, matchWinner, nextGameNumber, isComplete: matchWinner !== null };
}

/** Next round number for a game, tolerant of unsorted input. */
export function nextRoundNumber(rounds: Pick<RoundRecord, 'roundNumber'>[]): number {
  return rounds.reduce((max, r) => Math.max(max, r.roundNumber), 0) + 1;
}
