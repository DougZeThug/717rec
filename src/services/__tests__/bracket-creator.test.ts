import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError } from '@/types/errors';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const deleteEq = vi.fn((..._args: unknown[]) => Promise.resolve({ error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

const mockManagerCreate = vi.fn((..._args: unknown[]) => Promise.resolve());

vi.mock('@/services/brackets/manager', () => ({
  bracketManagerService: {
    createBracket: (...args: unknown[]) => mockManagerCreate(...args),
  },
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  failureLog: vi.fn(),
  successLog: vi.fn(),
  warnLog: vi.fn(),
}));

// Import after mocks
import { createBracket } from '../bracket-creator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TeamDetailRow = {
  team_id: string;
  name: string;
  power_score: number | null;
  wins: number;
  losses: number;
};

let bracketInsertCapture: Record<string, unknown> | null = null;
let tablesTouched: string[] = [];

interface SupabaseSetup {
  fullTeamData?: TeamDetailRow[];
  teamError?: unknown;
  bracketData?: { id: string; created_at: string; format: string } | null;
  bracketError?: unknown;
}

const defaultBracketData = {
  id: 'bracket-1',
  created_at: '2026-05-01T00:00:00Z',
  format: 'Single Elimination',
};

function installSupabase({
  fullTeamData = [],
  teamError = null,
  bracketData = defaultBracketData,
  bracketError = null,
}: SupabaseSetup) {
  bracketInsertCapture = null;
  tablesTouched = [];
  mockFrom.mockImplementation((table: string) => {
    tablesTouched.push(table);
    if (table === 'v_team_details') {
      return {
        select: () => ({
          in: () => Promise.resolve({ data: fullTeamData, error: teamError }),
        }),
      };
    }
    if (table === 'brackets') {
      return {
        insert: (row: Record<string, unknown>) => {
          bracketInsertCapture = row;
          return {
            select: () => ({
              single: () => Promise.resolve({ data: bracketData, error: bracketError }),
            }),
          };
        },
        delete: () => ({ eq: (...args: unknown[]) => deleteEq(...args) }),
      };
    }
    return {};
  });
}

/** The team list passed to the brackets-manager library = the final seeded order. */
const seededTeams = (): Array<{ id: string; name: string; seed: number }> =>
  (
    (mockManagerCreate.mock.calls[0] as unknown[])[0] as {
      teams: Array<{ id: string; name: string; seed: number }>;
    }
  ).teams;

const baseOptions = {
  name: 'Spring Playoffs',
  format: 'singleElim' as const,
  divisionId: 'div-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  deleteEq.mockClear();
});

// ─── Seeding algorithm ──────────────────────────────────────────────────────

describe('createBracket — seeding order', () => {
  it('sorts by manual seed when every team has one', async () => {
    installSupabase({});
    await createBracket({
      ...baseOptions,
      teams: [
        { id: 'a', name: 'A', seed: 2 },
        { id: 'b', name: 'B', seed: 1 },
      ],
    });

    expect(seededTeams().map((t) => t.id)).toEqual(['b', 'a']);
    expect(seededTeams().map((t) => t.seed)).toEqual([1, 2]);
  });

  it('places the only manually-seeded team first', async () => {
    installSupabase({
      fullTeamData: [{ team_id: 'a', name: 'A', power_score: 100, wins: 9, losses: 1 }],
    });
    await createBracket({
      ...baseOptions,
      teams: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B', seed: 1 },
      ],
    });

    expect(seededTeams().map((t) => t.id)).toEqual(['b', 'a']);
    // b keeps its manual seed, a is auto-assigned its sorted position
    expect(seededTeams().map((t) => t.seed)).toEqual([1, 2]);
  });

  it('sorts unseeded teams by power score descending', async () => {
    installSupabase({
      fullTeamData: [
        { team_id: 'a', name: 'A', power_score: 50, wins: 5, losses: 5 },
        { team_id: 'b', name: 'B', power_score: 90, wins: 5, losses: 5 },
        { team_id: 'c', name: 'C', power_score: 70, wins: 5, losses: 5 },
      ],
    });
    await createBracket({
      ...baseOptions,
      teams: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
      ],
    });

    expect(seededTeams().map((t) => t.id)).toEqual(['b', 'c', 'a']);
    expect(seededTeams().map((t) => t.seed)).toEqual([1, 2, 3]);
  });

  it('sinks teams with a null power score to the end', async () => {
    // 'a' is absent from v_team_details → power_score resolves to null
    installSupabase({
      fullTeamData: [{ team_id: 'b', name: 'B', power_score: 80, wins: 5, losses: 5 }],
    });
    await createBracket({
      ...baseOptions,
      teams: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
    });

    expect(seededTeams().map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('breaks equal power scores by win percentage descending', async () => {
    installSupabase({
      fullTeamData: [
        { team_id: 'a', name: 'A', power_score: 50, wins: 8, losses: 2 },
        { team_id: 'b', name: 'B', power_score: 50, wins: 5, losses: 5 },
      ],
    });
    await createBracket({
      ...baseOptions,
      teams: [
        { id: 'b', name: 'B' },
        { id: 'a', name: 'A' },
      ],
    });

    expect(seededTeams().map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('breaks equal power and win percentage alphabetically by name', async () => {
    installSupabase({
      fullTeamData: [
        { team_id: 'z', name: 'Zeta', power_score: 50, wins: 5, losses: 5 },
        { team_id: 'al', name: 'Alpha', power_score: 50, wins: 5, losses: 5 },
      ],
    });
    await createBracket({
      ...baseOptions,
      teams: [
        { id: 'z', name: 'Zeta' },
        { id: 'al', name: 'Alpha' },
      ],
    });

    expect(seededTeams().map((t) => t.name)).toEqual(['Alpha', 'Zeta']);
  });
});

// ─── Persistence + return value ───────────────────────────────────────────────

describe('createBracket — persistence', () => {
  it('writes no legacy tables and no JSONB metadata — participants and grandFinalType live in brackets-manager tables', async () => {
    installSupabase({
      fullTeamData: [
        { team_id: 'a', name: 'A', power_score: 30, wins: 5, losses: 5 },
        { team_id: 'b', name: 'B', power_score: 90, wins: 5, losses: 5 },
      ],
    });
    await createBracket({
      ...baseOptions,
      grandFinalType: 'double',
      teams: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
    });

    // The legacy plural `participants` table is never touched (its rows were
    // dead weight — brackets-manager reads the singular `participant` table,
    // populated via bracketManagerService.createBracket).
    expect(tablesTouched).not.toContain('participants');
    // grandFinalType is not smuggled into the brackets.participants JSONB;
    // it reaches the library through createBracket options and persists in
    // stage.settings.grandFinal.
    expect(bracketInsertCapture).not.toHaveProperty('participants');
    expect(mockManagerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ grandFinalType: 'double' })
    );
  });

  it('returns a bracket record reflecting the seeded participants', async () => {
    installSupabase({
      fullTeamData: [
        { team_id: 'a', name: 'A', power_score: 30, wins: 5, losses: 5 },
        { team_id: 'b', name: 'B', power_score: 90, wins: 5, losses: 5 },
      ],
    });
    const bracket = await createBracket({
      ...baseOptions,
      teams: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
    });

    expect(bracket.id).toBe('bracket-1');
    expect(bracket.uses_brackets_manager).toBe(true);
    expect(bracket.participants).toEqual([
      { teamId: 'b', name: 'B', seed: 1 },
      { teamId: 'a', name: 'A', seed: 2 },
    ]);
  });

  it('still creates the bracket when seeding data cannot be fetched', async () => {
    installSupabase({ teamError: { message: 'view unavailable' } });
    await expect(
      createBracket({
        ...baseOptions,
        teams: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
      })
    ).resolves.toBeDefined();
    expect(mockManagerCreate).toHaveBeenCalledTimes(1);
  });
});

// ─── Failure / rollback ────────────────────────────────────────────────────────

describe('createBracket — failure handling', () => {
  it('rolls back the orphan bracket row and throws BusinessLogicError when match generation fails', async () => {
    installSupabase({});
    mockManagerCreate.mockRejectedValueOnce(new Error('bracket-manager exploded'));

    await expect(
      createBracket({
        ...baseOptions,
        teams: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
      })
    ).rejects.toThrow(BusinessLogicError);

    // rollback deletes the bracket row that was already inserted
    expect(deleteEq).toHaveBeenCalledWith('id', 'bracket-1');
  });

  it('throws BusinessLogicError when the bracket insert fails', async () => {
    installSupabase({ bracketData: null, bracketError: { message: 'insert failed' } });

    await expect(
      createBracket({
        ...baseOptions,
        teams: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
      })
    ).rejects.toThrow(BusinessLogicError);
    // no bracket id was created, so no rollback delete
    expect(deleteEq).not.toHaveBeenCalled();
  });
});
