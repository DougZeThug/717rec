import { describe, expect, it } from 'vitest';

import type { TeamRequestWithTeam } from '@/types/teamRequest';

import { buildTimeslotHandoff } from '../requestHandoff';

const TEAM_ID = '3f1b2c8e-5a41-4c9d-9f2a-77b0d6e8c123';

const request = (overrides: Partial<TeamRequestWithTeam> = {}): TeamRequestWithTeam => ({
  id: 'req-1',
  team_id: TEAM_ID,
  season_id: 'season-1',
  request_type: 'TIME_CHANGE',
  status: 'PENDING',
  match_date: '2026-09-17',
  current_timeslot: '6:00 PM',
  requested_timeslot: '8:00 PM',
  reason: null,
  admin_notes: null,
  submitted_by: null,
  submitted_by_name: 'The Baggers',
  processed_by: null,
  processed_at: null,
  created_at: '2026-09-10T00:00:00Z',
  updated_at: '2026-09-10T00:00:00Z',
  teams: { name: 'The Baggers' },
  ...overrides,
});

/** The query string, read back as parameters. */
const params = (search: string) => new URLSearchParams(search);

describe('buildTimeslotHandoff', () => {
  it('carries the night, the team and the block for a time change', () => {
    const { search, description } = buildTimeslotHandoff(request());

    expect(params(search).get('date')).toBe('2026-09-17');
    expect(params(search).get('team')).toBe(TEAM_ID);
    expect(params(search).get('slot')).toBe('8:00 PM');
    expect(description).toContain('The Baggers');
    expect(description).toContain('8:00 + 8:30 PM');
    expect(description).toContain('Approving does not move it');
  });

  it('reads a time the team typed loosely', () => {
    const { search } = buildTimeslotHandoff(request({ requested_timeslot: '7pm' }));

    expect(params(search).get('slot')).toBe('7:00 PM');
  });

  // The requested time is free text with no validation, so it can be anything.
  // Nothing is preselected on a guess, and the words the team used are quoted
  // back so the admin can see what was meant.
  it('leaves the block unchosen when the requested time is not one', () => {
    const { search, description } = buildTimeslotHandoff(
      request({ requested_timeslot: 'as early as possible' })
    );

    expect(params(search).get('slot')).toBeNull();
    expect(params(search).get('date')).toBe('2026-09-17');
    expect(params(search).get('team')).toBe(TEAM_ID);
    expect(description).toContain('"as early as possible"');
    expect(description).toContain('not one of the blocks');
  });

  // The screen that has to choose a block needs to see what was asked for, and
  // the address is the only thing that reaches it.
  it('carries the words the team used so the next screen can show them', () => {
    const { search } = buildTimeslotHandoff(
      request({ requested_timeslot: 'as early as possible' })
    );

    expect(params(search).get('asked')).toBe('as early as possible');
  });

  it('carries no words when the block was read cleanly', () => {
    const { search } = buildTimeslotHandoff(request());

    expect(params(search).get('asked')).toBeNull();
  });

  it('does not put an essay in the address', () => {
    const { search } = buildTimeslotHandoff(request({ requested_timeslot: 'x'.repeat(500) }));

    expect(params(search).get('asked')).toHaveLength(80);
  });

  it('leaves the block unchosen when no time was given at all', () => {
    const { search, description } = buildTimeslotHandoff(request({ requested_timeslot: null }));

    expect(params(search).get('slot')).toBeNull();
    expect(description).toContain('did not say which time');
  });

  // 9:30 PM is a legal stored time that starts no block, so it can never be
  // booked as one.
  it('leaves the block unchosen for a time that starts no block', () => {
    const { search } = buildTimeslotHandoff(request({ requested_timeslot: '9:30 PM' }));

    expect(params(search).get('slot')).toBeNull();
  });

  it('sends a bye request to a bye', () => {
    const { search, description } = buildTimeslotHandoff(
      request({ request_type: 'BYE_REQUEST', current_timeslot: null, requested_timeslot: null })
    );

    expect(params(search).get('slot')).toBe('BYE');
    expect(description).toContain('give The Baggers a bye');
  });

  // An approved cancellation means the team is not playing that night, which
  // is what a bye records.
  it('sends an emergency cancellation to a bye as well', () => {
    const { search, description } = buildTimeslotHandoff(
      request({
        request_type: 'EMERGENCY_CANCEL',
        current_timeslot: null,
        requested_timeslot: null,
      })
    );

    expect(params(search).get('slot')).toBe('BYE');
    expect(description).toContain('bye');
  });

  it('says so when the request never named a night', () => {
    const { search, description } = buildTimeslotHandoff(request({ match_date: null }));

    expect(params(search).get('date')).toBeNull();
    expect(params(search).get('team')).toBe(TEAM_ID);
    expect(description).toContain('did not name a night');
  });

  it('falls back to a plain noun when the team could not be named', () => {
    const { description } = buildTimeslotHandoff(request({ teams: undefined }));

    expect(description).toContain('the team');
  });
});
