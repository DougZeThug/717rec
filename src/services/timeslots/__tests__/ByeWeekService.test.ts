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
import { ByeWeekService } from '../ByeWeekService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeByeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'ts-bye-1',
  match_date: '2026-04-17',
  timeslot: 'BYE',
  team_id: 'team-1',
  created_at: '2026-04-17T00:00:00Z',
  is_back_to_back: false,
  is_double_header: false,
  pair_slot: null,
  match_sequence: null,
  teams: null,
  ...overrides,
});

// insert → select → single
const singleChain = (result: { data: unknown; error: unknown }) => ({
  insert: () => ({ select: () => ({ single: () => Promise.resolve(result) }) }),
});

// insert → select (batch)
const batchChain = (result: { data: unknown; error: unknown }) => ({
  insert: () => ({ select: () => Promise.resolve(result) }),
});

// delete → eq → eq
const deleteChain = (result: { error: unknown }) => ({
  delete: () => ({ eq: () => ({ eq: () => Promise.resolve(result) }) }),
});

// ─── assignByeWeek ────────────────────────────────────────────────────────────

describe('ByeWeekService.assignByeWeek', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a TeamTimeslot with timeslot=BYE on success', async () => {
    mockFrom.mockReturnValue(singleChain({ data: makeByeRow(), error: null }));

    const result = await ByeWeekService.assignByeWeek(new Date('2026-04-17'), 'team-1');

    expect(result.timeslot).toBe('BYE');
    expect(result.is_back_to_back).toBe(false);
    expect(result.is_double_header).toBe(false);
    expect(mockFrom).toHaveBeenCalledWith('team_timeslots');
  });

  it('maps teams when present in response', async () => {
    const row = makeByeRow({
      teams: { id: 't-1', name: 'Eagles', logo_url: 'logo.png', image_url: 'img.png' },
    });
    mockFrom.mockReturnValue(singleChain({ data: row, error: null }));

    const result = await ByeWeekService.assignByeWeek(new Date('2026-04-17'), 'team-1');

    expect(result.teams).toMatchObject({ name: 'Eagles' });
  });

  it('sets teams to undefined when null', async () => {
    mockFrom.mockReturnValue(singleChain({ data: makeByeRow({ teams: null }), error: null }));
    const result = await ByeWeekService.assignByeWeek(new Date('2026-04-17'), 'team-1');
    expect(result.teams).toBeUndefined();
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(singleChain({ data: null, error: pgError() }));
    await expect(ByeWeekService.assignByeWeek(new Date('2026-04-17'), 'team-1')).rejects.toThrow(
      DatabaseError
    );
  });
});

// ─── batchAssignByeWeeks ──────────────────────────────────────────────────────

describe('ByeWeekService.batchAssignByeWeeks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns an array of TeamTimeslots on success', async () => {
    const rows = [
      makeByeRow({ id: 'ts-1', team_id: 'team-1' }),
      makeByeRow({ id: 'ts-2', team_id: 'team-2' }),
    ];
    mockFrom.mockReturnValue(batchChain({ data: rows, error: null }));

    const result = await ByeWeekService.batchAssignByeWeeks(new Date('2026-04-17'), [
      'team-1',
      'team-2',
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].timeslot).toBe('BYE');
  });

  it('returns empty array when data is empty', async () => {
    mockFrom.mockReturnValue(batchChain({ data: [], error: null }));
    const result = await ByeWeekService.batchAssignByeWeeks(new Date('2026-04-17'), ['team-1']);
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(batchChain({ data: null, error: pgError() }));
    await expect(
      ByeWeekService.batchAssignByeWeeks(new Date('2026-04-17'), ['team-1'])
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── removeByeWeek ────────────────────────────────────────────────────────────

describe('ByeWeekService.removeByeWeek', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue(deleteChain({ error: null }));
    await expect(ByeWeekService.removeByeWeek('ts-bye-1')).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('team_timeslots');
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(deleteChain({ error: pgError() }));
    await expect(ByeWeekService.removeByeWeek('ts-bye-1')).rejects.toThrow(DatabaseError);
  });
});
