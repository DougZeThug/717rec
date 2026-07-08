import { pointsPerRound } from './pprCalc';

/** Minimal structural view of a persisted round (matches MatchRoundRow). */
export interface RoundForStats {
  team1_score: number;
  team2_score: number;
  team1_thrower_id: string | null;
  team2_thrower_id: string | null;
}

export interface PlayerStatLine {
  playerId: string;
  roundsThrown: number;
  pointsFor: number;
  pointsAgainst: number;
  ppr: number | null;
}

/**
 * Per-player lines for a set of rounds (one match or one game), derived
 * purely from thrower attribution — used by the live summary screens.
 */
export function computePlayerStatLines(rounds: RoundForStats[]): PlayerStatLine[] {
  const byPlayer = new Map<string, { roundsThrown: number; pointsFor: number; pointsAgainst: number }>();

  const add = (playerId: string | null, pointsFor: number, pointsAgainst: number) => {
    if (!playerId) return;
    const entry = byPlayer.get(playerId) ?? { roundsThrown: 0, pointsFor: 0, pointsAgainst: 0 };
    entry.roundsThrown += 1;
    entry.pointsFor += pointsFor;
    entry.pointsAgainst += pointsAgainst;
    byPlayer.set(playerId, entry);
  };

  for (const round of rounds) {
    add(round.team1_thrower_id, round.team1_score, round.team2_score);
    add(round.team2_thrower_id, round.team2_score, round.team1_score);
  }

  return [...byPlayer.entries()].map(([playerId, s]) => ({
    playerId,
    roundsThrown: s.roundsThrown,
    pointsFor: s.pointsFor,
    pointsAgainst: s.pointsAgainst,
    ppr: pointsPerRound(s.pointsFor, s.roundsThrown),
  }));
}
