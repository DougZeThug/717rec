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
  badgeLog: vi.fn(),
}));

// Import after mocks
import { BadgeProcessingService } from '../BadgeProcessingService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'rpc failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

// ─── processMatchBadges ───────────────────────────────────────────────────────

describe('BadgeProcessingService.processMatchBadges', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns badge data on success', async () => {
    mockRpc.mockResolvedValue({ data: { badges_awarded: 2 }, error: null });
    const result = (await BadgeProcessingService.processMatchBadges('t1', 't2')) as {
      badges_awarded: number;
    };
    expect(mockRpc).toHaveBeenCalledWith('process_match_badges', {
      p_team1_id: 't1',
      p_team2_id: 't2',
    });
    expect(result.badges_awarded).toBe(2);
  });

  it('throws DatabaseError on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(BadgeProcessingService.processMatchBadges('t1', 't2')).rejects.toThrow(
      DatabaseError
    );
  });
});

// ─── processKingslayerBadge ───────────────────────────────────────────────────

describe('BadgeProcessingService.processKingslayerBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns badge data on success', async () => {
    mockRpc.mockResolvedValue({ data: { awarded: true }, error: null });
    const result = (await BadgeProcessingService.processKingslayerBadge('winner', 'loser')) as {
      awarded: boolean;
    };
    expect(mockRpc).toHaveBeenCalledWith('award_kingslayer_badge', {
      p_winner_id: 'winner',
      p_loser_id: 'loser',
    });
    expect(result.awarded).toBe(true);
  });

  it('throws DatabaseError on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(BadgeProcessingService.processKingslayerBadge('w', 'l')).rejects.toThrow(
      DatabaseError
    );
  });
});

// ─── processClutchPerformerBadge ──────────────────────────────────────────────

describe('BadgeProcessingService.processClutchPerformerBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns early with awarded=false when not a 2-1 win (sweep)', async () => {
    const result = (await BadgeProcessingService.processClutchPerformerBadge('t1', 2, 0)) as {
      awarded: boolean;
    };
    expect(result.awarded).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('calls rpc when 2-1 win (team1 perspective)', async () => {
    mockRpc.mockResolvedValue({ data: { awarded: true }, error: null });
    const result = (await BadgeProcessingService.processClutchPerformerBadge('t1', 2, 1)) as {
      awarded: boolean;
    };
    expect(mockRpc).toHaveBeenCalledWith('award_clutch_performer_badge', { p_team_id: 't1' });
    expect(result.awarded).toBe(true);
  });

  it('calls rpc when 1-2 match (team2 perspective)', async () => {
    mockRpc.mockResolvedValue({ data: { awarded: true }, error: null });
    await BadgeProcessingService.processClutchPerformerBadge('t2', 1, 2);
    expect(mockRpc).toHaveBeenCalled();
  });

  it('throws DatabaseError on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(BadgeProcessingService.processClutchPerformerBadge('t1', 2, 1)).rejects.toThrow(
      DatabaseError
    );
  });
});

// ─── processConsistentPerformerBadge ─────────────────────────────────────────

describe('BadgeProcessingService.processConsistentPerformerBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns badge data on success', async () => {
    mockRpc.mockResolvedValue({ data: { awarded: true }, error: null });
    const result = (await BadgeProcessingService.processConsistentPerformerBadge('t1')) as {
      awarded: boolean;
    };
    expect(mockRpc).toHaveBeenCalledWith('award_consistent_performer_badge', { p_team_id: 't1' });
    expect(result.awarded).toBe(true);
  });

  it('throws DatabaseError on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(BadgeProcessingService.processConsistentPerformerBadge('t1')).rejects.toThrow(
      DatabaseError
    );
  });
});

// ─── processIceColdBadge ──────────────────────────────────────────────────────

describe('BadgeProcessingService.processIceColdBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns badge data on success', async () => {
    mockRpc.mockResolvedValue({ data: { awarded: true }, error: null });
    await BadgeProcessingService.processIceColdBadge('t1');
    expect(mockRpc).toHaveBeenCalledWith('award_ice_cold_badge', { p_team_id: 't1' });
  });

  it('throws DatabaseError on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(BadgeProcessingService.processIceColdBadge('t1')).rejects.toThrow(DatabaseError);
  });
});

// ─── processBroomCrewBadge ────────────────────────────────────────────────────

describe('BadgeProcessingService.processBroomCrewBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns badge data on success', async () => {
    mockRpc.mockResolvedValue({ data: { awarded: false }, error: null });
    const result = (await BadgeProcessingService.processBroomCrewBadge('t1')) as {
      awarded: boolean;
    };
    expect(mockRpc).toHaveBeenCalledWith('award_broom_crew_badge', { p_team_id: 't1' });
    expect(result.awarded).toBe(false);
  });

  it('throws DatabaseError on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(BadgeProcessingService.processBroomCrewBadge('t1')).rejects.toThrow(DatabaseError);
  });
});

// ─── processGatekeeperBadge ───────────────────────────────────────────────────

describe('BadgeProcessingService.processGatekeeperBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns badge data on success', async () => {
    mockRpc.mockResolvedValue({ data: { awarded: true }, error: null });
    await BadgeProcessingService.processGatekeeperBadge('t1');
    expect(mockRpc).toHaveBeenCalledWith('award_gatekeeper_badge', { p_team_id: 't1' });
  });

  it('throws DatabaseError on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(BadgeProcessingService.processGatekeeperBadge('t1')).rejects.toThrow(
      DatabaseError
    );
  });
});

// ─── processChaosAgentBadge ───────────────────────────────────────────────────

describe('BadgeProcessingService.processChaosAgentBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns badge data on success', async () => {
    mockRpc.mockResolvedValue({ data: { awarded: false }, error: null });
    await BadgeProcessingService.processChaosAgentBadge('t1');
    expect(mockRpc).toHaveBeenCalledWith('award_chaos_agent_badge', { p_team_id: 't1' });
  });

  it('throws DatabaseError on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(BadgeProcessingService.processChaosAgentBadge('t1')).rejects.toThrow(
      DatabaseError
    );
  });
});

// ─── processBullyBadge ────────────────────────────────────────────────────────

describe('BadgeProcessingService.processBullyBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns badge data on success', async () => {
    mockRpc.mockResolvedValue({ data: { awarded: true }, error: null });
    await BadgeProcessingService.processBullyBadge('t1');
    expect(mockRpc).toHaveBeenCalledWith('award_bully_badge', { p_team_id: 't1' });
  });

  it('throws DatabaseError on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(BadgeProcessingService.processBullyBadge('t1')).rejects.toThrow(DatabaseError);
  });
});
