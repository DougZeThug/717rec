import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(), teamLog: vi.fn(),
}));

// Import after mocks
import { fetchTeamAnalysis, upsertTeamAnalysis } from '../TeamAnalysisService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg, code: '42P01', details: null, hint: null, name: 'PostgrestError',
});

const makeAnalysis = (overrides: Record<string, unknown> = {}) => ({
  id: 'analysis-1', team_id: 'team-1',
  overall: 'Strong team with good chemistry.',
  strengths: 'Great serves.', weaknesses: 'Inconsistent defense.',
  trends: 'Improving', rivalry_insights: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z',
  ...overrides,
});

// ─── fetchTeamAnalysis ────────────────────────────────────────────────────────

describe('fetchTeamAnalysis', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns analysis when found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: makeAnalysis(), error: null }) }),
      }),
    });
    const result = await fetchTeamAnalysis('team-1');
    expect(result).not.toBeNull();
    expect(result!.team_id).toBe('team-1');
    expect(mockFrom).toHaveBeenCalledWith('team_analysis');
  });

  it('returns null when no analysis exists', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });
    expect(await fetchTeamAnalysis('team-1')).toBeNull();
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchTeamAnalysis('team-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── upsertTeamAnalysis ───────────────────────────────────────────────────────

describe('upsertTeamAnalysis', () => {
  beforeEach(() => vi.clearAllMocks());

  const input = {
    overall: 'Great team.', strengths: 'Serves.', weaknesses: 'Defense.',
    trends: 'Stable', rivalry_insights: null,
  };

  it('returns upserted data on success', async () => {
    const row = makeAnalysis();
    mockFrom.mockReturnValue({
      upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }),
    });
    const result = await upsertTeamAnalysis('team-1', input, 'admin-1', 'admin-1');
    expect(result).toEqual(row);
    expect(mockFrom).toHaveBeenCalledWith('team_analysis');
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }) }),
    });
    await expect(upsertTeamAnalysis('team-1', input, 'admin-1', 'admin-1')).rejects.toThrow(DatabaseError);
  });
});
