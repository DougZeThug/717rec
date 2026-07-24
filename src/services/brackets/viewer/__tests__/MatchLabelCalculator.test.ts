import { describe, expect, it } from 'vitest';

import { buildMatchLabelMap, buildSlotHints } from '../MatchLabelCalculator';
import type { BracketGroupRow, BracketRoundRow, ViewerMatch } from '../types';

type Opponent = NonNullable<ViewerMatch['opponent1']>;

const makeOpponent = (id: number | null, extra: Partial<Opponent> = {}): Opponent => ({
  id,
  ...extra,
});

const makeMatch = (
  id: number,
  round_id: number,
  number: number,
  overrides: Partial<ViewerMatch> = {}
): ViewerMatch => ({
  id,
  stage_id: 1,
  group_id: 1,
  round_id,
  number,
  status: 'ready',
  opponent1: makeOpponent(null),
  opponent2: makeOpponent(null),
  ...overrides,
});

// ─── 8-team double elimination fixture ───────────────────────────────────────
// WB: rounds 11-13 (4/2/1 matches) · LB: rounds 21-24 (2/2/1/1) · GF: 31-32.

const deGroups: BracketGroupRow[] = [
  { id: 1, stage_id: 1, number: 1 },
  { id: 2, stage_id: 1, number: 2 },
  { id: 3, stage_id: 1, number: 3 },
];

const deRounds: BracketRoundRow[] = [
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

const deMatches: ViewerMatch[] = [
  makeMatch(1, 11, 1),
  makeMatch(2, 11, 2),
  makeMatch(3, 11, 3),
  makeMatch(4, 11, 4),
  makeMatch(5, 12, 1),
  makeMatch(6, 12, 2),
  makeMatch(7, 13, 1),
  makeMatch(8, 21, 1),
  makeMatch(9, 21, 2),
  makeMatch(10, 22, 1),
  makeMatch(11, 22, 2),
  makeMatch(12, 23, 1),
  makeMatch(13, 24, 1),
  makeMatch(14, 31, 1),
  makeMatch(15, 32, 1),
];

// ─── 8-team single elimination fixture ───────────────────────────────────────

const seGroups: BracketGroupRow[] = [{ id: 1, stage_id: 1, number: 1 }];

const seRounds: BracketRoundRow[] = [
  { id: 41, group_id: 1, number: 1 },
  { id: 42, group_id: 1, number: 2 },
  { id: 43, group_id: 1, number: 3 },
];

const seMatches: ViewerMatch[] = [
  makeMatch(1, 41, 1),
  makeMatch(2, 41, 2),
  makeMatch(3, 42, 1),
  makeMatch(4, 42, 2),
  makeMatch(5, 43, 1),
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('buildMatchLabelMap', () => {
  it('labels ordinary double-elim matches as {prefix} {round}.{match}', () => {
    const labels = buildMatchLabelMap(deMatches, deGroups, deRounds, 'double_elimination');

    expect(labels.get('2')).toBe('WB 1.2');
    expect(labels.get('4')).toBe('WB 1.4');
    expect(labels.get('10')).toBe('LB 2.1');
  });

  it('labels the last two rounds of each bracket as Semi and Final', () => {
    const labels = buildMatchLabelMap(deMatches, deGroups, deRounds, 'double_elimination');

    expect(labels.get('5')).toBe('WB Semi 1');
    expect(labels.get('6')).toBe('WB Semi 2');
    expect(labels.get('7')).toBe('WB Final');
    expect(labels.get('12')).toBe('LB Semi 1');
    expect(labels.get('13')).toBe('LB Final');
  });

  it('labels a two-round finals group as GF rounds', () => {
    const labels = buildMatchLabelMap(deMatches, deGroups, deRounds, 'double_elimination');

    expect(labels.get('14')).toBe('GF Round 1');
    expect(labels.get('15')).toBe('GF Round 2');
  });

  it('labels a single-match finals group as Grand Final', () => {
    const singleGfRounds = deRounds.filter((r) => r.id !== 32);
    const singleGfMatches = deMatches.filter((m) => m.id !== 15);
    const labels = buildMatchLabelMap(
      singleGfMatches,
      deGroups,
      singleGfRounds,
      'double_elimination'
    );

    expect(labels.get('14')).toBe('Grand Final');
  });

  it('uses single-bracket labels for single elimination', () => {
    const labels = buildMatchLabelMap(seMatches, seGroups, seRounds, 'single_elimination');

    expect(labels.get('1')).toBe('M 1.1');
    expect(labels.get('2')).toBe('M 1.2');
    expect(labels.get('3')).toBe('Semi 1');
    expect(labels.get('4')).toBe('Semi 2');
    expect(labels.get('5')).toBe('Final');
  });

  it('ignores rounds belonging to unknown groups', () => {
    // The upstream round query is not stage-filtered, so rows from other
    // brackets can appear. A foreign LB-final-numbered round must not shift
    // this bracket's round counts (which would mislabel Semi/Final rounds).
    const foreignRounds = [...deRounds, { id: 99, group_id: 999, number: 9 }];
    const labels = buildMatchLabelMap(deMatches, deGroups, foreignRounds, 'double_elimination');

    expect(labels.get('7')).toBe('WB Final');
    expect(labels.get('13')).toBe('LB Final');

    const orphanMatch = makeMatch(50, 99, 1);
    const withOrphan = buildMatchLabelMap(
      [...deMatches, orphanMatch],
      deGroups,
      foreignRounds,
      'double_elimination'
    );
    expect(withOrphan.has('50')).toBe(false);
  });
});

describe('buildSlotHints', () => {
  const withSlots = (edits: Record<number, Partial<ViewerMatch>>): ViewerMatch[] =>
    deMatches.map((m) => (edits[m.id] ? { ...m, ...edits[m.id] } : m));

  it('produces Loser-of hints for losers-bracket drop-in slots', () => {
    const matches = withSlots({
      8: {
        opponent1: makeOpponent(null, { source_node_id: '1', source_type: 'loser' }),
        opponent2: makeOpponent(null, { source_node_id: '2', source_type: 'loser' }),
      },
      12: {
        opponent2: makeOpponent(null, { source_node_id: '5', source_type: 'loser' }),
      },
    });

    const hints = buildSlotHints(matches, deGroups, deRounds, 'double_elimination');

    expect(hints.get('8')).toEqual({
      opponent1: 'Loser of WB 1.1',
      opponent2: 'Loser of WB 1.2',
    });
    expect(hints.get('12')).toEqual({ opponent2: 'Loser of WB Semi 1' });
  });

  it('produces Winner-of hints for grand final and progression slots', () => {
    const matches = withSlots({
      5: {
        opponent1: makeOpponent(null, { source_node_id: '1', source_type: 'winner' }),
      },
      14: {
        opponent1: makeOpponent(null, { source_node_id: '7', source_type: 'winner' }),
        opponent2: makeOpponent(null, { source_node_id: '13', source_type: 'winner' }),
      },
    });

    const hints = buildSlotHints(matches, deGroups, deRounds, 'double_elimination');

    expect(hints.get('5')).toEqual({ opponent1: 'Winner of WB 1.1' });
    expect(hints.get('14')).toEqual({
      opponent1: 'Winner of WB Final',
      opponent2: 'Winner of LB Final',
    });
  });

  it('skips slots that already have a participant', () => {
    const matches = withSlots({
      5: {
        opponent1: makeOpponent(101, { source_node_id: '1', source_type: 'winner' }),
        opponent2: makeOpponent(null, { source_node_id: '2', source_type: 'winner' }),
      },
    });

    const hints = buildSlotHints(matches, deGroups, deRounds, 'double_elimination');

    expect(hints.get('5')).toEqual({ opponent2: 'Winner of WB 1.2' });
  });

  it('skips the grand final reset match', () => {
    // SourceNodeCalculator wires the reset's slots to the WB/LB finals for
    // connector drawing, but its teams actually come from GF round 1.
    const matches = withSlots({
      15: {
        opponent1: makeOpponent(null, { source_node_id: '7', source_type: 'winner' }),
        opponent2: makeOpponent(null, { source_node_id: '13', source_type: 'winner' }),
      },
    });

    const hints = buildSlotHints(matches, deGroups, deRounds, 'double_elimination');

    expect(hints.has('15')).toBe(false);
  });

  it('skips BYE-sentinel slots even when their bye feeder match is not terminal', () => {
    // Real bye-bracket shape: WB 1.1 is a bye match and stays 'locked'
    // forever, and the LB slot awaiting its (nonexistent) loser carries the
    // SQL 'bye' result sentinel. No hint must be written there.
    const matches = withSlots({
      8: {
        opponent1: makeOpponent(null, {
          result: 'bye',
          source_node_id: '3',
          source_type: 'loser',
        }),
        opponent2: makeOpponent(null),
      },
    });

    const hints = buildSlotHints(matches, deGroups, deRounds, 'double_elimination');

    expect(hints.has('8')).toBe(false);
  });

  it('keeps hints on pre-marked walkover slots that will still receive a team', () => {
    // Real bye-bracket shape: the slot opposite a BYE is pre-marked
    // {id: null, result: 'win'} — the incoming loser lands there and wins by
    // walkover, so "Loser of ..." is correct information.
    const matches = withSlots({
      8: {
        opponent1: makeOpponent(null, {
          result: 'bye',
          source_node_id: '3',
          source_type: 'loser',
        }),
        opponent2: makeOpponent(null, {
          result: 'win',
          source_node_id: '4',
          source_type: 'loser',
        }),
      },
    });

    const hints = buildSlotHints(matches, deGroups, deRounds, 'double_elimination');

    expect(hints.get('8')).toEqual({ opponent2: 'Loser of WB 1.4' });
  });

  it('skips hints whose source match already finished (bye/walkover voids)', () => {
    const matches = withSlots({
      3: { status: 'completed' },
      4: { status: 'archived' },
      9: {
        opponent1: makeOpponent(null, { source_node_id: '3', source_type: 'loser' }),
        opponent2: makeOpponent(null, { source_node_id: '4', source_type: 'loser' }),
      },
    });

    const hints = buildSlotHints(matches, deGroups, deRounds, 'double_elimination');

    expect(hints.has('9')).toBe(false);
  });

  it('skips dangling source references and slots without sources', () => {
    const matches = withSlots({
      8: {
        opponent1: makeOpponent(null, { source_node_id: '999', source_type: 'loser' }),
        opponent2: makeOpponent(null),
      },
    });

    const hints = buildSlotHints(matches, deGroups, deRounds, 'double_elimination');

    expect(hints.has('8')).toBe(false);
  });
});
