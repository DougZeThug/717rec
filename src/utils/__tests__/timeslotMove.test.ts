import { describe, expect, it } from 'vitest';

import type { TeamTimeslot } from '@/types/timeslots';
import {
  buildMovePlan,
  describeBlock,
  describeMovePlan,
  isActionable,
  parseRequestedBlock,
  readTeamNight,
} from '@/utils/timeslotMove';

const row = (overrides: Partial<TeamTimeslot> = {}): TeamTimeslot => ({
  id: 'ts-1',
  match_date: '2026-09-17',
  timeslot: '6:00 PM',
  team_id: 'team-1',
  created_at: '2026-09-10T00:00:00Z',
  is_back_to_back: true,
  is_double_header: false,
  pair_slot: '6:30 PM',
  match_sequence: 1,
  ...overrides,
});

/** The two rows one block writes. */
const block = (first: string, second: string, teamId = 'team-1', idPrefix = 'b') => [
  row({
    id: `${idPrefix}-1`,
    team_id: teamId,
    timeslot: first,
    pair_slot: second,
    match_sequence: 1,
  }),
  row({
    id: `${idPrefix}-2`,
    team_id: teamId,
    timeslot: second,
    pair_slot: first,
    match_sequence: 2,
  }),
];

const byeRow = (teamId = 'team-1', id = 'bye-1') =>
  row({
    id,
    team_id: teamId,
    timeslot: 'BYE',
    is_back_to_back: false,
    pair_slot: null,
    match_sequence: null,
  });

describe('parseRequestedBlock', () => {
  // The team types this into a plain text box with no validation at all, so
  // the readings below are the ones that must survive.
  it.each([
    ['7:00 PM', '7:00 PM'],
    ['7:00 pm', '7:00 PM'],
    ['7:00PM', '7:00 PM'],
    ['  7:00 PM  ', '7:00 PM'],
    ['7:00   PM', '7:00 PM'],
    ['7 PM', '7:00 PM'],
    ['7pm', '7:00 PM'],
    ['7p', '7:00 PM'],
    ['7', '7:00 PM'],
    ['5', '5:00 PM'],
    ['9', '9:00 PM'],
    ['7:30', '7:30 PM'],
    ['8:30 pm', '8:30 PM'],
    ['19:00', '7:00 PM'],
    ['18:30', '6:30 PM'],
    ['17:00', '5:00 PM'],
  ])('reads %s as %s', (input, expected) => {
    expect(parseRequestedBlock(input)).toBe(expected);
  });

  // Everything here has to come back as "I do not know". A wrong reading would
  // move a team to a time nobody asked for.
  it.each([
    ['9:30 PM'], // a real stored time, but it starts no block
    ['10:00 PM'],
    ['10 PM'],
    ['4:30 PM'],
    ['4'],
    ['10'],
    ['11'],
    ['12'],
    ['12 PM'],
    ['7:00 AM'],
    ['7am'],
    ['7:15 PM'],
    ['6-7'],
    ['6:00 or 6:30'],
    ['early'],
    ['as early as possible'],
    ['7ish'],
    ['whenever'],
    ['BYE'],
    [''],
    ['   '],
  ])('refuses to guess at %s', (input) => {
    expect(parseRequestedBlock(input)).toBeNull();
  });

  it('refuses an empty field', () => {
    expect(parseRequestedBlock(null)).toBeNull();
    expect(parseRequestedBlock()).toBeNull();
  });
});

describe('describeBlock', () => {
  it('names both times a block books', () => {
    expect(describeBlock('6:30 PM')).toBe('6:30 + 7:00 PM');
    expect(describeBlock('9:00 PM')).toBe('9:00 + 9:30 PM');
  });

  it('names a bye as a bye', () => {
    expect(describeBlock('BYE')).toBe('bye');
  });
});

describe('readTeamNight', () => {
  it('counts one block from the two rows it writes', () => {
    const night = readTeamNight(block('6:00 PM', '6:30 PM'), 'team-1');

    expect(night.blocks).toEqual(['6:00 PM']);
    expect(night.rowIds).toEqual(['b-1', 'b-2']);
    expect(night.hasBye).toBe(false);
  });

  it('counts two blocks for a double header', () => {
    const night = readTeamNight(
      [
        ...block('6:00 PM', '6:30 PM', 'team-1', 'a'),
        ...block('8:00 PM', '8:30 PM', 'team-1', 'b'),
      ],
      'team-1'
    );

    expect(night.blocks).toEqual(['6:00 PM', '8:00 PM']);
    expect(night.rowIds).toHaveLength(4);
  });

  it('ignores other teams', () => {
    const night = readTeamNight(
      [
        ...block('6:00 PM', '6:30 PM', 'team-1', 'a'),
        ...block('8:00 PM', '8:30 PM', 'team-2', 'b'),
      ],
      'team-1'
    );

    expect(night.rowIds).toEqual(['a-1', 'a-2']);
  });
});

describe('buildMovePlan', () => {
  it('books a team that has nothing that night', () => {
    const plan = buildMovePlan([], 'team-1', '7:00 PM');

    expect(plan.kind).toBe('book');
    expect(plan.removeIds).toEqual([]);
    expect(isActionable(plan)).toBe(true);
  });

  it('moves a team that holds one block, clearing both its rows', () => {
    const plan = buildMovePlan(block('6:00 PM', '6:30 PM'), 'team-1', '7:00 PM');

    expect(plan.kind).toBe('move');
    expect(plan.removeIds).toEqual(['b-1', 'b-2']);
  });

  it('moves a team off a bye onto a block', () => {
    const plan = buildMovePlan([byeRow()], 'team-1', '7:00 PM');

    expect(plan.kind).toBe('move');
    expect(plan.removeIds).toEqual(['bye-1']);
  });

  it('clears everything for a bye', () => {
    const plan = buildMovePlan(block('6:00 PM', '6:30 PM'), 'team-1', 'BYE');

    expect(plan.kind).toBe('clear-all');
    expect(plan.removeIds).toEqual(['b-1', 'b-2']);
  });

  it('says there is nothing to do when the team is already in the block', () => {
    const plan = buildMovePlan(block('7:00 PM', '7:30 PM'), 'team-1', '7:00 PM');

    expect(plan.kind).toBe('already');
    expect(isActionable(plan)).toBe(false);
  });

  it('says there is nothing to do when the team already has the bye', () => {
    expect(buildMovePlan([byeRow()], 'team-1', 'BYE').kind).toBe('already');
  });

  // A double header is two games. A time change names a time, not a game, so
  // one press could only guess — and guessing deletes a game.
  it('refuses to guess which game of a double header to move', () => {
    const plan = buildMovePlan(
      [
        ...block('6:00 PM', '6:30 PM', 'team-1', 'a'),
        ...block('8:00 PM', '8:30 PM', 'team-1', 'b'),
      ],
      'team-1',
      '7:00 PM'
    );

    expect(plan.kind).toBe('ambiguous');
    expect(isActionable(plan)).toBe(false);
  });

  it('refuses even when the wanted block is one the team already holds', () => {
    const plan = buildMovePlan(
      [
        ...block('6:00 PM', '6:30 PM', 'team-1', 'a'),
        ...block('8:00 PM', '8:30 PM', 'team-1', 'b'),
      ],
      'team-1',
      '8:00 PM'
    );

    expect(plan.kind).toBe('ambiguous');
  });

  // A bye is unambiguous even for a double header: it means no games at all.
  it('still gives a double-header team a bye in one press', () => {
    const plan = buildMovePlan(
      [
        ...block('6:00 PM', '6:30 PM', 'team-1', 'a'),
        ...block('8:00 PM', '8:30 PM', 'team-1', 'b'),
      ],
      'team-1',
      'BYE'
    );

    expect(plan.kind).toBe('clear-all');
    expect(plan.removeIds).toHaveLength(4);
  });

  it('plans nothing at all when the requested time could not be read', () => {
    const plan = buildMovePlan(block('6:00 PM', '6:30 PM'), 'team-1', null);

    expect(plan.kind).toBe('unknown-time');
    expect(isActionable(plan)).toBe(false);
  });
});

describe('describeMovePlan', () => {
  const context = { teamName: '3 Amigos', dateLabel: 'Thursday, 17 September' };

  it('names both the old time and the new block for a move', () => {
    const words = describeMovePlan(
      buildMovePlan(block('6:00 PM', '6:30 PM'), 'team-1', '7:00 PM'),
      context
    );

    expect(words.title).toBe('Move 3 Amigos');
    expect(words.body).toContain('the 6:00 + 6:30 PM block');
    expect(words.body).toContain('the 7:00 + 7:30 PM block');
    expect(words.body).toContain('Thursday, 17 September');
    expect(words.action).toBe('Move them');
  });

  it('names every game a bye removes', () => {
    const words = describeMovePlan(
      buildMovePlan(
        [
          ...block('6:00 PM', '6:30 PM', 'team-1', 'a'),
          ...block('8:00 PM', '8:30 PM', 'team-1', 'b'),
        ],
        'team-1',
        'BYE'
      ),
      context
    );

    expect(words.body).toContain('the 6:00 + 6:30 PM block');
    expect(words.body).toContain('the 8:00 + 8:30 PM block');
    expect(words.body).toContain('not playing');
    expect(words.action).toBe('Give the bye');
  });

  it('offers no button when the team has two games', () => {
    const words = describeMovePlan(
      buildMovePlan(
        [
          ...block('6:00 PM', '6:30 PM', 'team-1', 'a'),
          ...block('8:00 PM', '8:30 PM', 'team-1', 'b'),
        ],
        'team-1',
        '7:00 PM'
      ),
      context
    );

    expect(words.action).toBeNull();
    expect(words.body).toContain('does not say which game');
  });

  it('repeats the words the team actually typed when they cannot be read', () => {
    const words = describeMovePlan(buildMovePlan(block('6:00 PM', '6:30 PM'), 'team-1', null), {
      ...context,
      requestedText: 'as early as possible',
    });

    expect(words.body).toContain('"as early as possible"');
    expect(words.action).toBeNull();
  });

  it('says so plainly when there is nothing to change', () => {
    const words = describeMovePlan(
      buildMovePlan(block('7:00 PM', '7:30 PM'), 'team-1', '7:00 PM'),
      context
    );

    expect(words.title).toBe('Nothing to change');
    expect(words.action).toBeNull();
  });
});
