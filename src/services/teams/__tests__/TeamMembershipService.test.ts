import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, DatabaseError } from '@/types/errors';
import { getUIErrorMessage } from '@/utils/errorHandler';

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

const pgError = (msg = 'query failed', code = '42P01') => ({
  message: msg,
  code,
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

/**
 * fetchTeamMembership orders and limits before maybeSingle(), so the mock has to
 * mirror that chain. Records the order()/limit() arguments so a test can assert
 * the query stays deterministic when a user has a duplicate membership row.
 */
const membershipReadChain = (result: { data: unknown; error: unknown }) => {
  const orderCalls: Array<[string, unknown]> = [];
  const limitCalls: number[] = [];
  const tail = {
    order: (column: string, options: unknown) => {
      orderCalls.push([column, options]);
      return tail;
    },
    limit: (count: number) => {
      limitCalls.push(count);
      return tail;
    },
    maybeSingle: () => Promise.resolve(result),
  };
  return { chain: { select: () => ({ eq: () => tail }) }, orderCalls, limitCalls };
};

describe('fetchTeamMembership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns membership when found', async () => {
    mockFrom.mockReturnValue(membershipReadChain({ data: makeMembershipRow(), error: null }).chain);
    const result = await fetchTeamMembership('user-1');
    expect(result).toMatchObject({ team_id: 'team-1' });
  });

  it('returns null when no membership', async () => {
    mockFrom.mockReturnValue(membershipReadChain({ data: null, error: null }).chain);
    expect(await fetchTeamMembership('user-1')).toBeNull();
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(membershipReadChain({ data: null, error: pgError() }).chain);
    await expect(fetchTeamMembership('user-1')).rejects.toThrow(DatabaseError);
  });

  // A duplicate membership row used to make maybeSingle() throw, which took away
  // every member ability with no way to recover from inside the app.
  it('asks for the approved row first, oldest next, and only one row', async () => {
    const read = membershipReadChain({ data: makeMembershipRow(), error: null });
    mockFrom.mockReturnValue(read.chain);

    await fetchTeamMembership('user-1');

    expect(read.orderCalls).toEqual([
      ['is_approved', { ascending: false }],
      ['joined_at', { ascending: true, nullsFirst: false }],
    ]);
    expect(read.limitCalls).toEqual([1]);
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

  // B-18: a refused row keeps the person's only slot under
  // idx_one_membership_per_user, so asking again has to reuse it. Reusing it
  // without clearing rejected_at would leave the new request looking refused
  // and keep it out of the admin queue.
  it('clears a previous refusal when the same row is reused to ask again', async () => {
    const updateFn = vi.fn((_patch: Record<string, unknown>) => ({
      eq: () => Promise.resolve({ error: null }),
    }));
    mockFrom.mockReturnValue({ update: updateFn });

    await joinTeamMembership('user-1', 'team-2', true);

    const patch = updateFn.mock.calls[0][0];
    expect(patch.rejected_at).toBeNull();
    expect(patch.rejected_by).toBeNull();
    expect(patch.is_approved).toBe(false);
    expect(patch.team_id).toBe('team-2');
    // Restamped so the admin queue shows when they asked, not when they first
    // asked before being refused.
    expect(patch.joined_at).toEqual(expect.any(String));
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

  // The join form is drawn whenever the membership read returns nothing, which
  // includes a read that failed. idx_one_membership_per_user now refuses the
  // second row that used to be created there.
  it('explains the duplicate when the unique index refuses a second row', async () => {
    mockFrom.mockReturnValue({
      insert: () => Promise.resolve({ error: pgError('duplicate key value', '23505') }),
    });
    await expect(joinTeamMembership('user-1', 'team-1', false)).rejects.toThrow(BusinessLogicError);

    // The type is what carries it to the user: a DatabaseError with no
    // details.code is sanitised down to a generic sentence.
    const thrown = await joinTeamMembership('user-1', 'team-1', false).catch((e) => e);
    expect(getUIErrorMessage(thrown, 'Failed to submit request')).toBe(
      'Failed to submit request: You already have a team request. Refresh the page to see it.'
    );
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
      select: () => ({ eq: () => ({ is: () => Promise.resolve({ count: 5, error: null }) }) }),
    });
    expect(await fetchPendingMembershipCount()).toBe(5);
  });

  it('returns 0 when count is null', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ is: () => Promise.resolve({ count: null, error: null }) }) }),
    });
    expect(await fetchPendingMembershipCount()).toBe(0);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ is: () => Promise.resolve({ count: null, error: pgError() }) }),
      }),
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
              eq: () => ({
                is: () => ({
                  order: () => Promise.resolve({ data: memberships, error: null }),
                }),
              }),
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
      select: () => ({
        eq: () => ({ is: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
      }),
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
      update: () => ({
        eq: () => ({ select: () => Promise.resolve({ data: [{ id: 'mem-1' }], error: null }) }),
      }),
    });
    await expect(updateMembershipApproval('mem-1', true)).resolves.toBeUndefined();
  });

  // B-18: rejection used to DELETE the row, so the person was never told —
  // their screen went back to looking as though they had never asked. It now
  // stamps rejected_at, and nothing is deleted.
  it('marks the row refused on rejection rather than deleting it', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    const updateFn = vi.fn((_patch: Record<string, unknown>) => ({
      eq: () => ({ select: () => Promise.resolve({ data: [{ id: 'mem-1' }], error: null }) }),
    }));
    const deleteFn = vi.fn();
    mockFrom.mockReturnValue({ update: updateFn, delete: deleteFn });

    await expect(updateMembershipApproval('mem-1', false)).resolves.toBeUndefined();

    expect(deleteFn).not.toHaveBeenCalled();
    const patch = updateFn.mock.calls[0][0];
    expect(patch.rejected_at).toEqual(expect.any(String));
    expect(patch.rejected_by).toBe('admin-1');
    // is_approved is left alone: false already means pending, and rejected_at
    // is what tells the two apart.
    expect(patch).not.toHaveProperty('is_approved');
  });

  it('throws when the approval update affects no rows (RLS blocked)', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
      }),
    });
    // BusinessLogicError, not DatabaseError: the wording here is authored for
    // an admin to read, and getUIErrorMessage only shows a typed error's
    // message. As a DatabaseError it was replaced with "Something went wrong".
    await expect(updateMembershipApproval('mem-1', true)).rejects.toThrow(BusinessLogicError);
    await expect(updateMembershipApproval('mem-1', true)).rejects.toThrow(
      /no row was changed. You may not have permission/i
    );
  });

  it('throws DatabaseError on update error', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({ select: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(updateMembershipApproval('mem-1', true)).rejects.toThrow(DatabaseError);
  });

  it('explains the one-membership rule when approval hits the unique index', async () => {
    // idx_one_membership_per_user refuses a second row, approved or not. The
    // admin needs to know which action clears it, so the wording must survive.
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => Promise.resolve({ data: null, error: pgError('duplicate key', '23505') }),
        }),
      }),
    });

    const thrown = await updateMembershipApproval('mem-1', true).catch((e) => e);
    expect(thrown).toBeInstanceOf(BusinessLogicError);
    expect(getUIErrorMessage(thrown, 'Failed to update membership status')).toBe(
      'Failed to update membership status: This user already has a membership on another team. Remove that membership first.'
    );
  });

  it('explains a rejection that changed no rows', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) }),
    });

    const thrown = await updateMembershipApproval('mem-1', false).catch((e) => e);
    expect(thrown).toBeInstanceOf(BusinessLogicError);
    expect(getUIErrorMessage(thrown, 'Failed to update membership status')).toBe(
      'Failed to update membership status: Failed to reject membership: no row was changed. You may not have permission.'
    );
  });
});
