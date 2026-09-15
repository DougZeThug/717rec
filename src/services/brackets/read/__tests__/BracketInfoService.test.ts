import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, NotFoundError } from '@/types/errors';
import { getUIErrorMessage } from '@/utils/errorHandler';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

import {
  fetchBracketInfo,
  fetchBracketsOverview,
  fetchBracketWithDivision,
  fetchPlayoffBracketData,
} from '../BracketInfoService';

const pgError = (msg = 'query failed', code = '42P01') => ({
  message: msg,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeBracket = () => ({
  id: 'b-1',
  title: 'Gold Bracket',
  format: 'single_elimination',
  state: 'underway',
  division_id: 'd-1',
  challonge_tournament_id: null,
  uses_brackets_manager: false,
  created_at: '2026-01-01T00:00:00Z',
  wb_champion_id: null,
  bracket_data: null,
  migrated: false,
  migrated_at: null,
  reset_match_needed: false,
});

describe('BracketInfoService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps legacy underway state to in_progress', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: makeBracket(), error: null }) }),
      }),
    });

    const result = await fetchPlayoffBracketData('b-1');
    expect(result.state).toBe('in_progress');
    expect(result.name).toBe('Gold Bracket');
  });

  it('throws NotFoundError when playoff bracket is missing', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });

    await expect(fetchPlayoffBracketData('b-missing')).rejects.toThrow(NotFoundError);
  });

  it('returns brackets overview and applies season filter', async () => {
    const eq = vi.fn().mockResolvedValue({ data: [{ id: 'b-1', title: 'Gold' }], error: null });
    const order = vi.fn().mockReturnValue({ eq });

    mockFrom.mockReturnValue({
      select: () => ({ order }),
    });

    const result = await fetchBracketsOverview('s-1');
    expect(result).toHaveLength(1);
    expect(eq).toHaveBeenCalledWith('season_id', 's-1');
  });

  // Both of these used to pair .single() with ensureFound. Under .single()
  // PostgREST answers a 0-row result with an error (PGRST116), not with empty
  // data, so handleDatabaseError threw first and ensureFound was unreachable —
  // a deleted bracket produced "Cannot coerce the result to a single JSON
  // object" instead of the intended not-found. The mocks below are the shape
  // .maybeSingle() really returns.
  it('throws NotFoundError when bracket info is missing', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });

    await expect(fetchBracketInfo('b-1')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when the bracket with its division is missing', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });

    await expect(fetchBracketWithDivision('b-missing')).rejects.toThrow(NotFoundError);
  });

  // What the playoffs page puts on screen for a stale link.
  it('describes a missing bracket in words rather than PostgREST internals', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });

    const error = await fetchBracketInfo('b-1').catch((e: unknown) => e);
    const shown = getUIErrorMessage(error, 'Failed to load bracket');

    expect(shown).toBe("Failed to load bracket: Bracket with ID 'b-1' not found");
    expect(shown).not.toContain('coerce');
  });

  // The playoffs page reads the season off the bracket a link opens, so the
  // picker can agree with what is on screen.
  it('asks for the bracket season alongside the division', async () => {
    const select = vi.fn().mockReturnValue({
      eq: () => ({
        maybeSingle: () =>
          Promise.resolve({
            data: { ...makeBracket(), season_id: 's-past', divisions: { name: 'Gold' } },
            error: null,
          }),
      }),
    });
    mockFrom.mockReturnValue({ select });

    const result = await fetchBracketWithDivision('b-1');

    expect(select.mock.calls[0][0]).toContain('season_id');
    expect(result.season_id).toBe('s-past');
  });

  it('throws DatabaseError when bracket with division query fails', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });

    await expect(fetchBracketWithDivision('b-1')).rejects.toThrow(DatabaseError);
  });
});
