import { describe, expect, it } from 'vitest';

import { calculateSourceNodeIds, SlotPositionMarkers } from '../SourceNodeCalculator';
import type { BracketGroupRow, BracketRoundRow, ViewerMatch } from '../types';

/**
 * Fixture transcribed from a REAL brackets-manager 8-team double-elimination
 * stage (grandFinal: 'double'), including the library's own slot position
 * markers. Notably the default loser ordering REVERSES the WB semi drop-ins:
 * LB 2.1 receives the loser of WB Semi 2, LB 2.2 the loser of WB Semi 1.
 */

const groups: BracketGroupRow[] = [
  { id: 1, stage_id: 1, number: 1 },
  { id: 2, stage_id: 1, number: 2 },
  { id: 3, stage_id: 1, number: 3 },
];

const rounds: BracketRoundRow[] = [
  { id: 11, group_id: 1, number: 1 },
  { id: 12, group_id: 1, number: 2 },
  { id: 13, group_id: 1, number: 3 },
  { id: 21, group_id: 2, number: 1 },
  { id: 22, group_id: 2, number: 2 },
  { id: 23, group_id: 2, number: 3 },
  { id: 24, group_id: 2, number: 4 },
  { id: 31, group_id: 3, number: 1 },
  { id: 32, group_id: 3, number: 2 },
];

const makeMatch = (id: number, round_id: number, number: number): ViewerMatch => ({
  id,
  stage_id: 1,
  group_id: rounds.find((r) => r.id === round_id)?.group_id ?? 0,
  round_id,
  number,
  status: 'ready',
  opponent1: { id: null },
  opponent2: { id: null },
});

const makeMatches = (): ViewerMatch[] => [
  makeMatch(0, 11, 1),
  makeMatch(1, 11, 2),
  makeMatch(2, 11, 3),
  makeMatch(3, 11, 4),
  makeMatch(4, 12, 1),
  makeMatch(5, 12, 2),
  makeMatch(6, 13, 1),
  makeMatch(7, 21, 1),
  makeMatch(8, 21, 2),
  makeMatch(9, 22, 1),
  makeMatch(10, 22, 2),
  makeMatch(11, 23, 1),
  makeMatch(12, 24, 1),
  makeMatch(13, 31, 1),
  makeMatch(14, 32, 1),
];

/** brackets-manager's persisted markers for the same stage. */
const markers = new Map<string, SlotPositionMarkers>([
  ['7', { opponent1: 1, opponent2: 2 }],
  ['8', { opponent1: 3, opponent2: 4 }],
  ['9', { opponent1: 2 }], // reverse ordering: LB 2.1 <- WB Semi 2 loser
  ['10', { opponent1: 1 }],
  ['12', { opponent1: 1 }],
]);

const sourceOf = (matches: ViewerMatch[], id: number, side: 'opponent1' | 'opponent2') => {
  const opponent = matches.find((m) => String(m.id) === String(id))?.[side];
  return opponent ? `${opponent.source_node_id ?? '-'}:${opponent.source_type ?? '-'}` : 'null';
};

describe('calculateSourceNodeIds', () => {
  it('wires the winners bracket by binary pairing', () => {
    const matches = calculateSourceNodeIds(makeMatches(), groups, rounds, markers);

    expect(sourceOf(matches, 4, 'opponent1')).toBe('0:winner');
    expect(sourceOf(matches, 4, 'opponent2')).toBe('1:winner');
    expect(sourceOf(matches, 5, 'opponent1')).toBe('2:winner');
    expect(sourceOf(matches, 5, 'opponent2')).toBe('3:winner');
    expect(sourceOf(matches, 6, 'opponent1')).toBe('4:winner');
    expect(sourceOf(matches, 6, 'opponent2')).toBe('5:winner');
  });

  it('routes WB round 1 losers into LB round 1 via position markers', () => {
    const matches = calculateSourceNodeIds(makeMatches(), groups, rounds, markers);

    expect(sourceOf(matches, 7, 'opponent1')).toBe('0:loser');
    expect(sourceOf(matches, 7, 'opponent2')).toBe('1:loser');
    expect(sourceOf(matches, 8, 'opponent1')).toBe('2:loser');
    expect(sourceOf(matches, 8, 'opponent2')).toBe('3:loser');
  });

  it('routes WB drop-ins into even LB rounds honoring reversed orderings', () => {
    const matches = calculateSourceNodeIds(makeMatches(), groups, rounds, markers);

    // LB R2 (minor): drop-in on the marked slot, LB carry-over on the other.
    expect(sourceOf(matches, 9, 'opponent1')).toBe('5:loser'); // WB Semi 2
    expect(sourceOf(matches, 9, 'opponent2')).toBe('7:winner');
    expect(sourceOf(matches, 10, 'opponent1')).toBe('4:loser'); // WB Semi 1
    expect(sourceOf(matches, 10, 'opponent2')).toBe('8:winner');

    // LB R4 (LB Final): WB Final loser + LB Semi winner.
    expect(sourceOf(matches, 12, 'opponent1')).toBe('6:loser');
    expect(sourceOf(matches, 12, 'opponent2')).toBe('11:winner');
  });

  it('pairs internal odd LB rounds from the previous round winners', () => {
    const matches = calculateSourceNodeIds(makeMatches(), groups, rounds, markers);

    expect(sourceOf(matches, 11, 'opponent1')).toBe('9:winner');
    expect(sourceOf(matches, 11, 'opponent2')).toBe('10:winner');
  });

  it('wires the grand final from the WB and LB finals', () => {
    const matches = calculateSourceNodeIds(makeMatches(), groups, rounds, markers);

    expect(sourceOf(matches, 13, 'opponent1')).toBe('6:winner');
    expect(sourceOf(matches, 13, 'opponent2')).toBe('12:winner');
  });

  it('falls back to natural structural routing when no markers are provided', () => {
    const matches = calculateSourceNodeIds(makeMatches(), groups, rounds);

    // LB R1: binary pairing of WB R1.
    expect(sourceOf(matches, 7, 'opponent1')).toBe('0:loser');
    expect(sourceOf(matches, 7, 'opponent2')).toBe('1:loser');
    // LB R2: natural (same-number) drop-in + carry-over — LB 2.2 is no longer
    // left without sources (the old odd-round model produced none here).
    expect(sourceOf(matches, 9, 'opponent1')).toBe('4:loser');
    expect(sourceOf(matches, 9, 'opponent2')).toBe('7:winner');
    expect(sourceOf(matches, 10, 'opponent1')).toBe('5:loser');
    expect(sourceOf(matches, 10, 'opponent2')).toBe('8:winner');
    // LB Final still receives the WB Final loser.
    expect(sourceOf(matches, 12, 'opponent1')).toBe('6:loser');
  });
});
