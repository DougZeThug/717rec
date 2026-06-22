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
  fetchAllRequests,
  fetchPendingRequestsCount,
  fetchTeamRequests,
  submitTeamRequest,
  updateTeamRequestStatus,
} from '../TeamRequestService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeRequest = (overrides: Record<string, unknown> = {}) => ({
  id: 'req-1',
  team_id: 'team-1',
  season_id: 's-1',
  request_type: 'reschedule',
  status: 'PENDING',
  match_date: '2026-04-17',
  current_timeslot: '6:30 PM',
  requested_timeslot: '7:30 PM',
  reason: 'conflict',
  admin_notes: null,
  submitted_by: 'user-1',
  submitted_by_name: 'Alice',
  processed_by: null,
  processed_at: null,
  created_at: '2026-04-17T00:00:00Z',
  updated_at: '2026-04-17T00:00:00Z',
  ...overrides,
});

// ─── fetchPendingRequestsCount ────────────────────────────────────────────────

describe('fetchPendingRequestsCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the count', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ count: 3, error: null }) }),
    });
    expect(await fetchPendingRequestsCount()).toBe(3);
  });

  it('returns 0 when count is null', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ count: null, error: null }) }),
    });
    expect(await fetchPendingRequestsCount()).toBe(0);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ count: null, error: pgError() }) }),
    });
    await expect(fetchPendingRequestsCount()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchTeamRequests ────────────────────────────────────────────────────────

describe('fetchTeamRequests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns requests for a team', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({ limit: () => Promise.resolve({ data: [makeRequest()], error: null }) }),
        }),
      }),
    });
    const result = await fetchTeamRequests('team-1');
    expect(result).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('team_requests');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({ limit: () => Promise.resolve({ data: null, error: pgError() }) }),
        }),
      }),
    });
    await expect(fetchTeamRequests('team-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchAllRequests ─────────────────────────────────────────────────────────

describe('fetchAllRequests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all requests without status filter', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [makeRequest()], error: null }) }),
    });
    const result = await fetchAllRequests();
    expect(result).toHaveLength(1);
  });

  it('applies status filter when provided', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({ eq: () => Promise.resolve({ data: [makeRequest()], error: null }) }),
      }),
    });
    const result = await fetchAllRequests('PENDING');
    expect(result).toHaveLength(1);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(fetchAllRequests()).rejects.toThrow(DatabaseError);
  });
});

// ─── submitTeamRequest ────────────────────────────────────────────────────────

describe('submitTeamRequest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns inserted request on success', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 's-1' }, error: null }),
            }),
          }),
        };
      }
      return {
        insert: () => ({
          select: () => ({ single: () => Promise.resolve({ data: makeRequest(), error: null }) }),
        }),
      };
    });

    const result = await submitTeamRequest({ team_id: 'team-1', request_type: 'reschedule' });
    expect(result).toMatchObject({ team_id: 'team-1' });
    expect(mockFrom).toHaveBeenCalledWith('team_requests');
  });

  it('throws DatabaseError on insert error', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 's-1' }, error: null }),
            }),
          }),
        };
      }
      return {
        insert: () => ({
          select: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
        }),
      };
    });
    await expect(
      submitTeamRequest({ team_id: 'team-1', request_type: 'reschedule' })
    ).rejects.toThrow(DatabaseError);
  });

  it('throws DatabaseError when season query fails', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: null, error: pgError('connection timeout') }),
            }),
          }),
        };
      }
      return {
        insert: () => ({
          select: () => ({ single: () => Promise.resolve({ data: makeRequest(), error: null }) }),
        }),
      };
    });
    await expect(
      submitTeamRequest({ team_id: 'team-1', request_type: 'reschedule' })
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── updateTeamRequestStatus ──────────────────────────────────────────────────

describe('updateTeamRequestStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns updated request on success', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({ data: makeRequest({ status: 'APPROVED' }), error: null }),
          }),
        }),
      }),
    });
    const result = await updateTeamRequestStatus({ id: 'req-1', status: 'APPROVED' });
    expect(result).toMatchObject({ status: 'APPROVED' });
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
        }),
      }),
    });
    await expect(updateTeamRequestStatus({ id: 'req-1', status: 'DENIED' })).rejects.toThrow(
      DatabaseError
    );
  });
});
