import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, DatabaseError, NotFoundError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(), teamLog: vi.fn(),
}));

// Import after mocks
import { getHiddenDivisionId, getHiddenTeams, hideTeam, isTeamHidden, unhideTeam } from '../TeamHiddenService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed', code = '42P01') => ({
  message: msg, code, details: null, hint: null, name: 'PostgrestError',
});

const singleChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve(result) }) }),
});

const maybeSingleChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }),
});

const updateEqChain = (result: { error: unknown }) => ({
  update: () => ({ eq: () => Promise.resolve(result) }),
});

// ─── getHiddenDivisionId ──────────────────────────────────────────────────────

describe('getHiddenDivisionId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns hidden division id when found', async () => {
    mockFrom.mockReturnValue(singleChain({ data: { id: 'hidden-div' }, error: null }));
    expect(await getHiddenDivisionId()).toBe('hidden-div');
  });

  it('returns null when no hidden division (PGRST116)', async () => {
    mockFrom.mockReturnValue(singleChain({ data: null, error: pgError('no rows', 'PGRST116') }));
    expect(await getHiddenDivisionId()).toBeNull();
  });

  it('throws DatabaseError on other Supabase errors', async () => {
    mockFrom.mockReturnValue(singleChain({ data: null, error: pgError() }));
    await expect(getHiddenDivisionId()).rejects.toThrow(DatabaseError);
  });
});

// ─── hideTeam ────────────────────────────────────────────────────────────────

describe('hideTeam', () => {
  beforeEach(() => vi.clearAllMocks());

  it('moves team to hidden division and returns result', async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'teams') {
        callCount++;
        if (callCount === 1) {
          // Fetch team
          return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { division_id: 'div-1', name: 'Eagles' }, error: null }) }) }) };
        }
        // Update
        return updateEqChain({ error: null });
      }
      // divisions — get hidden div
      return singleChain({ data: { id: 'hidden-div' }, error: null });
    });

    const result = await hideTeam('team-1');
    expect(result.success).toBe(true);
    expect(result.originalDivisionId).toBe('div-1');
  });

  it('throws NotFoundError when team not found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    });
    await expect(hideTeam('team-1')).rejects.toThrow(NotFoundError);
  });

  it('throws BusinessLogicError when team already hidden', async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'teams') {
        callCount++;
        if (callCount === 1) {
          return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { division_id: 'hidden-div', name: 'Eagles' }, error: null }) }) }) };
        }
      }
      return singleChain({ data: { id: 'hidden-div' }, error: null });
    });

    await expect(hideTeam('team-1')).rejects.toThrow(BusinessLogicError);
  });
});

// ─── unhideTeam ───────────────────────────────────────────────────────────────

describe('unhideTeam', () => {
  beforeEach(() => vi.clearAllMocks());

  it('moves team to target division', async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'teams') {
        callCount++;
        if (callCount === 1) {
          return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { division_id: 'hidden-div', name: 'Eagles' }, error: null }) }) }) };
        }
        return updateEqChain({ error: null });
      }
      // divisions
      return singleChain({ data: { id: 'div-2', name: 'Gold' }, error: null });
    });

    const result = await unhideTeam('team-1', 'div-2');
    expect(result.success).toBe(true);
  });

  it('throws NotFoundError when team not found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    });
    await expect(unhideTeam('team-1', 'div-2')).rejects.toThrow(NotFoundError);
  });
});

// ─── isTeamHidden ─────────────────────────────────────────────────────────────

describe('isTeamHidden', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when team is in hidden division', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // getHiddenDivisionId
        return singleChain({ data: { id: 'hidden-div' }, error: null });
      }
      // fetchTeam division_id
      return maybeSingleChain({ data: { division_id: 'hidden-div' }, error: null });
    });
    expect(await isTeamHidden('team-1')).toBe(true);
  });

  it('returns false when team is not hidden', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return singleChain({ data: { id: 'hidden-div' }, error: null });
      return maybeSingleChain({ data: { division_id: 'div-1' }, error: null });
    });
    expect(await isTeamHidden('team-1')).toBe(false);
  });

  it('returns false when no hidden division exists', async () => {
    mockFrom.mockReturnValue(singleChain({ data: null, error: pgError('', 'PGRST116') }));
    expect(await isTeamHidden('team-1')).toBe(false);
  });
});

// ─── getHiddenTeams ───────────────────────────────────────────────────────────

describe('getHiddenTeams', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns hidden teams', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return singleChain({ data: { id: 'hidden-div' }, error: null });
      return {
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [{ id: 'team-h', name: 'Ghost' }], error: null }) }) }),
      };
    });
    const result = await getHiddenTeams();
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no hidden division', async () => {
    mockFrom.mockReturnValue(singleChain({ data: null, error: pgError('', 'PGRST116') }));
    expect(await getHiddenTeams()).toEqual([]);
  });
});
