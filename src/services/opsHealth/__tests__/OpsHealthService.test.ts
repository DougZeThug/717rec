import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

const mockFrom = vi.fn();

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

import { OpsHealthService } from '../OpsHealthService';

const pgError = (msg = 'boom') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

describe('OpsHealthService.fetchLastPowerSnapshot', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no snapshot exists', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        order: () => ({
          limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
      }),
    });
    expect(await OpsHealthService.fetchLastPowerSnapshot()).toBeNull();
  });

  it('returns the row plus a row count grouped by created_at', async () => {
    const created_at = '2026-07-15T04:00:00Z';
    mockFrom
      .mockReturnValueOnce({
        select: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    created_at,
                    snapshot_date: '2026-07-15',
                    week_number: 4,
                    season_id: 'season-1',
                  },
                  error: null,
                }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        select: () => ({
          eq: () => Promise.resolve({ count: 27, error: null }),
        }),
      });

    const snap = await OpsHealthService.fetchLastPowerSnapshot();
    expect(snap).toEqual({
      created_at,
      snapshot_date: '2026-07-15',
      week_number: 4,
      season_id: 'season-1',
      row_count: 27,
    });
  });

  it('throws DatabaseError when the initial select fails', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        order: () => ({
          limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: pgError() }) }),
        }),
      }),
    });
    await expect(OpsHealthService.fetchLastPowerSnapshot()).rejects.toThrow(DatabaseError);
  });
});

describe('OpsHealthService.fetchPendingOpsCounts', () => {
  beforeEach(() => vi.clearAllMocks());

  const chain = (count: number | null, error: unknown = null) => ({
    select: () => ({
      eq: () => Promise.resolve({ count, error }),
    }),
  });

  it('aggregates counts from all three tables', async () => {
    mockFrom
      .mockReturnValueOnce(chain(2))
      .mockReturnValueOnce(chain(5))
      .mockReturnValueOnce(chain(1));

    expect(await OpsHealthService.fetchPendingOpsCounts()).toEqual({
      pendingScoreSubmissions: 2,
      pendingTeamRequests: 5,
      newContactRequests: 1,
    });
  });

  it('coerces null counts to 0', async () => {
    mockFrom
      .mockReturnValueOnce(chain(null))
      .mockReturnValueOnce(chain(null))
      .mockReturnValueOnce(chain(null));
    expect(await OpsHealthService.fetchPendingOpsCounts()).toEqual({
      pendingScoreSubmissions: 0,
      pendingTeamRequests: 0,
      newContactRequests: 0,
    });
  });

  it('throws DatabaseError if any query errors', async () => {
    mockFrom
      .mockReturnValueOnce(chain(null, pgError()))
      .mockReturnValueOnce(chain(0))
      .mockReturnValueOnce(chain(0));
    await expect(OpsHealthService.fetchPendingOpsCounts()).rejects.toThrow(DatabaseError);
  });
});
