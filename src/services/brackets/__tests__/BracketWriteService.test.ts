import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

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

// Import after mocks
import { deleteBracket, updateBracket, updatePlayoffMatchScores } from '../BracketWriteService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

// A write chain that ends in select('id').maybeSingle(), like the real client.
const writeChain = (result: { data: { id: string } | null; error: unknown }) => {
  const maybeSingle = vi.fn(() => Promise.resolve(result));
  const select = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ select }));
  return { eq, select };
};

const scores = {
  team1_score: 2,
  team2_score: 1,
  winner_id: 't1',
  loser_id: 't2',
  status: 'complete',
  updated_at: '2026-04-17',
};

// ─── deleteBracket ────────────────────────────────────────────────────────────

describe('deleteBracket', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    const { eq, select } = writeChain({ data: { id: 'b-1' }, error: null });
    mockFrom.mockReturnValue({ delete: () => ({ eq }) });
    await expect(deleteBracket('b-1')).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('brackets');
    expect(eq).toHaveBeenCalledWith('id', 'b-1');
    expect(select).toHaveBeenCalledWith('id');
  });

  it('throws DatabaseError on error', async () => {
    const { eq } = writeChain({ data: null, error: pgError() });
    mockFrom.mockReturnValue({ delete: () => ({ eq }) });
    await expect(deleteBracket('b-1')).rejects.toThrow(DatabaseError);
  });

  it('throws BusinessLogicError when no row was deleted', async () => {
    const { eq } = writeChain({ data: null, error: null });
    mockFrom.mockReturnValue({ delete: () => ({ eq }) });
    const attempt = deleteBracket('gone');
    await expect(attempt).rejects.toThrow(BusinessLogicError);
    await expect(attempt).rejects.toThrow(/^Nothing was deleted. This bracket/);
  });
});

// ─── updateBracket ────────────────────────────────────────────────────────────

describe('updateBracket', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the patch to the brackets table', async () => {
    const { eq, select } = writeChain({ data: { id: 'b-1' }, error: null });
    const update = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });

    await expect(updateBracket('b-1', { title: 'Renamed' })).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('brackets');
    expect(update).toHaveBeenCalledWith({ title: 'Renamed' });
    expect(eq).toHaveBeenCalledWith('id', 'b-1');
    expect(select).toHaveBeenCalledWith('id');
  });

  it('can move a bracket to another division', async () => {
    const { eq } = writeChain({ data: { id: 'b-1' }, error: null });
    const update = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });

    await updateBracket('b-1', { title: 'Renamed', division_id: 'd-2' });

    expect(update).toHaveBeenCalledWith({ title: 'Renamed', division_id: 'd-2' });
  });

  it('throws DatabaseError on error', async () => {
    const { eq } = writeChain({ data: null, error: pgError() });
    mockFrom.mockReturnValue({ update: () => ({ eq }) });
    await expect(updateBracket('b-1', { title: 'Renamed' })).rejects.toThrow(DatabaseError);
  });

  it('throws BusinessLogicError when no row was updated', async () => {
    const { eq } = writeChain({ data: null, error: null });
    mockFrom.mockReturnValue({ update: () => ({ eq }) });
    const attempt = updateBracket('gone', { title: 'Renamed' });
    await expect(attempt).rejects.toThrow(BusinessLogicError);
    await expect(attempt).rejects.toThrow(/^Nothing was saved. This bracket/);
  });
});

// ─── updatePlayoffMatchScores ─────────────────────────────────────────────────

describe('updatePlayoffMatchScores', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    const { eq, select } = writeChain({ data: { id: 'm-1' }, error: null });
    const update = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });

    await expect(updatePlayoffMatchScores('m-1', scores)).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('playoff_matches');
    expect(update).toHaveBeenCalledWith(scores);
    expect(eq).toHaveBeenCalledWith('id', 'm-1');
    expect(select).toHaveBeenCalledWith('id');
  });

  it('throws DatabaseError on error', async () => {
    const { eq } = writeChain({ data: null, error: pgError() });
    mockFrom.mockReturnValue({ update: () => ({ eq }) });
    await expect(updatePlayoffMatchScores('m-1', scores)).rejects.toThrow(DatabaseError);
  });

  it('throws BusinessLogicError when no row was updated', async () => {
    const { eq } = writeChain({ data: null, error: null });
    mockFrom.mockReturnValue({ update: () => ({ eq }) });
    const attempt = updatePlayoffMatchScores('gone', scores);
    await expect(attempt).rejects.toThrow(BusinessLogicError);
    await expect(attempt).rejects.toThrow(/^Nothing was saved. This match/);
  });
});
