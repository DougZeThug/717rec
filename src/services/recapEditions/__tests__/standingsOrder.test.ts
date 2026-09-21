import { describe, expect, it } from 'vitest';

import type { Ranking } from '@/types';
import { sortRankings } from '@/utils/rankingUtils';

import { compareStandings, type SnapshotStandingsInput } from '../standingsOrder';

const row = (
  teamId: string,
  overrides: Partial<SnapshotStandingsInput> = {}
): SnapshotStandingsInput => ({
  teamId,
  teamName: teamId.toUpperCase(),
  logoUrl: null,
  divisionId: 'd-comp',
  divisionName: 'Competitive',
  wins: 5,
  losses: 3,
  gameWins: 12,
  gameLosses: 9,
  powerScore: 60,
  sos: 0.5,
  ...overrides,
});

/** The same row as /stats sees it, so both orderings can be compared. */
const asRanking = (input: SnapshotStandingsInput): Ranking =>
  ({
    teamId: input.teamId,
    teamName: input.teamName,
    divisionName: input.divisionName,
    powerScore: input.powerScore,
    winPercentage:
      (input.wins ?? 0) + (input.losses ?? 0) > 0
        ? ((input.wins ?? 0) / ((input.wins ?? 0) + (input.losses ?? 0))) * 100
        : 0,
  }) as Ranking;

const order = (rows: SnapshotStandingsInput[]) =>
  [...rows].sort(compareStandings).map((r) => r.teamId);

describe('compareStandings', () => {
  it('orders by the power score as displayed, highest first', () => {
    expect(
      order([
        row('mid', { powerScore: 60 }),
        row('top', { powerScore: 70 }),
        row('low', { powerScore: 50 }),
      ])
    ).toEqual(['top', 'mid', 'low']);
  });

  it('puts an unrated team last', () => {
    expect(order([row('unrated', { powerScore: null }), row('rated', { powerScore: 1 })])).toEqual([
      'rated',
      'unrated',
    ]);
  });

  // The defect: the recap put the better record first and /stats put the
  // stronger division first, so a published edition contradicted /stats for the
  // week it was reporting on.
  it('breaks a displayed-score tie on the division before the record', () => {
    const rows = [
      row('rec', {
        powerScore: 60.01,
        divisionId: 'd-rec',
        divisionName: 'Recreational',
        wins: 7,
        losses: 1,
      }),
      row('comp', { powerScore: 60.04, wins: 2, losses: 6 }),
    ];

    // Both show 60.0, so this is a tie even though the stored numbers differ.
    expect(order(rows)).toEqual(['comp', 'rec']);
  });

  it('ranks Competitive, then Intermediate, then Recreational on a tie', () => {
    const rows = [
      row('rec', { divisionId: 'd-rec', divisionName: 'Recreational' }),
      row('int', { divisionId: 'd-int', divisionName: 'Intermediate' }),
      row('comp', {}),
    ];

    expect(order(rows)).toEqual(['comp', 'int', 'rec']);
  });

  it('orders a cross-division tie the same way /stats does', () => {
    const rows = [
      row('rec', {
        powerScore: 60,
        divisionId: 'd-rec',
        divisionName: 'Recreational',
        wins: 7,
        losses: 1,
      }),
      row('comp', { powerScore: 60, wins: 2, losses: 6 }),
      row('int', {
        powerScore: 60,
        divisionId: 'd-int',
        divisionName: 'Intermediate',
        wins: 4,
        losses: 4,
      }),
    ];

    const fromStats = sortRankings(rows.map(asRanking), 'powerScore', 'desc').map((r) => r.teamId);

    expect(order(rows)).toEqual(fromStats);
  });

  it('falls to win percentage when the division is the same too', () => {
    const rows = [row('worse', { wins: 2, losses: 6 }), row('better', { wins: 7, losses: 1 })];

    expect(order(rows)).toEqual(['better', 'worse']);
  });

  it('falls to the team name when nothing else separates two teams', () => {
    const rows = [row('b', { teamName: 'Bravo' }), row('a', { teamName: 'Alpha' })];

    expect(order(rows)).toEqual(['a', 'b']);
  });

  it('treats a division it does not recognise as Intermediate', () => {
    const rows = [
      row('unknown', { divisionId: null, divisionName: 'Thursday Night Somethings' }),
      row('comp', {}),
      row('rec', { divisionId: 'd-rec', divisionName: 'Recreational' }),
    ];

    expect(order(rows)).toEqual(['comp', 'unknown', 'rec']);
  });
});
