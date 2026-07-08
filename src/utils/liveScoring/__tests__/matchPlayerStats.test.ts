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
