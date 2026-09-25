import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import { describe, expect, it } from 'vitest';

import { BusinessLogicError } from '@/types/errors';

import { computeLbFeederMarkers, computeStageSlotLayout } from '../lbFeederMarkers';

type Side = 'opponent1' | 'opponent2';

const doubleElimination = (settings: object) => ({
  type: 'double_elimination',
  settings: settings as Record<string, unknown>,
});

/** Create a seeded stage exactly as BracketCreationService does, in memory. */
async function createSeededStage(
  teamCount: number,
  type: 'single_elimination' | 'double_elimination' = 'double_elimination'
) {
  let size = 2;
  while (size < teamCount) size *= 2;
  const manager = new BracketsManager(new InMemoryDatabase());
  const stage = await manager.create.stage({
    tournamentId: 0,
    name: 'Playoffs',
    type,
    seeding: [
      ...Array.from({ length: teamCount }, (_, i) => `T${i + 1}`),
      ...Array<null>(size - teamCount).fill(null),
    ],
    settings:
      type === 'double_elimination'
        ? { seedOrdering: ['inner_outer'], grandFinal: 'simple' }
        : { seedOrdering: ['inner_outer'] },
  });
  return { stage, data: await manager.get.stageData(stage.id) };
}

describe('computeLbFeederMarkers', () => {
  it('returns the library markers of a size-8 losers bracket', async () => {
    const markers = await computeLbFeederMarkers(
      doubleElimination({ size: 8, seedOrdering: ['inner_outer'] })
    );

    // Round 1 pairs winners round 1 losers in order.
    expect(markers.markerOf(1, 1, 'opponent1')).toBe(1);
    expect(markers.markerOf(1, 1, 'opponent2')).toBe(2);
    expect(markers.markerOf(1, 2, 'opponent1')).toBe(3);
    expect(markers.markerOf(1, 2, 'opponent2')).toBe(4);
    // Round 2 drops winners round 2 losers into opponent1, reversed.
    expect(markers.markerOf(2, 1, 'opponent1')).toBe(2);
    expect(markers.markerOf(2, 2, 'opponent1')).toBe(1);
    expect(markers.markerOf(4, 1, 'opponent1')).toBe(1);
    // Carry slots and major rounds are unmarked.
    expect(markers.markerOf(2, 1, 'opponent2')).toBeNull();
    expect(markers.markerOf(3, 1, 'opponent1')).toBeNull();
    expect(markers.markerOf(3, 1, 'opponent2')).toBeNull();
    expect(markers.markerOf(4, 1, 'opponent2')).toBeNull();
    // A slot that does not exist.
    expect(markers.markerOf(9, 1, 'opponent1')).toBeNull();
  });

  it('returns the library markers of a size-16 losers bracket', async () => {
    const markers = await computeLbFeederMarkers(
      doubleElimination({ size: 16, seedOrdering: ['inner_outer'] })
    );
    const dropIns = (round: number, matchCount: number) =>
      Array.from({ length: matchCount }, (_, i) => markers.markerOf(round, i + 1, 'opponent1'));

    expect(dropIns(1, 4)).toEqual([1, 3, 5, 7]);
    expect(dropIns(2, 4)).toEqual([2, 1, 4, 3]);
    expect(dropIns(4, 2)).toEqual([2, 1]);
    expect(dropIns(6, 1)).toEqual([1]);
  });

  it('gives the same markers for the full stored ordering list and the creation input', async () => {
    const { stage } = await createSeededStage(8);
    const stored = await computeLbFeederMarkers(doubleElimination(stage.settings));
    const input = await computeLbFeederMarkers(
      doubleElimination({ size: 8, seedOrdering: ['inner_outer'] })
    );

    for (const [round, matches] of [
      [1, 2],
      [2, 2],
      [3, 1],
      [4, 1],
    ]) {
      for (let match = 1; match <= matches; match++) {
        for (const side of ['opponent1', 'opponent2'] as const) {
          expect(stored.markerOf(round, match, side)).toBe(input.markerOf(round, match, side));
        }
      }
    }
  });

  it.each([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 32])(
    'matches every marker the library stores on a real %i-team bracket',
    async (teamCount) => {
      const { stage, data } = await createSeededStage(teamCount);
      const markers = await computeLbFeederMarkers(doubleElimination(stage.settings));

      const losersGroup = data.group.find((group) => group.number === 2);
      const roundNumberById = new Map(
        data.round
          .filter((round) => round.group_id === losersGroup?.id)
          .map((round) => [round.id, round.number])
      );
      let checked = 0;
      for (const match of data.match) {
        const roundNumber = roundNumberById.get(match.round_id);
        if (roundNumber === undefined) continue;
        for (const side of ['opponent1', 'opponent2'] as Side[]) {
          const slot = match[side];
          if (slot === null) continue; // A BYE slot is stored without a marker.
          expect(markers.markerOf(roundNumber, match.number, side)).toBe(slot.position ?? null);
          checked += 1;
        }
      }
      expect(checked).toBeGreaterThan(0);
    }
  );

  it('does not change the settings it is given', async () => {
    const settings = { size: 8, seedOrdering: ['inner_outer'], grandFinal: 'double' };
    const copy = structuredClone(settings);
    await computeLbFeederMarkers(doubleElimination(settings));
    expect(settings).toEqual(copy);
  });

  it('refuses a stage without a size', async () => {
    await expect(
      computeLbFeederMarkers(doubleElimination({ seedOrdering: ['inner_outer'] }))
    ).rejects.toThrow(BusinessLogicError);
  });

  it('refuses a single-elimination stage', async () => {
    await expect(
      computeLbFeederMarkers({ type: 'single_elimination', settings: { size: 8 } })
    ).rejects.toThrow(/Only a double-elimination bracket/);
  });

  it('wraps a layout the library refuses to build', async () => {
    await expect(computeLbFeederMarkers(doubleElimination({ size: 6 }))).rejects.toThrow(
      /Could not work out this bracket's losers-bracket layout/
    );
  });
});

describe('computeStageSlotLayout', () => {
  it.each(['single_elimination', 'double_elimination'])(
    'gives the seed number of every %s round 1 slot',
    async (type) => {
      const layout = await computeStageSlotLayout({
        type,
        settings: { size: 8, seedOrdering: ['inner_outer'] },
      });
      const seedsOf = (match: number) => [
        layout.wbRoundOneSeedOf(match, 'opponent1'),
        layout.wbRoundOneSeedOf(match, 'opponent2'),
      ];
      expect([seedsOf(1), seedsOf(2), seedsOf(3), seedsOf(4)]).toEqual([
        [1, 8],
        [4, 5],
        [2, 7],
        [3, 6],
      ]);
      // Later rounds and missing matches have no seed slot.
      expect(layout.wbRoundOneSeedOf(5, 'opponent1')).toBeNull();
    }
  );

  it('gives losers-bracket markers in double elimination and none in single elimination', async () => {
    const double = await computeStageSlotLayout(
      doubleElimination({ size: 8, seedOrdering: ['inner_outer'] })
    );
    expect(double.lbMarkerOf(2, 1, 'opponent1')).toBe(2);
    const single = await computeStageSlotLayout({
      type: 'single_elimination',
      settings: { size: 8, seedOrdering: ['inner_outer'] },
    });
    expect(single.lbMarkerOf(1, 1, 'opponent1')).toBeNull();
  });

  it.each([
    ['single_elimination', 3],
    ['single_elimination', 6],
    ['single_elimination', 13],
    ['double_elimination', 5],
    ['double_elimination', 6],
    ['double_elimination', 11],
    ['double_elimination', 32],
  ] as const)(
    'matches every round 1 seed the library stores on a real %s bracket of %i teams',
    async (type, teamCount) => {
      const { stage, data } = await createSeededStage(teamCount, type);
      const layout = await computeStageSlotLayout({
        type,
        settings: stage.settings as Record<string, unknown>,
      });

      const winnersGroup = data.group.find((group) => group.number === 1);
      const roundOne = data.round.find(
        (round) => round.group_id === winnersGroup?.id && round.number === 1
      );
      let checked = 0;
      for (const match of data.match.filter((m) => m.round_id === roundOne?.id)) {
        for (const side of ['opponent1', 'opponent2'] as Side[]) {
          const slot = match[side];
          if (slot === null) continue; // A BYE slot is stored without a seed.
          expect(layout.wbRoundOneSeedOf(match.number, side)).toBe(slot.position ?? null);
          checked += 1;
        }
      }
      expect(checked).toBe(teamCount);
    }
  );

  it('refuses a bracket that is not an elimination bracket', async () => {
    await expect(
      computeStageSlotLayout({ type: 'round_robin', settings: { size: 8 } })
    ).rejects.toThrow('Only an elimination bracket has a layout.');
  });
});
