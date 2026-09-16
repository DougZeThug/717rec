import { describe, expect, it } from 'vitest';

import type { RawMatchRow } from '../matchTransformers';
import { transformDatabaseMatch, transformDatabaseMatches } from '../matchTransformers';

const row = (overrides: Partial<RawMatchRow> = {}): RawMatchRow => ({
  id: 'm1',
  team1_id: 't1',
  team2_id: 't2',
  date: '2026-12-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  iscompleted: false,
  ...overrides,
});

describe('transformDatabaseMatch date', () => {
  // A match with no date is not scheduled yet. Handing back the row's creation
  // time makes it look scheduled for whenever it happened to be typed in, and
  // every `!match.date` guard downstream stops working.
  it('leaves an unscheduled match without a date', () => {
    const result = transformDatabaseMatch(row({ date: null }), { normalizeDate: false });

    expect(result.date).toBeUndefined();
  });

  it('leaves it without one when normalizing too', () => {
    const result = transformDatabaseMatch(row({ date: null }));

    expect(result.date).toBeUndefined();
  });

  // created_at is still reported, just under its own name.
  it('still reports created_at separately', () => {
    const result = transformDatabaseMatch(row({ date: null }), { normalizeDate: false });

    expect(result.created_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('keeps a real date as it is when not normalizing', () => {
    const result = transformDatabaseMatch(row(), { normalizeDate: false });

    expect(result.date).toBe('2026-12-01T00:00:00.000Z');
  });

  it('transforms a list the same way', () => {
    const result = transformDatabaseMatches([row({ id: 'a', date: null }), row({ id: 'b' })], {
      normalizeDate: false,
    });

    expect(result.map((m) => m.date)).toEqual([undefined, '2026-12-01T00:00:00.000Z']);
  });
});
