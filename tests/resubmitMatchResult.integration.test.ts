/**
 * Integration-level guarantees for the atomic match-result resubmit path.
 *
 * The `resubmit_match_result` RPC is the single write point for admin score
 * submissions and edits: it reverses any prior counters, writes the new
 * scores/winner, applies new counters, and refreshes season stats — all in
 * one transaction. These tests exercise the full client path
 * (`updateMatchScore` hook util → `MatchWriteService` → RPC) against a
 * scripted RPC that mimics the SQL contract, guarding against:
 *   - double application on repeated identical submits (idempotency)
 *   - stat drift on winner-flip edits (reversal + reapply is atomic)
 *   - the client swallowing RPC errors from validation failures
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  matchLog: vi.fn(),
  cacheLog: vi.fn(),
  badgeLog: vi.fn(),
}));

// Isolate the RPC path: badge processing has its own tests and would
// otherwise fan out to dozens of unrelated Supabase mocks here.
vi.mock('@/services/BadgeProcessingService', () => ({
  BadgeProcessingService: new Proxy({}, { get: () => vi.fn().mockImplementation(async () => {}) }),
}));
vi.mock('@/services/FailedBadgeOperationsService', () => ({
  FailedBadgeOperationsService: { queueFailedOperation: vi.fn() },
}));

vi.mock('@/services/matches/MatchReadService', () => ({
  fetchMatchTeamIds: vi.fn((_matchId: string) =>
    Promise.resolve({
      team1_id: 'team-1',
      team2_id: 'team-2',
    })
  ),
}));

import { updateMatchScore } from '@/hooks/matches/utils/matchDatabaseUtils';

/**
 * In-memory stand-in for the `resubmit_match_result` RPC. Mirrors the SQL
 * contract: idempotent when the submitted result equals the stored one,
 * reverses previous counters on a winner change, and validates inputs.
 */
class FakeMatchRpc {
  winnerId: string | null = null;
  loserId: string | null = null;
  winnerGameWins = 0;
  loserGameWins = 0;
  // team_id -> { wins, losses, gameWins, gameLosses }
  counters: Record<string, { wins: number; losses: number; gw: number; gl: number }> = {
    'team-1': { wins: 0, losses: 0, gw: 0, gl: 0 },
    'team-2': { wins: 0, losses: 0, gw: 0, gl: 0 },
  };
  seasonStatsRefreshes = 0;
  rpcCalls = 0;

  handle = (args: {
    p_match_id: string;
    p_winner_id: string | null;
    p_loser_id: string | null;
    p_winner_game_wins: number;
    p_loser_game_wins: number;
  }) => {
    this.rpcCalls += 1;

    if (!args.p_winner_id || !args.p_loser_id) {
      return { data: null, error: { message: 'Winner and loser required' } };
    }
    if (args.p_winner_id === args.p_loser_id) {
      return { data: null, error: { message: 'Winner and loser must be different teams' } };
    }
    if (!this.counters[args.p_winner_id] || !this.counters[args.p_loser_id]) {
      return { data: null, error: { message: 'Winner/loser do not match teams on match' } };
    }

    const isSame =
      this.winnerId === args.p_winner_id &&
      this.loserId === args.p_loser_id &&
      this.winnerGameWins === args.p_winner_game_wins &&
      this.loserGameWins === args.p_loser_game_wins;

    if (isSame) {
      return {
        data: { applied: false, reversed_previous: false, previous_winner_id: this.winnerId },
        error: null,
      };
    }

    let reversed = false;
    const previousWinner = this.winnerId;
    if (this.winnerId && this.loserId) {
      this.counters[this.winnerId].wins -= 1;
      this.counters[this.winnerId].gw -= this.winnerGameWins;
      this.counters[this.winnerId].gl -= this.loserGameWins;
      this.counters[this.loserId].losses -= 1;
      this.counters[this.loserId].gw -= this.loserGameWins;
      this.counters[this.loserId].gl -= this.winnerGameWins;
      reversed = true;
    }

    this.winnerId = args.p_winner_id;
    this.loserId = args.p_loser_id;
    this.winnerGameWins = args.p_winner_game_wins;
    this.loserGameWins = args.p_loser_game_wins;
    this.counters[this.winnerId].wins += 1;
    this.counters[this.winnerId].gw += this.winnerGameWins;
    this.counters[this.winnerId].gl += this.loserGameWins;
    this.counters[this.loserId].losses += 1;
    this.counters[this.loserId].gw += this.loserGameWins;
    this.counters[this.loserId].gl += this.winnerGameWins;
    this.seasonStatsRefreshes += 1;

    return {
      data: { applied: true, reversed_previous: reversed, previous_winner_id: previousWinner },
      error: null,
    };
  };
}

let fake: FakeMatchRpc;

beforeEach(() => {
  vi.clearAllMocks();
  fake = new FakeMatchRpc();
  mockRpc.mockImplementation((fn: string, args: Parameters<FakeMatchRpc['handle']>[0]) => {
    if (fn === 'resubmit_match_result') return Promise.resolve(fake.handle(args));
    throw new Error(`Unexpected RPC ${fn}`);
  });
});

describe('resubmit_match_result atomic submit/edit', () => {
  it('applies the first submission and increments the winner/loser counters exactly once', async () => {
    const result = await updateMatchScore({
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 2,
      team2GameWins: 1,
    });

    expect(result.team1Win).toBe(true);
    expect(result.data).toEqual({
      applied: true,
      reversed_previous: false,
      previous_winner_id: null,
    });
    expect(fake.counters['team-1']).toEqual({ wins: 1, losses: 0, gw: 2, gl: 1 });
    expect(fake.counters['team-2']).toEqual({ wins: 0, losses: 1, gw: 1, gl: 2 });
    expect(fake.seasonStatsRefreshes).toBe(1);
  });

  it('is idempotent when the same result is submitted twice (no double counting)', async () => {
    const params = {
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 0,
      team1GameWins: 2,
      team2GameWins: 0,
    };
    const first = await updateMatchScore(params);
    const second = await updateMatchScore(params);

    expect(first.data.applied).toBe(true);
    expect(second.data.applied).toBe(false);
    expect(second.data.reversed_previous).toBe(false);
    expect(fake.counters['team-1'].wins).toBe(1);
    expect(fake.counters['team-2'].losses).toBe(1);
    expect(fake.seasonStatsRefreshes).toBe(1);
    expect(fake.rpcCalls).toBe(2);
  });

  it('flipping the winner reverses previous counters and applies the new result atomically', async () => {
    await updateMatchScore({
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 2,
      team2GameWins: 1,
    });

    const edited = await updateMatchScore({
      matchId: 'match-1',
      team1Score: 1,
      team2Score: 2,
      team1GameWins: 1,
      team2GameWins: 2,
    });

    expect(edited.data).toEqual({
      applied: true,
      reversed_previous: true,
      previous_winner_id: 'team-1',
    });
    // Previous winner fully reversed; new winner has exactly one win.
    expect(fake.counters['team-1']).toEqual({ wins: 0, losses: 1, gw: 1, gl: 2 });
    expect(fake.counters['team-2']).toEqual({ wins: 1, losses: 0, gw: 2, gl: 1 });
    expect(fake.seasonStatsRefreshes).toBe(2);
  });

  it('propagates RPC validation errors instead of silently succeeding', async () => {
    mockRpc.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: { message: 'Admin access required' } })
    );

    await expect(
      updateMatchScore({
        matchId: 'match-1',
        team1Score: 2,
        team2Score: 0,
        team1GameWins: 2,
        team2GameWins: 0,
      })
    ).rejects.toThrow(/Admin access required|Failed to submit match result/);
    expect(fake.counters['team-1'].wins).toBe(0);
    expect(fake.counters['team-2'].losses).toBe(0);
  });
});
