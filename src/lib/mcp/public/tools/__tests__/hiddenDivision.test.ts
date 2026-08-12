import { describe, expect, it } from 'vitest';

import {
  isHiddenDivision as isHiddenDivisionAuthed,
  isHiddenTeamRow as isHiddenTeamRowAuthed,
} from '../../../tools/_supabase';
import { isHiddenDivision, isHiddenTeamRow } from '../_supabase';

// Hidden-division teams leaked into get_standings and list_teams because those
// tools read team_season_stats, which has no Hidden filter of its own.
describe('isHiddenDivision', () => {
  it.each(['Hidden', 'hidden', 'HIDDEN', 'Hidden2', 'hidden2'])('treats %s as hidden', (name) => {
    expect(isHiddenDivision(name)).toBe(true);
  });

  it.each(['Competitive', 'Intermediate', 'Recreational', 'Cuspers'])(
    'treats %s as visible',
    (name) => {
      expect(isHiddenDivision(name)).toBe(false);
    }
  );

  it('treats a missing division as visible rather than dropping the team', () => {
    // Bound to a variable rather than passed as a literal: an inline `undefined`
    // in the final argument position is flagged as redundant, but the point here
    // is that a genuinely absent value is handled.
    const absent: string | undefined = undefined;
    expect(isHiddenDivision(null)).toBe(false);
    expect(isHiddenDivision(absent)).toBe(false);
    expect(isHiddenDivision('')).toBe(false);
  });

  it('does not match a division that merely contains "hidden"', () => {
    expect(isHiddenDivision('Not Hidden')).toBe(false);
  });

  it('behaves identically in the authenticated tool helpers', () => {
    expect(isHiddenDivisionAuthed('Hidden2')).toBe(true);
    expect(isHiddenDivisionAuthed('Competitive')).toBe(false);
    expect(isHiddenDivisionAuthed(null)).toBe(false);
  });
});

// team_season_stats.division_name is a denormalised copy that only refreshes on
// the next stats upsert, so it can disagree with where the team actually sits.
// The team's current division wins.
describe('isHiddenTeamRow', () => {
  it('hides a team whose live division is Hidden even while the cached name is stale', () => {
    expect(isHiddenTeamRow('Recreational', { divisions: { display_division: 'Hidden' } })).toBe(
      true
    );
  });

  it('shows a team restored to a real division even while the cached name still says Hidden', () => {
    expect(isHiddenTeamRow('Hidden', { divisions: { display_division: 'Recreational' } })).toBe(
      false
    );
  });

  it('catches Hidden2 through the division name when display_division is unset', () => {
    expect(isHiddenTeamRow('Intermediate', { divisions: { name: 'Hidden2' } })).toBe(true);
  });

  it('falls back to the cached label when the division join is missing', () => {
    const absentTeam: { divisions?: null } | undefined = undefined;
    expect(isHiddenTeamRow('Hidden', { divisions: null })).toBe(true);
    expect(isHiddenTeamRow('Hidden', null)).toBe(true);
    expect(isHiddenTeamRow('Hidden', absentTeam)).toBe(true);
    expect(isHiddenTeamRow('Competitive', null)).toBe(false);
  });

  it('treats a team with no division information at all as visible', () => {
    expect(isHiddenTeamRow(null, null)).toBe(false);
    expect(isHiddenTeamRow(null, { divisions: null })).toBe(false);
  });

  // PostgREST returns a to-one embed as an object, but the generated Supabase
  // types model these relationships as arrays. Both shapes must work.
  it('accepts the array shape the generated types describe', () => {
    expect(isHiddenTeamRow('Recreational', [{ divisions: [{ display_division: 'Hidden' }] }])).toBe(
      true
    );
    expect(isHiddenTeamRow('Hidden', [{ divisions: [{ display_division: 'Recreational' }] }])).toBe(
      false
    );
    expect(isHiddenTeamRow('Competitive', [])).toBe(false);
    expect(isHiddenTeamRow('Hidden', [{ divisions: [] }])).toBe(true);
  });

  it('behaves identically in the authenticated tool helpers', () => {
    expect(
      isHiddenTeamRowAuthed('Recreational', { divisions: { display_division: 'Hidden' } })
    ).toBe(true);
    expect(
      isHiddenTeamRowAuthed('Hidden', { divisions: { display_division: 'Competitive' } })
    ).toBe(false);
  });
});
