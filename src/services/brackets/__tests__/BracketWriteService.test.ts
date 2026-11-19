import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

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

// ─── deleteBracket ────────────────────────────────────────────────────────────

describe('deleteBracket', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({ delete: () => ({ eq: () => Promise.resolve({ error: null }) }) });
    await expect(deleteBracket('b-1')).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('brackets');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(deleteBracket('b-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── updateBracket ────────────────────────────────────────────────────────────

describe('updateBracket', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the patch to the brackets table', async () => {
    const update = vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) }));
    mockFrom.mockReturnValue({ update });

    await expect(updateBracket('b-1', { title: 'Renamed' })).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('brackets');
    expect(update).toHaveBeenCalledWith({ title: 'Renamed' });
  });

  it('can move a bracket to another division', async () => {
    const update = vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) }));
    mockFrom.mockReturnValue({ update });

    await updateBracket('b-1', { title: 'Renamed', division_id: 'd-2' });

    expect(update).toHaveBeenCalledWith({ title: 'Renamed', division_id: 'd-2' });
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(updateBracket('b-1', { title: 'Renamed' })).rejects.toThrow(DatabaseError);
  });
});

// ─── updatePlayoffMatchScores ─────────────────────────────────────────────────

describe('updatePlayoffMatchScores', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) });
    await expect(
      updatePlayoffMatchScores('m-1', {
        team1_score: 2,
        team2_score: 1,
        winner_id: 't1',
        loser_id: 't2',
        status: 'complete',
        updated_at: '2026-04-17',
      })
    ).resolves.toBeUndefined();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(
      updatePlayoffMatchScores('m-1', {
        team1_score: 2,
        team2_score: 1,
        winner_id: 't1',
        loser_id: 't2',
        status: 'complete',
        updated_at: '2026-04-17',
      })
    ).rejects.toThrow(DatabaseError);
  });
});
