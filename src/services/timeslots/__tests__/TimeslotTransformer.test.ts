import { describe, expect, it } from 'vitest';

import { TimeslotTransformer } from '../TimeslotTransformer';
import { TimeslotRow } from '../types';

const makeRaw = (overrides: Partial<TimeslotRow> = {}): TimeslotRow => ({
  id: 'ts-1',
  match_date: '2026-04-17',
  timeslot: '6:30 PM',
  team_id: 'team-1',
  created_at: '2026-04-17T00:00:00Z',
  is_back_to_back: false,
  is_double_header: false,
  pair_slot: null,
  match_sequence: null,
  teams: null,
  ...overrides,
});

// ─── formatTimeslotResponse ───────────────────────────────────────────────────

describe('formatTimeslotResponse', () => {
  it('returns empty array for null input', () => {
    expect(TimeslotTransformer.formatTimeslotResponse(null as unknown as [])).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(TimeslotTransformer.formatTimeslotResponse([])).toEqual([]);
  });

  it('accepts minimally populated typed row and preserves defaults', () => {
    const typedRow: TimeslotRow = {
      id: 'typed-1',
      match_date: '2026-04-18',
      timeslot: '7:00 PM',
      team_id: 'team-typed',
      is_back_to_back: null,
      is_double_header: null,
      pair_slot: undefined,
      match_sequence: undefined,
      teams: null,
    };

    const result = TimeslotTransformer.formatSingleTimeslot(typedRow);
    expect(result.is_back_to_back).toBe(false);
    expect(result.is_double_header).toBe(false);
    expect(result.pair_slot).toBeNull();
    expect(result.teams).toBeUndefined();
  });

  it('maps each item to TeamTimeslot shape', () => {
    const result = TimeslotTransformer.formatTimeslotResponse([makeRaw()]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ts-1');
    expect(result[0].timeslot).toBe('6:30 PM');
  });
});

// ─── formatSingleTimeslot ─────────────────────────────────────────────────────

describe('formatSingleTimeslot', () => {
  it('defaults is_back_to_back to false when absent', () => {
    const result = TimeslotTransformer.formatSingleTimeslot(
      makeRaw({ is_back_to_back: undefined })
    );
    expect(result.is_back_to_back).toBe(false);
  });

  it('defaults is_double_header to false when absent', () => {
    const result = TimeslotTransformer.formatSingleTimeslot(
      makeRaw({ is_double_header: undefined })
    );
    expect(result.is_double_header).toBe(false);
  });

  it('defaults pair_slot to null when absent', () => {
    const result = TimeslotTransformer.formatSingleTimeslot(makeRaw({ pair_slot: undefined }));
    expect(result.pair_slot).toBeNull();
  });

  it('maps teams when present', () => {
    const raw = makeRaw({
      teams: { id: 't-1', name: 'Eagles', logo_url: 'logo.png', image_url: 'img.png' },
    });
    const result = TimeslotTransformer.formatSingleTimeslot(raw);
    expect(result.teams).toMatchObject({ name: 'Eagles', divisionName: null });
  });

  it('sets teams to undefined when null', () => {
    const result = TimeslotTransformer.formatSingleTimeslot(makeRaw({ teams: null }));
    expect(result.teams).toBeUndefined();
  });
});

// ─── groupByTimeslot ──────────────────────────────────────────────────────────

describe('groupByTimeslot', () => {
  it('returns empty object for empty array', () => {
    expect(TimeslotTransformer.groupByTimeslot([])).toEqual({});
  });

  it('groups slots by timeslot value', () => {
    const ts1 = TimeslotTransformer.formatSingleTimeslot(makeRaw({ id: 'a', timeslot: '6:30 PM' }));
    const ts2 = TimeslotTransformer.formatSingleTimeslot(makeRaw({ id: 'b', timeslot: '7:30 PM' }));
    const ts3 = TimeslotTransformer.formatSingleTimeslot(makeRaw({ id: 'c', timeslot: '6:30 PM' }));

    const result = TimeslotTransformer.groupByTimeslot([ts1, ts2, ts3]);

    expect(result['6:30 PM']).toHaveLength(2);
    expect(result['7:30 PM']).toHaveLength(1);
    expect(result['6:30 PM'].map((s) => s.id)).toContain('a');
    expect(result['6:30 PM'].map((s) => s.id)).toContain('c');
  });
});
