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
  getPairConfig: (name: string) =>
    name === 'Early' ? { primary: '6:30 PM', secondary: '7:00 PM' } : undefined,
  getBackToBackPairName: (slot: string) =>
    slot === '6:30 PM' || slot === '7:00 PM' ? 'Early' : null,
}));

// Import after mocks
import { TimeslotBatchService } from '../TimeslotBatchService';

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

const insertSelectSingleChain = (result: { data: unknown; error: unknown }) => ({
  insert: () => ({ select: () => ({ single: () => Promise.resolve(result) }) }),
});

const deleteEqChain = (result: { error: unknown }) => ({
  delete: () => ({ eq: () => Promise.resolve(result) }),
});

// ─── batchAssignBackToBackTimeslots ───────────────────────────────────────────

describe('TimeslotBatchService.batchAssignBackToBackTimeslots', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts 2 rows per team and returns transformed results', async () => {
    const rows = [
      makeRawSlot({ id: 'ts-1', team_id: 'team-1', match_sequence: 1 }),
      makeRawSlot({ id: 'ts-2', team_id: 'team-1', timeslot: '7:00 PM', match_sequence: 2 }),
    ];
    mockFrom.mockReturnValue(insertSelectChain({ data: rows, error: null }));

    const result = await TimeslotBatchService.batchAssignBackToBackTimeslots(
      new Date('2026-04-17'),
      ['team-1'],
      'Early'
    );

    expect(result).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith('team_timeslots');
  });

  it('throws ValidationError for invalid pairName', async () => {
    await expect(
      TimeslotBatchService.batchAssignBackToBackTimeslots(new Date('2026-04-17'), ['team-1'], 'Bad')
    ).rejects.toThrow(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(insertSelectChain({ data: null, error: null }));
    const result = await TimeslotBatchService.batchAssignBackToBackTimeslots(
      new Date('2026-04-17'),
      ['team-1'],
      'Early'
    );
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(insertSelectChain({ data: null, error: pgError() }));
    await expect(
      TimeslotBatchService.batchAssignBackToBackTimeslots(
        new Date('2026-04-17'),
        ['team-1'],
        'Early'
      )
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── insertTimeslot ───────────────────────────────────────────────────────────

describe('TimeslotBatchService.insertTimeslot', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the inserted row on success', async () => {
    const row = makeRawSlot();
    mockFrom.mockReturnValue(insertSelectSingleChain({ data: row, error: null }));

    const result = await TimeslotBatchService.insertTimeslot('2026-04-17', 'team-1', '6:30 PM');

    expect(result).toEqual(row);
    expect(mockFrom).toHaveBeenCalledWith('team_timeslots');
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(insertSelectSingleChain({ data: null, error: pgError() }));
    await expect(
      TimeslotBatchService.insertTimeslot('2026-04-17', 'team-1', '6:30 PM')
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── deleteTimeslotSimple ─────────────────────────────────────────────────────

describe('TimeslotBatchService.deleteTimeslotSimple', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue(deleteEqChain({ error: null }));
    await expect(TimeslotBatchService.deleteTimeslotSimple('ts-1')).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('team_timeslots');
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(deleteEqChain({ error: pgError() }));
    await expect(TimeslotBatchService.deleteTimeslotSimple('ts-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── batchInsertTimeslots ─────────────────────────────────────────────────────

describe('TimeslotBatchService.batchInsertTimeslots', () => {
  beforeEach(() => vi.clearAllMocks());

  const insertData = [
    { match_date: '2026-04-17', team_id: 'team-1', timeslot: '6:30 PM' },
    { match_date: '2026-04-17', team_id: 'team-2', timeslot: '6:30 PM' },
  ];

  it('returns inserted rows on success', async () => {
    const rows = insertData.map((d, i) => ({ ...makeRawSlot({ id: `ts-${i}` }), ...d }));
    mockFrom.mockReturnValue(insertSelectChain({ data: rows, error: null }));

    const result = await TimeslotBatchService.batchInsertTimeslots(insertData);

    expect(result).toHaveLength(2);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(insertSelectChain({ data: null, error: null }));
    const result = await TimeslotBatchService.batchInsertTimeslots(insertData);
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(insertSelectChain({ data: null, error: pgError() }));
    await expect(TimeslotBatchService.batchInsertTimeslots(insertData)).rejects.toThrow(
      DatabaseError
    );
  });
});
