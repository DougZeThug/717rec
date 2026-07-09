import { pointsPerRound } from './pprCalc';
import type { BagBreakdown } from './types';

/** Minimal structural view of a persisted round (matches MatchRoundRow). */
export interface RoundForStats {
  team1_score: number;
  team2_score: number;
  team1_thrower_id: string | null;
  team2_thrower_id: string | null;
  team1_bags_in?: number | null;
  team1_bags_on?: number | null;
  team1_bags_off?: number | null;
  team2_bags_in?: number | null;
  team2_bags_on?: number | null;
  team2_bags_off?: number | null;
}

export interface PlayerStatLine {
  playerId: string;
  roundsThrown: number;
  pointsFor: number;
  pointsAgainst: number;
  ppr: number | null;
  /**
   * Bag counters accumulate ONLY from rounds where this side's bag breakdown
   * was recorded — missing bag data means "unknown", never "off the board".
   */
  bagsIn: number;
  bagsOn: number;
  bagsOff: number;
  totalBags: number;
  fourBaggers: number;
}

interface Accumulator {
  roundsThrown: number;
  pointsFor: number;
  pointsAgainst: number;
  bagsIn: number;
  bagsOn: number;
  bagsOff: number;
  fourBaggers: number;
}

function sideBags(
  bagsIn: number | null | undefined,
  bagsOn: number | null | undefined,
  bagsOff: number | null | undefined
): BagBreakdown | null {
  if (bagsIn == null || bagsOn == null || bagsOff == null) return null;
  return { bagsIn, bagsOn, bagsOff };
}

/**
 * Per-player lines for a set of rounds (one match or one game), derived
 * purely from thrower attribution — used by the live summary screens.
 */
export function computePlayerStatLines(rounds: RoundForStats[]): PlayerStatLine[] {
  const byPlayer = new Map<string, Accumulator>();

  const add = (
    playerId: string | null,
    pointsFor: number,
    pointsAgainst: number,
    bags: BagBreakdown | null
  ) => {
    if (!playerId) return;
    const entry = byPlayer.get(playerId) ?? {
      roundsThrown: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      bagsIn: 0,
      bagsOn: 0,
      bagsOff: 0,
      fourBaggers: 0,
    };
    entry.roundsThrown += 1;
    entry.pointsFor += pointsFor;
    entry.pointsAgainst += pointsAgainst;
    if (bags) {
      entry.bagsIn += bags.bagsIn;
      entry.bagsOn += bags.bagsOn;
      entry.bagsOff += bags.bagsOff;
      if (bags.bagsIn === 4) entry.fourBaggers += 1;
    }
    byPlayer.set(playerId, entry);
  };

  for (const round of rounds) {
    add(
      round.team1_thrower_id,
      round.team1_score,
      round.team2_score,
      sideBags(round.team1_bags_in, round.team1_bags_on, round.team1_bags_off)
    );
    add(
      round.team2_thrower_id,
      round.team2_score,
      round.team1_score,
      sideBags(round.team2_bags_in, round.team2_bags_on, round.team2_bags_off)
    );
  }

  return [...byPlayer.entries()].map(([playerId, s]) => ({
    playerId,
    roundsThrown: s.roundsThrown,
    pointsFor: s.pointsFor,
    pointsAgainst: s.pointsAgainst,
    ppr: pointsPerRound(s.pointsFor, s.roundsThrown),
    bagsIn: s.bagsIn,
    bagsOn: s.bagsOn,
    bagsOff: s.bagsOff,
    totalBags: s.bagsIn + s.bagsOn + s.bagsOff,
    fourBaggers: s.fourBaggers,
  }));
}
