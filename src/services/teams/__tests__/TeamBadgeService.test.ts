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
  teamLog: vi.fn(),
}));

// Import after mocks
import { fetchAllTeamBadges, fetchSeasonBadges, fetchTeamBadges } from '../TeamBadgeService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeBadge = (overrides: Record<string, unknown> = {}) => ({
  id: 'badge-1',
  team_id: 'team-1',
  badge_type: 'kingslayer',
  season_id: 'season-1',
  awarded_at: '2026-04-01T00:00:00Z',
  metadata: {},
  is_active: true,
  created_at: '2026-04-01T00:00:00Z',
  ...overrides,
});

// .select().eq().eq().order()
const twoEqOrderChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ eq: () => ({ eq: () => ({ order: () => Promise.resolve(result) }) }) }),
});

// .select().eq().order()
const oneEqOrderChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ eq: () => ({ order: () => Promise.resolve(result) }) }),
});

// ─── fetchTeamBadges ──────────────────────────────────────────────────────────

describe('fetchTeamBadges', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns active badges for team on success', async () => {
    mockFrom.mockReturnValue(twoEqOrderChain({ data: [makeBadge()], error: null }));
    const result = await fetchTeamBadges('team-1');
    expect(result).toHaveLength(1);
    expect(result[0].badge_type).toBe('kingslayer');
    expect(mockFrom).toHaveBeenCalledWith('team_badge_events');
  });

  it('returns empty array when no badges', async () => {
    mockFrom.mockReturnValue(twoEqOrderChain({ data: null, error: null }));
    expect(await fetchTeamBadges('team-1')).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(twoEqOrderChain({ data: null, error: pgError() }));
    await expect(fetchTeamBadges('team-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchAllTeamBadges ───────────────────────────────────────────────────────

describe('fetchAllTeamBadges', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all active badges', async () => {
    mockFrom.mockReturnValue(
      oneEqOrderChain({
        data: [makeBadge(), makeBadge({ id: 'b2', team_id: 'team-2' })],
        error: null,
      })
    );
    const result = await fetchAllTeamBadges();
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no badges', async () => {
    mockFrom.mockReturnValue(oneEqOrderChain({ data: null, error: null }));
    expect(await fetchAllTeamBadges()).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(oneEqOrderChain({ data: null, error: pgError() }));
    await expect(fetchAllTeamBadges()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchSeasonBadges ────────────────────────────────────────────────────────

describe('fetchSeasonBadges', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns badges for the given season', async () => {
    mockFrom.mockReturnValue(twoEqOrderChain({ data: [makeBadge()], error: null }));
    const result = await fetchSeasonBadges('season-1');
    expect(result).toHaveLength(1);
    expect(result[0].season_id).toBe('season-1');
  });

  it('returns empty array when no badges', async () => {
    mockFrom.mockReturnValue(twoEqOrderChain({ data: null, error: null }));
    expect(await fetchSeasonBadges('season-1')).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(twoEqOrderChain({ data: null, error: pgError() }));
    await expect(fetchSeasonBadges('season-1')).rejects.toThrow(DatabaseError);
  });
});
