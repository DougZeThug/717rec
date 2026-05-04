import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const { mockFrom, mockAuth } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAuth: { getUser: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: mockAuth,
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  teamLog: vi.fn(),
}));

// Import after mocks
import {
  fetchPendingMembershipCount,
  fetchPendingMembershipsForAdmin,
  fetchTeamMembership,
  joinTeamMembership,
  leaveTeamMembership,
  updateMembershipApproval,
} from '../TeamMembershipService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeMembershipRow = () => ({
  id: 'mem-1',
  user_id: 'user-1',
  team_id: 'team-1',
  joined_at: '2026-01-01T00:00:00Z',
  is_approved: true,
  approved_by: 'admin-1',
  approved_at: '2026-01-02T00:00:00Z',
  team: {
    id: 'team-1',
    name: 'Eagles',
    logo_url: null,
    image_url: 'img.png',
    division_id: 'd1',
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
  },
});

// ─── fetchTeamMembership ──────────────────────────────────────────────────────

describe('fetchTeamMembership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns membership when found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: makeMembershipRow(), error: null }),
        }),
      }),
    });
    const result = await fetchTeamMembership('user-1');
    expect(result).toMatchObject({ team_id: 'team-1' });
  });

  it('returns null when no membership', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });
    expect(await fetchTeamMembership('user-1')).toBeNull();
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchTeamMembership('user-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── joinTeamMembership ───────────────────────────────────────────────────────

describe('joinTeamMembership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts new record when hasMembership is false', async () => {
    mockFrom.mockReturnValue({
      insert: () => Promise.resolve({ error: null }),
    });
    await expect(joinTeamMembership('user-1', 'team-1', false)).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('team_memberships');
  });

  it('updates existing record when hasMembership is true', async () => {
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });
    await expect(joinTeamMembership('user-1', 'team-1', true)).resolves.toBeUndefined();
  });

  it('throws DatabaseError on insert error', async () => {
    mockFrom.mockReturnValue({
      insert: () => Promise.resolve({ error: pgError() }),
    });
    await expect(joinTeamMembership('user-1', 'team-1', false)).rejects.toThrow(DatabaseError);
  });

  it('throws DatabaseError on update error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(joinTeamMembership('user-1', 'team-1', true)).rejects.toThrow(DatabaseError);
  });
});

// ─── leaveTeamMembership ──────────────────────────────────────────────────────

describe('leaveTeamMembership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });
    await expect(leaveTeamMembership('user-1')).resolves.toBeUndefined();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(leaveTeamMembership('user-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchPendingMembershipCount ──────────────────────────────────────────────

describe('fetchPendingMembershipCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the count', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ count: 5, error: null }) }),
    });
    expect(await fetchPendingMembershipCount()).toBe(5);
  });

  it('returns 0 when count is null', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ count: null, error: null }) }),
    });
    expect(await fetchPendingMembershipCount()).toBe(0);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ count: null, error: pgError() }) }),
    });
    await expect(fetchPendingMembershipCount()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchPendingMembershipsForAdmin ──────────────────────────────────────────

describe('fetchPendingMembershipsForAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  const memberships = [
    { id: 'mem-1', user_id: 'u1', team_id: 't1', joined_at: '2026-01-01', is_approved: false },
  ];
  const profiles = [{ id: 'u1', username: 'alice', full_name: 'Alice', avatar_url: null }];
  const teams = [{ id: 't1', name: 'Eagles', logo_url: null, image_url: null }];

  it('returns combined membership data', async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'team_memberships') {
        callCount++;
        if (callCount === 1) {
          return {
            select: () => ({
              eq: () => ({ order: () => Promise.resolve({ data: memberships, error: null }) }),
            }),
          };
        }
      }
      if (table === 'profiles') {
        return { select: () => ({ in: () => Promise.resolve({ data: profiles, error: null }) }) };
      }
      if (table === 'teams') {
        return { select: () => ({ in: () => Promise.resolve({ data: teams, error: null }) }) };
      }
      return { select: () => Promise.resolve({ data: [], error: null }) };
    });

    const result = await fetchPendingMembershipsForAdmin();
    expect(result).toHaveLength(1);
    expect(result[0].user.username).toBe('alice');
    expect(result[0].team.name).toBe('Eagles');
  });

  it('returns empty array when no pending memberships', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
    });
    expect(await fetchPendingMembershipsForAdmin()).toEqual([]);
  });
});

// ─── updateMembershipApproval ─────────────────────────────────────────────────

describe('updateMembershipApproval', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on successful approval', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });
    await expect(updateMembershipApproval('mem-1', true)).resolves.toBeUndefined();
  });

  it('resolves on rejection (approved=false, no auth needed)', async () => {
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });
    await expect(updateMembershipApproval('mem-1', false)).resolves.toBeUndefined();
    expect(mockAuth.getUser).not.toHaveBeenCalled();
  });

  it('throws DatabaseError on update error', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(updateMembershipApproval('mem-1', true)).rejects.toThrow(DatabaseError);
  });
});
