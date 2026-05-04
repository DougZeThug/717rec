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

vi.mock('@/utils/autoSchedule/constants', () => ({
  getPairConfig: (name: string) => {
    const configs: Record<string, { primary: string; secondary: string }> = {
      Early: { primary: '6:30 PM', secondary: '7:00 PM' },
      Mid: { primary: '7:30 PM', secondary: '8:00 PM' },
    };
    return configs[name] ?? undefined;
  },
  getBackToBackPairName: (slot: string) => {
    const map: Record<string, string> = {
      '6:30 PM': 'Early',
      '7:00 PM': 'Early',
      '7:30 PM': 'Mid',
      '8:00 PM': 'Mid',
    };
    return map[slot] ?? null;
  },
}));

// Import after mocks
import { DoubleHeaderService } from '../DoubleHeaderService';

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
  is_double_header: true,
  pair_slot: '7:00 PM',
  match_sequence: 1,
  teams: null,
  ...overrides,
});

const insertSelectChain = (result: { data: unknown; error: unknown }) => ({
  insert: () => ({ select: () => Promise.resolve(result) }),
});

// ─── assignDoubleHeader ───────────────────────────────────────────────────────

describe('DoubleHeaderService.assignDoubleHeader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts 4 rows and returns transformed timeslots', async () => {
    const rows = [
      makeRawSlot({ id: 'ts-1', timeslot: '6:30 PM', match_sequence: 1 }),
      makeRawSlot({ id: 'ts-2', timeslot: '7:00 PM', match_sequence: 2 }),
      makeRawSlot({ id: 'ts-3', timeslot: '7:30 PM', match_sequence: 1 }),
      makeRawSlot({ id: 'ts-4', timeslot: '8:00 PM', match_sequence: 2 }),
    ];
    mockFrom.mockReturnValue(insertSelectChain({ data: rows, error: null }));

    const result = await DoubleHeaderService.assignDoubleHeader(
      new Date('2026-04-17'),
      'team-1',
      '6:30 PM',
      '7:30 PM'
    );

    expect(result).toHaveLength(4);
    expect(result[0].is_double_header).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('team_timeslots');
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(insertSelectChain({ data: null, error: null }));
    const result = await DoubleHeaderService.assignDoubleHeader(
      new Date('2026-04-17'),
      'team-1',
      '6:30 PM',
      '7:30 PM'
    );
    expect(result).toEqual([]);
  });

  it('throws ValidationError for unrecognised slot1', async () => {
    await expect(
      DoubleHeaderService.assignDoubleHeader(new Date('2026-04-17'), 'team-1', 'INVALID', '7:30 PM')
    ).rejects.toThrow(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws ValidationError for unrecognised slot2', async () => {
    await expect(
      DoubleHeaderService.assignDoubleHeader(new Date('2026-04-17'), 'team-1', '6:30 PM', 'INVALID')
    ).rejects.toThrow(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(insertSelectChain({ data: null, error: pgError() }));
    await expect(
      DoubleHeaderService.assignDoubleHeader(new Date('2026-04-17'), 'team-1', '6:30 PM', '7:30 PM')
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── batchAssignDoubleHeaders ─────────────────────────────────────────────────

describe('DoubleHeaderService.batchAssignDoubleHeaders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts rows for all teams and returns results', async () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      makeRawSlot({ id: `ts-${i}`, team_id: i < 4 ? 'team-1' : 'team-2' })
    );
    mockFrom.mockReturnValue(insertSelectChain({ data: rows, error: null }));

    const result = await DoubleHeaderService.batchAssignDoubleHeaders(
      new Date('2026-04-17'),
      ['team-1', 'team-2'],
      '6:30 PM',
      '7:30 PM'
    );

    expect(result).toHaveLength(8);
  });

  it('throws ValidationError for invalid slot', async () => {
    await expect(
      DoubleHeaderService.batchAssignDoubleHeaders(
        new Date('2026-04-17'),
        ['team-1'],
        'BAD',
        '7:30 PM'
      )
    ).rejects.toThrow(ValidationError);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(insertSelectChain({ data: null, error: pgError() }));
    await expect(
      DoubleHeaderService.batchAssignDoubleHeaders(
        new Date('2026-04-17'),
        ['team-1'],
        '6:30 PM',
        '7:30 PM'
      )
    ).rejects.toThrow(DatabaseError);
  });
});
