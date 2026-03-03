import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (fn: string, args: unknown) => mockRpc(fn, args),
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  matchLog: vi.fn(),
  teamLog: vi.fn(),
  authLog: vi.fn(),
  warnLog: vi.fn(),
  scoreLog: vi.fn(),
  dbLog: vi.fn(),
}));

vi.mock('@/utils/performance', () => ({
  withTiming: vi.fn((fn: () => unknown) => fn()),
}));

// Import after mocks
import { HeadToHeadService } from '../HeadToHeadService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeH2HResponse = (opponentId: string) => ({
  opponent_id: opponentId,
  wins: 2,
  losses: 1,
  total_matches: 3,
});

const makeTeam = (id: string, name: string) => ({
  id,
  name,
  image_url: null,
});

const makeMatchHistory = (teamId: string, opponentId: string) => ({
  match_id: 'match-x',
  match_date: '2025-03-01T00:00:00Z',
  team1_id: teamId,
  team2_id: opponentId,
  team1_score: 2,
  team2_score: 1,
  iscompleted: true,
});

// ─── getTeamHeadToHead ────────────────────────────────────────────────────────

describe('HeadToHeadService.getTeamHeadToHead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when team has no opponents', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const records = await HeadToHeadService.getTeamHeadToHead('team-1');
    expect(records).toEqual([]);
  });

  it('returns head-to-head records enriched with opponent name and image', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [makeH2HResponse('opponent-1')],
      error: null,
    });

    mockFrom.mockReturnValue({
      select: () => ({
        in: () =>
          Promise.resolve({
            data: [makeTeam('opponent-1', 'Thunder')],
            error: null,
          }),
      }),
    });

    const records = await HeadToHeadService.getTeamHeadToHead('team-1');
    expect(records).toHaveLength(1);
    expect(records[0].opponent_id).toBe('opponent-1');
    expect(records[0].opponent_name).toBe('Thunder');
  });

  it('uses "Unknown Team" when opponent is not found in teams table', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [makeH2HResponse('missing-opponent')],
      error: null,
    });

    mockFrom.mockReturnValue({
      select: () => ({
        in: () => Promise.resolve({ data: [], error: null }),
      }),
    });

    const records = await HeadToHeadService.getTeamHeadToHead('team-1');
    expect(records[0].opponent_name).toBe('Unknown Team');
  });

  it('throws DatabaseError on RPC error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        message: 'function not found',
        code: '42883',
        details: null,
        hint: null,
        name: 'PostgrestError',
      },
    });

    await expect(HeadToHeadService.getTeamHeadToHead('team-1')).rejects.toThrow(DatabaseError);
  });

  it('throws DatabaseError when team name fetch fails', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [makeH2HResponse('opponent-1')],
      error: null,
    });

    mockFrom.mockReturnValue({
      select: () => ({
        in: () =>
          Promise.resolve({
            data: null,
            error: {
              message: 'teams fetch error',
              code: '42P01',
              details: null,
              hint: null,
              name: 'PostgrestError',
            },
          }),
      }),
    });

    await expect(HeadToHeadService.getTeamHeadToHead('team-1')).rejects.toThrow(DatabaseError);
  });

  it('calls the get_head_to_head_records RPC function with correct team id', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await HeadToHeadService.getTeamHeadToHead('team-xyz');
    expect(mockRpc).toHaveBeenCalledWith('get_head_to_head_records', { p_team_id: 'team-xyz' });
  });
});

// ─── getOpponentHistory ───────────────────────────────────────────────────────

describe('HeadToHeadService.getOpponentHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no head-to-head record exists for that opponent', async () => {
    // getTeamHeadToHead returns empty — no record for opponent
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await HeadToHeadService.getOpponentHistory('team-1', 'opponent-1');
    expect(result).toBeNull();
  });

  it('returns match history and summary when records exist', async () => {
    // First RPC call: getTeamHeadToHead
    mockRpc.mockResolvedValueOnce({
      data: [makeH2HResponse('opponent-1')],
      error: null,
    });

    // Teams lookup for getTeamHeadToHead
    mockFrom.mockReturnValueOnce({
      select: () => ({
        in: () =>
          Promise.resolve({
            data: [makeTeam('opponent-1', 'Thunder')],
            error: null,
          }),
      }),
    });

    // Second RPC call: get_opponent_match_history
    mockRpc.mockResolvedValueOnce({
      data: [makeMatchHistory('team-1', 'opponent-1')],
      error: null,
    });

    const result = await HeadToHeadService.getOpponentHistory('team-1', 'opponent-1');

    expect(result).not.toBeNull();
    expect(result!.matches).toHaveLength(1);
    expect(result!.summary.opponent_id).toBe('opponent-1');
    expect(result!.summary.wins).toBe(2);
  });

  it('throws DatabaseError when match history RPC fails', async () => {
    // Head-to-head records success
    mockRpc.mockResolvedValueOnce({
      data: [makeH2HResponse('opponent-1')],
      error: null,
    });

    // Teams lookup
    mockFrom.mockReturnValueOnce({
      select: () => ({
        in: () =>
          Promise.resolve({
            data: [makeTeam('opponent-1', 'Thunder')],
            error: null,
          }),
      }),
    });

    // Match history RPC fails
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'rpc error',
        code: '42883',
        details: null,
        hint: null,
        name: 'PostgrestError',
      },
    });

    await expect(
      HeadToHeadService.getOpponentHistory('team-1', 'opponent-1')
    ).rejects.toThrow(DatabaseError);
  });

  it('passes correct arguments to the match history RPC', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [makeH2HResponse('opp-2')],
      error: null,
    });

    mockFrom.mockReturnValueOnce({
      select: () => ({
        in: () =>
          Promise.resolve({ data: [makeTeam('opp-2', 'Lightning')], error: null }),
      }),
    });

    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    await HeadToHeadService.getOpponentHistory('my-team', 'opp-2');

    expect(mockRpc).toHaveBeenCalledWith('get_opponent_match_history', {
      p_team_id: 'my-team',
      p_opponent_id: 'opp-2',
    });
  });

  it('returns empty matches array when match history is null', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [makeH2HResponse('opponent-1')],
      error: null,
    });

    mockFrom.mockReturnValueOnce({
      select: () => ({
        in: () =>
          Promise.resolve({ data: [makeTeam('opponent-1', 'Storm')], error: null }),
      }),
    });

    // RPC returns null data (no matches)
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await HeadToHeadService.getOpponentHistory('team-1', 'opponent-1');
    expect(result!.matches).toEqual([]);
  });
});
