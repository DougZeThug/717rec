import type { RoundScore, TeamSide } from './types';

// 4 bags per round: 3 points in-hole, 1 point on-board, so 11 is unreachable.
export const VALID_ROUND_SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12] as const;

export function isValidRoundScore(score: number): boolean {
  return Number.isInteger(score) && (VALID_ROUND_SCORES as readonly number[]).includes(score);
}

export interface CancellationResult {
  net: number;
  winner: TeamSide | null;
}

/** Cancellation scoring: only the difference counts, for the higher side. */
export function cancellationNet(round: RoundScore): CancellationResult {
  if (round.team1 === round.team2) return { net: 0, winner: null };
  if (round.team1 > round.team2) return { net: round.team1 - round.team2, winner: 1 };
  return { net: round.team2 - round.team1, winner: 2 };
}

/**
 * Game totals are ALWAYS derived by folding the round log — never read from
 * a cached counter — so undo, corrections, and realtime merges stay correct.
 */
export function foldGameTotals(rounds: RoundScore[]): { team1: number; team2: number } {
  const totals = { team1: 0, team2: 0 };
  for (const round of rounds) {
    const { net, winner } = cancellationNet(round);
    if (winner === 1) totals.team1 += net;
    if (winner === 2) totals.team2 += net;
  }
  return totals;
}
