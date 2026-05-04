import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, ValidationError } from '@/types/errors';

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

// Mock autoSchedule/constants — return real-looking pair config
vi.mock('@/utils/autoSchedule/constants', () => ({
  getPairConfig: (name: string) =>
    name === 'Early' ? { primary: '6:30 PM', secondary: '7:00 PM', label: 'Early' } : undefined,
  getBackToBackPairName: (slot: string) => {
    if (slot === '6:30 PM' || slot === '7:00 PM') return 'Early';
    return null;
  },
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

const makeRawSlot = (overrides: Record<string, unknown> = {}) => ({
  id: 'ts-1',
  match_date: '2026-04-17',
  timeslot: '6:30 PM',
  team_id: 'team-1',
  created_at: '2026-04-17T00:00:00Z',
  is_back_to_back: true,
  is_double_header: false,
  pair_slot: '7:00 PM',
  match_sequence: 1,
  teams: null,
  ...overrides,
});

const insertSelectChain = (result: { data: unknown; error: unknown }) => ({
  insert: () => ({ select: () => Promise.resolve(result) }),
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

// ─── addBackToBackTimeslot ────────────────────────────────────────────────────

describe('BackToBackTimeslotService.addBackToBackTimeslot', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts both timeslot rows and returns transformed results', async () => {
    const rows = [
      makeRawSlot(),
      makeRawSlot({ id: 'ts-2', timeslot: '7:00 PM', match_sequence: 2 }),
    ];
    mockFrom.mockReturnValue(insertSelectChain({ data: rows, error: null }));

    const result = await BackToBackTimeslotService.addBackToBackTimeslot(
      new Date('2026-04-17'),
      'team-1',
      'Early'
    );

    expect(result).toHaveLength(2);
    expect(result[0].is_back_to_back).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('team_timeslots');
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(insertSelectChain({ data: null, error: null }));
    const result = await BackToBackTimeslotService.addBackToBackTimeslot(
      new Date('2026-04-17'),
      'team-1',
      'Early'
    );
    expect(result).toEqual([]);
  });

  it('throws ValidationError for invalid pairName', async () => {
    await expect(
      BackToBackTimeslotService.addBackToBackTimeslot(
        new Date('2026-04-17'),
        'team-1',
        'InvalidPair'
      )
    ).rejects.toThrow(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(insertSelectChain({ data: null, error: pgError() }));
    await expect(
      BackToBackTimeslotService.addBackToBackTimeslot(new Date('2026-04-17'), 'team-1', 'Early')
    ).rejects.toThrow(DatabaseError);
  });
});

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
