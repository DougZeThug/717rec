import { describe, expect, it } from 'vitest';

import type { PlayerStatLine } from '../matchPlayerStats';
import { computePlayerStatLines } from '../matchPlayerStats';

const round = (
  team1_score: number,
  team2_score: number,
  team1_thrower_id: string | null,
  team2_thrower_id: string | null
) => ({ team1_score, team2_score, team1_thrower_id, team2_thrower_id });

const lineFor = (lines: PlayerStatLine[], playerId: string): PlayerStatLine => {
  const line = lines.find((l) => l.playerId === playerId);
  if (!line) throw new Error(`No stat line for player ${playerId}`);
  return line;
};

describe('computePlayerStatLines', () => {
  it('attributes points to the thrower of each side', () => {
    const lines = computePlayerStatLines([round(8, 5, 'a', 'b'), round(4, 9, 'a', 'b')]);

    const playerA = lineFor(lines, 'a');
    expect(playerA).toMatchObject({ roundsThrown: 2, pointsFor: 12, pointsAgainst: 14 });
    expect(playerA.ppr).toBeCloseTo(6);

    const playerB = lineFor(lines, 'b');
    expect(playerB).toMatchObject({ roundsThrown: 2, pointsFor: 14, pointsAgainst: 12 });
  });

  it('splits rounds between alternating throwers', () => {
    const lines = computePlayerStatLines([
      round(12, 0, 'a1', 'b1'),
      round(0, 7, 'a2', 'b2'),
      round(9, 3, 'a1', 'b1'),
    ]);

    expect(lines.find((l) => l.playerId === 'a1')).toMatchObject({
      roundsThrown: 2,
      pointsFor: 21,
    });
    expect(lines.find((l) => l.playerId === 'a2')).toMatchObject({
      roundsThrown: 1,
      pointsFor: 0,
    });
  });

  it('skips rounds with no thrower attribution', () => {
    const lines = computePlayerStatLines([round(8, 5, null, null)]);
    expect(lines).toHaveLength(0);
  });
});

describe('bag accumulation', () => {
  const baggedRound = (
    scores: { team1: number; team2: number },
    team1Bags: { bagsIn: number; bagsOn: number; bagsOff: number } | null,
    team2Bags: { bagsIn: number; bagsOn: number; bagsOff: number } | null
  ) => ({
    ...round(scores.team1, scores.team2, 'a', 'b'),
    team1_bags_in: team1Bags?.bagsIn ?? null,
    team1_bags_on: team1Bags?.bagsOn ?? null,
    team1_bags_off: team1Bags?.bagsOff ?? null,
    team2_bags_in: team2Bags?.bagsIn ?? null,
    team2_bags_on: team2Bags?.bagsOn ?? null,
    team2_bags_off: team2Bags?.bagsOff ?? null,
  });

  it('accumulates bags and total from bag-tracked rounds', () => {
    const lines = computePlayerStatLines([
      baggedRound(
        { team1: 8, team2: 5 },
        { bagsIn: 2, bagsOn: 2, bagsOff: 0 },
        { bagsIn: 1, bagsOn: 2, bagsOff: 1 }
      ),
      baggedRound(
        { team1: 5, team2: 0 },
        { bagsIn: 1, bagsOn: 2, bagsOff: 1 },
        { bagsIn: 0, bagsOn: 0, bagsOff: 4 }
      ),
    ]);

    expect(lineFor(lines, 'a')).toMatchObject({
      bagsIn: 3,
      bagsOn: 4,
      bagsOff: 1,
      totalBags: 8,
      fourBaggers: 0,
    });
    expect(lineFor(lines, 'b')).toMatchObject({ bagsIn: 1, bagsOn: 2, bagsOff: 5, totalBags: 8 });
  });

  it('treats missing bag data as unknown, never as misses', () => {
    const lines = computePlayerStatLines([
      baggedRound({ team1: 8, team2: 5 }, { bagsIn: 2, bagsOn: 2, bagsOff: 0 }, null),
      // Untracked round still counts for rounds/points, not for bags.
      round(4, 9, 'a', 'b'),
    ]);

    const playerA = lineFor(lines, 'a');
    expect(playerA).toMatchObject({ roundsThrown: 2, pointsFor: 12, totalBags: 4 });

    const playerB = lineFor(lines, 'b');
    expect(playerB).toMatchObject({ roundsThrown: 2, pointsFor: 14, totalBags: 0 });
  });

  it('counts four-baggers from the thrower side', () => {
    const lines = computePlayerStatLines([
      baggedRound(
        { team1: 12, team2: 0 },
        { bagsIn: 4, bagsOn: 0, bagsOff: 0 },
        { bagsIn: 0, bagsOn: 0, bagsOff: 4 }
      ),
      baggedRound(
        { team1: 12, team2: 7 },
        { bagsIn: 4, bagsOn: 0, bagsOff: 0 },
        { bagsIn: 2, bagsOn: 1, bagsOff: 1 }
      ),
    ]);

    expect(lineFor(lines, 'a').fourBaggers).toBe(2);
    expect(lineFor(lines, 'b').fourBaggers).toBe(0);
  });

  it('preserves PPR behavior alongside bag counters', () => {
    const lines = computePlayerStatLines([
      baggedRound({ team1: 8, team2: 5 }, { bagsIn: 2, bagsOn: 2, bagsOff: 0 }, null),
      round(4, 9, 'a', 'b'),
    ]);

    expect(lineFor(lines, 'a').ppr).toBeCloseTo(6);
  });
});
