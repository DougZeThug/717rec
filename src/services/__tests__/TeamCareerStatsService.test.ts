import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (fn: string, args: unknown) => mockRpc(fn, args) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

// Import after mocks
import { fetchBatchHeadToHead } from '../TeamCareerStatsService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'rpc failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeH2HRow = (team1Id: string, team2Id: string) => ({
  team1_id: team1Id,
  team2_id: team2Id,
  team1_wins: 3,
  team2_wins: 1,
  total_matches: 4,
  team1_game_wins: 7,
  team2_game_wins: 3,
});

// ─── fetchBatchHeadToHead ─────────────────────────────────────────────────────

describe('fetchBatchHeadToHead', () => {
  beforeEach(() => vi.clearAllMocks());

  const pairs = [
    { team1: 't1', team2: 't2' },
    { team1: 't3', team2: 't4' },
  ];

  it('returns a Map with both orderings of each pair', async () => {
    const rows = [makeH2HRow('t1', 't2')];
    mockRpc.mockResolvedValue({ data: rows, error: null });

    const result = await fetchBatchHeadToHead(pairs);

    expect(mockRpc).toHaveBeenCalledWith('get_batch_head_to_head', expect.any(Object));
    expect(result.has('t1-t2')).toBe(true);
    expect(result.has('t2-t1')).toBe(true);

    expect(result.get('t1-t2')).toMatchObject({
      team1Wins: 3,
      team2Wins: 1,
      totalMatches: 4,
      isFirstMeeting: false,
    });
    expect(result.get('t2-t1')).toMatchObject({ team1Wins: 1, team2Wins: 3 });
  });

  it('returns empty Map when no results', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await fetchBatchHeadToHead(pairs);
    expect(result.size).toBe(0);
  });

  it('marks isFirstMeeting=true when total_matches is 0', async () => {
    const row = { ...makeH2HRow('t1', 't2'), total_matches: 0, team1_wins: 0, team2_wins: 0 };
    mockRpc.mockResolvedValue({ data: [row], error: null });

    const result = await fetchBatchHeadToHead(pairs);
    expect(result.get('t1-t2')).toMatchObject({ isFirstMeeting: true });
  });

  it('throws DatabaseError on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(fetchBatchHeadToHead(pairs)).rejects.toThrow(DatabaseError);
  });
});
