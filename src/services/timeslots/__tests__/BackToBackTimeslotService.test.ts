import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  scheduleLog: vi.fn(),
  teamLog: vi.fn(),
}));

// Import after mocks
import { BackToBackTimeslotService } from '../BackToBackTimeslotService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

// Two-step chain for deleteTimeslot: first fetch, then delete
const makeFetchAndDeleteMock = (
  fetchResult: { data: unknown; error: unknown },
  deleteResult: { error: unknown }
) => {
  let callCount = 0;
  return () => {
    callCount++;
    if (callCount === 1) {
      // fetchTimeslot: .select().eq().single()
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve(fetchResult) }) }),
      };
    }
    // delete: .delete().eq().eq().eq()  (back-to-back path)
    return {
      delete: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => Promise.resolve(deleteResult),
          }),
        }),
      }),
    };
  };
};

// ─── deleteTimeslot (back-to-back path) ──────────────────────────────────────

describe('BackToBackTimeslotService.deleteTimeslot — back-to-back', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes all pair slots when is_back_to_back is true', async () => {
    const fetchResult = {
      data: {
        team_id: 'team-1',
        match_date: '2026-04-17',
        is_back_to_back: true,
        pair_slot: '7:00 PM',
      },
      error: null,
    };
    mockFrom.mockImplementation(makeFetchAndDeleteMock(fetchResult, { error: null }));

    await expect(BackToBackTimeslotService.deleteTimeslot('ts-1')).resolves.toBeUndefined();
  });

  it('throws DatabaseError when the fetch step fails', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(BackToBackTimeslotService.deleteTimeslot('ts-1')).rejects.toThrow(DatabaseError);
  });

  it('throws DatabaseError when the delete step fails', async () => {
    const fetchResult = {
      data: {
        team_id: 'team-1',
        match_date: '2026-04-17',
        is_back_to_back: true,
        pair_slot: '7:00 PM',
      },
      error: null,
    };
    mockFrom.mockImplementation(
      makeFetchAndDeleteMock(fetchResult, { error: pgError('delete failed') })
    );
    await expect(BackToBackTimeslotService.deleteTimeslot('ts-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── deleteTimeslot (non-back-to-back path) ───────────────────────────────────

describe('BackToBackTimeslotService.deleteTimeslot — single slot', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes only the single slot when is_back_to_back is false', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    team_id: 'team-1',
                    match_date: '2026-04-17',
                    is_back_to_back: false,
                    pair_slot: null,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      // Simple delete by id
      return { delete: () => ({ eq: () => Promise.resolve({ error: null }) }) };
    });

    await expect(BackToBackTimeslotService.deleteTimeslot('ts-1')).resolves.toBeUndefined();
  });
});
