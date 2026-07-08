/**
 * Integration-level guarantees for live-scoring finalization: a match result
 * can never be applied to team records twice, no matter which order the
 * writers (two scorers, or a scorer and an admin) arrive in.
 *
 * The database RPC enforces this with a `winner_id IS NULL` guard under
 * `FOR UPDATE`; these tests exercise the full client path (service → RPC
 * result → hook outcome) against a scripted RPC that mimics that contract.
 */
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: (...args: unknown[]) => mockRpc(...args) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  matchLog: vi.fn(),
  cacheLog: vi.fn(),
}));

import { FinalizeService } from '@/services/liveScoring/FinalizeService';

/**
 * In-memory stand-in for the finalize_live_match / reopen_live_match RPC
 * pair, implementing the same idempotency guards as the SQL.
 */
class FakeMatchDatabase {
  winnerId: string | null = null;
  iscompleted = false;
  teamWins = 0; // times the winner's team record was incremented

  finalizeRpc = (winner: string) => {
    // Guard: UPDATE ... WHERE winner_id IS NULL
    if (this.winnerId !== null || this.iscompleted) {
      return { data: { applied: false, reason: 'already_completed' }, error: null };
    }
    this.winnerId = winner;
    this.iscompleted = true;
    this.teamWins += 1;
    return {
      data: { applied: true, winner_id: winner, team1_game_wins: 2, team2_game_wins: 1 },
      error: null,
    };
  };

  reopenRpc = () => {
    // Guard: IF winner_id IS NULL THEN RETURN false
    if (this.winnerId === null) {
      return { data: false, error: null };
    }
    this.winnerId = null;
    this.iscompleted = false;
    this.teamWins -= 1;
    return { data: true, error: null };
  };
}

let db: FakeMatchDatabase;

beforeEach(() => {
  vi.clearAllMocks();
  db = new FakeMatchDatabase();
  mockRpc.mockImplementation((fn: string) => {
    if (fn === 'finalize_live_match') return Promise.resolve(db.finalizeRpc('team-1'));
    if (fn === 'reopen_live_match') return Promise.resolve(db.reopenRpc());
    throw new Error(`Unexpected RPC ${fn}`);
  });
});

describe('finalize idempotency (no double counting)', () => {
  it('two scorers finalizing the same match apply team records exactly once', async () => {
    const first = await FinalizeService.finalizeLiveMatch('match-1');
    const second = await FinalizeService.finalizeLiveMatch('match-1');

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.reason).toBe('already_completed');
    expect(db.teamWins).toBe(1);
  });

  it('a live finalize after a manual admin completion is a no-op', async () => {
    // Admin completed the match through the existing score-entry tools.
    db.winnerId = 'team-1';
    db.iscompleted = true;
    db.teamWins = 1;

    const result = await FinalizeService.finalizeLiveMatch('match-1');

    expect(result.applied).toBe(false);
    expect(db.teamWins).toBe(1);
  });

  it('reopen → re-finalize nets out to exactly one application', async () => {
    await FinalizeService.finalizeLiveMatch('match-1');
    const reopened = await FinalizeService.reopenLiveMatch('match-1');
    const again = await FinalizeService.finalizeLiveMatch('match-1');

    expect(reopened).toBe(true);
    expect(again.applied).toBe(true);
    expect(db.teamWins).toBe(1);
  });

  it('double reopen reverses team records only once', async () => {
    await FinalizeService.finalizeLiveMatch('match-1');
    const first = await FinalizeService.reopenLiveMatch('match-1');
    const second = await FinalizeService.reopenLiveMatch('match-1');

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(db.teamWins).toBe(0);
  });

  it('reopening a never-finalized match reverses nothing', async () => {
    const result = await FinalizeService.reopenLiveMatch('match-1');

    expect(result).toBe(false);
    expect(db.teamWins).toBe(0);
  });
});

describe('standings refresh wiring', () => {
  it('invalidateMatchRelatedQueries covers the queries standings depend on', async () => {
    // The finalize hook refreshes standings through the shared invalidation
    // helper — assert the helper touches the core keys so a rename there
    // can't silently detach live scoring from standings updates.
    const { invalidateMatchRelatedQueries } = await import(
      '@/hooks/matches/utils/queryCacheUtils'
    );
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateMatchRelatedQueries(queryClient);

    const flatKeys = spy.mock.calls
      .map(([arg]) => (arg as { queryKey?: unknown[] })?.queryKey?.[0])
      .filter(Boolean);
    expect(flatKeys).toEqual(expect.arrayContaining(['matches', 'standings', 'schedule']));

    // Team-record queries are covered by the predicate-based invalidation.
    const predicates = spy.mock.calls
      .map(([arg]) => (arg as { predicate?: (q: { queryKey: unknown[] }) => boolean })?.predicate)
      .filter((p): p is (q: { queryKey: unknown[] }) => boolean => typeof p === 'function');
    expect(predicates.some((p) => p({ queryKey: ['teams'] }))).toBe(true);
  });
});
