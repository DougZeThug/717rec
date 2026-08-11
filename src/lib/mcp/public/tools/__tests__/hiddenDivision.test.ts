import { describe, expect, it } from 'vitest';

import { isHiddenDivision as isHiddenDivisionAuthed } from '../../../tools/_supabase';
import { isHiddenDivision } from '../_supabase';

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
    expect(isHiddenDivision(null)).toBe(false);
    expect(isHiddenDivision(undefined)).toBe(false);
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
