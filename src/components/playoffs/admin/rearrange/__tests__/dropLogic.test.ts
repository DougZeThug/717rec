import { describe, expect, it } from 'vitest';

import type { RearrangeBoard } from '@/services/brackets/manager/services/BracketAdmin/rearrange/types';

import { applyDrop, baselineArrangement, isDirty, toAssignments } from '../dropLogic';

const boardStub = {
  rounds: [
    {
      roundNumber: 1,
      matches: [
        {
          matchId: 301,
          matchNumber: 1,
          roundNumber: 1,
          status: 0,
          locked: false,
          lockedReason: null,
          slots: [
            {
              matchId: 301,
              side: 'opponent1',
              kind: 'bye',
              participantId: null,
              participantName: null,
              autoNote: null,
            },
            {
              matchId: 301,
              side: 'opponent2',
              kind: 'team',
              participantId: 9,
              participantName: 'T9',
              autoNote: null,
            },
          ],
        },
        {
          matchId: 302,
          matchNumber: 2,
          roundNumber: 1,
          status: 0,
          locked: true,
          lockedReason: 'has already been played',
          slots: [
            {
              matchId: 302,
              side: 'opponent1',
              kind: 'locked',
              participantId: 7,
              participantName: 'T7',
              autoNote: null,
            },
            {
              matchId: 302,
              side: 'opponent2',
              kind: 'derived',
              participantId: null,
              participantName: null,
              autoNote: null,
            },
          ],
        },
      ],
    },
  ],
} as unknown as RearrangeBoard;

describe('rearrange drop logic', () => {
  it('collects only movable spots into the baseline arrangement', () => {
    const baseline = baselineArrangement(boardStub);
    expect([...baseline.entries()]).toEqual([
      ['301:opponent1', null],
      ['301:opponent2', 9],
    ]);
  });

  it('trades occupants on a drop, preserving the set of placed teams', () => {
    const baseline = baselineArrangement(boardStub);
    const next = applyDrop(baseline, '301:opponent2', '301:opponent1');
    expect(next.get('301:opponent1')).toBe(9);
    expect(next.get('301:opponent2')).toBeNull();
    expect(isDirty(baseline, next)).toBe(true);
    // Dropping back restores the baseline.
    const back = applyDrop(next, '301:opponent1', '301:opponent2');
    expect(isDirty(baseline, back)).toBe(false);
  });

  it('ignores drops on itself and on unknown spots', () => {
    const baseline = baselineArrangement(boardStub);
    expect(applyDrop(baseline, '301:opponent2', '301:opponent2')).toBe(baseline);
    expect(applyDrop(baseline, '301:opponent2', '302:opponent1')).toBe(baseline);
    expect(isDirty(baseline, baseline)).toBe(false);
  });

  it('treats a changed key set as dirty, so a stale board is surfaced', () => {
    const baseline = baselineArrangement(boardStub);
    // The board refetched and gained a movable spot the held arrangement
    // doesn't know about — occupants alone look identical.
    const grown = new Map(baseline);
    grown.set('999:opponent1', null);
    expect(isDirty(grown, baseline)).toBe(true);
    expect(isDirty(baseline, grown)).toBe(true);
  });

  it('serializes the arrangement into service assignments', () => {
    const baseline = baselineArrangement(boardStub);
    expect(toAssignments(baseline)).toEqual([
      { matchId: 301, side: 'opponent1', participantId: null },
      { matchId: 301, side: 'opponent2', participantId: 9 },
    ]);
  });
});
