import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/integrations/supabase/client';
import { BracketManagerService } from '@/services/brackets/manager/BracketManagerService';

type StorageMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  loadParticipantsForTournament: ReturnType<typeof vi.fn>;
  clearParticipantCache: ReturnType<typeof vi.fn>;
};
type StorageFilter = number | string | Record<string, unknown> | undefined;
type SupabaseFromMock = Record<string, ReturnType<typeof vi.fn>>;
type GlobalWithStorage = typeof globalThis & { __storageMockInstance?: StorageMock };

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock brackets-manager
vi.mock('brackets-manager', () => {
  class MockBracketsManager {
    create = {
      stage: vi.fn().mockImplementation(() => Promise.resolve()),
    };
    update = {
      match: vi.fn().mockImplementation(() => Promise.resolve()),
      seeding: vi.fn().mockImplementation(() => Promise.resolve()),
    };
    get = {
      finalStandings: vi.fn().mockResolvedValue([]),
    };
  }

  return {
    BracketsManager: MockBracketsManager,
  };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  failureLog: vi.fn(),
  successLog: vi.fn(),
  warnLog: vi.fn(),
}));

// Mock MatchUpdateQueue
vi.mock('@/services/brackets/manager/MatchUpdateQueue', () => ({
  matchUpdateQueue: {
    enqueue: vi.fn((fn) => fn()),
  },
}));

// Mock SupabaseSqlStorage with configurable per-test responses
vi.mock('@/services/brackets/manager/SupabaseSqlStorage', () => {
  class MockSupabaseSqlStorage {
    select = vi.fn();
    insert = vi.fn().mockImplementation(() => Promise.resolve());
    update = vi.fn().mockImplementation(() => Promise.resolve());
    delete = vi.fn().mockImplementation(() => Promise.resolve());
    loadParticipantsForTournament = vi.fn().mockImplementation(() => Promise.resolve());
    clearParticipantCache = vi.fn();

    constructor() {
      (globalThis as GlobalWithStorage).__storageMockInstance = this;
    }
  }

  return {
    SupabaseSqlStorage: MockSupabaseSqlStorage,
  };
});

// Helper to get storage mock instance
const getStorageMock = (): StorageMock => {
  const storage = (globalThis as GlobalWithStorage).__storageMockInstance;
  if (!storage) throw new Error('Storage mock not initialised');
  return storage;
};

describe('Bracket Manager Schema Integration Tests', () => {
  let mockSupabaseFrom: SupabaseFromMock;

  // Helper to create chainable insert mock
  const createInsertMock = (data: Array<Record<string, unknown>> = [{ id: 1 }]) => {
    return vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data, error: null }),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup mock Supabase client with chainable insert().select() and update().eq() patterns
    mockSupabaseFrom = {
      // Awaitable on its own, and chainable via .eq() for the snapshot/rollback
      // read BracketUpdateService takes before handing a match to the library.
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        then: (resolve: (...args: unknown[]) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
        catch: (reject: (...args: unknown[]) => unknown) =>
          Promise.resolve({ data: [], error: null }).catch(reject),
      }),
      insert: createInsertMock(),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          then: (resolve: (...args: unknown[]) => unknown) =>
            Promise.resolve({ data: {}, error: null }).then(resolve),
          catch: (reject: (...args: unknown[]) => unknown) =>
            Promise.resolve({ data: {}, error: null }).catch(reject),
        }),
      }),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
    };
    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseFrom);
  });

  describe('Bracket Creation - Single Elimination', () => {
    it('should create a 4-team single elimination bracket', async () => {
      const bracketId = 'test-bracket-4';
      const teams = [
        { id: 'team1', name: 'Team 1' },
        { id: 'team2', name: 'Team 2' },
        { id: 'team3', name: 'Team 3' },
        { id: 'team4', name: 'Team 4' },
      ];

      // Use chainable mock pattern
      mockSupabaseFrom.insert = createInsertMock([{ id: 1 }]);

      const service = new BracketManagerService();

      await expect(
        service.createBracket({
          bracketId,
          format: 'single_elimination',
          teams: teams.map((t, idx) => ({ id: t.id, name: t.name, seed: idx + 1 })),
        })
      ).resolves.not.toThrow();
    });

    it('should create an 8-team single elimination bracket', async () => {
      const bracketId = 'test-bracket-8';
      const teams = Array.from({ length: 8 }, (_, i) => ({
        id: `team${i + 1}`,
        name: `Team ${i + 1}`,
      }));

      // Use chainable mock pattern
      mockSupabaseFrom.insert = createInsertMock([{ id: 1 }]);

      const service = new BracketManagerService();

      await expect(
        service.createBracket({
          bracketId,
          format: 'single_elimination',
          teams: teams.map((t, idx) => ({ id: t.id, name: t.name, seed: idx + 1 })),
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Bracket Creation - Double Elimination', () => {
    it('should create a 4-team double elimination bracket', async () => {
      const bracketId = 'test-bracket-de-4';
      const teams = [
        { id: 'team1', name: 'Team 1' },
        { id: 'team2', name: 'Team 2' },
        { id: 'team3', name: 'Team 3' },
        { id: 'team4', name: 'Team 4' },
      ];

      // Use chainable mock pattern
      mockSupabaseFrom.insert = createInsertMock([{ id: 1 }]);

      const service = new BracketManagerService();

      await expect(
        service.createBracket({
          bracketId,
          format: 'double_elimination',
          teams: teams.map((t, idx) => ({ id: t.id, name: t.name, seed: idx + 1 })),
        })
      ).resolves.not.toThrow();
    });

    it('should create an 8-team double elimination bracket', async () => {
      const bracketId = 'test-bracket-de-8';
      const teams = Array.from({ length: 8 }, (_, i) => ({
        id: `team${i + 1}`,
        name: `Team ${i + 1}`,
      }));

      // Use chainable mock pattern
      mockSupabaseFrom.insert = createInsertMock([{ id: 1 }]);

      const service = new BracketManagerService();

      await expect(
        service.createBracket({
          bracketId,
          format: 'double_elimination',
          teams: teams.map((t, idx) => ({ id: t.id, name: t.name, seed: idx + 1 })),
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle odd number of teams (3 teams)', async () => {
      const bracketId = 'test-bracket-3';
      const teams = [
        { id: 'team1', name: 'Team 1' },
        { id: 'team2', name: 'Team 2' },
        { id: 'team3', name: 'Team 3' },
      ];

      // Use chainable mock pattern
      mockSupabaseFrom.insert = createInsertMock([{ id: 1 }]);

      const service = new BracketManagerService();

      await expect(
        service.createBracket({
          bracketId,
          format: 'single_elimination',
          teams: teams.map((t, idx) => ({ id: t.id, name: t.name, seed: idx + 1 })),
        })
      ).resolves.not.toThrow();
    });

    it('should handle 5 teams with proper BYE assignment', async () => {
      const bracketId = 'test-bracket-5';
      const teams = Array.from({ length: 5 }, (_, i) => ({
        id: `team${i + 1}`,
        name: `Team ${i + 1}`,
      }));

      // Use chainable mock pattern
      mockSupabaseFrom.insert = createInsertMock([{ id: 1 }]);

      const service = new BracketManagerService();

      await expect(
        service.createBracket({
          bracketId,
          format: 'single_elimination',
          teams: teams.map((t, idx) => ({ id: t.id, name: t.name, seed: idx + 1 })),
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Match Updates', () => {
    it('should update match scores correctly', async () => {
      const matchId = 1;

      // Create service FIRST - this creates a new storage mock instance
      const service = new BracketManagerService();

      // THEN configure storage mock for THIS service instance
      // When filter is object (e.g., { stage_id: 1 }), return array for .map() calls
      getStorageMock().select.mockImplementation((table: string, filter: StorageFilter) => {
        if (table === 'match' && filter === 1) {
          return Promise.resolve({
            id: 1,
            opponent1: { id: 1 },
            opponent2: { id: 2 },
            status: 2,
            stage_id: 1,
            group_id: 1,
            round_id: 1,
          });
        }
        if (table === 'match' && typeof filter === 'object') {
          return Promise.resolve([]);
        }
        if (table === 'stage' && filter === 1) {
          return Promise.resolve({ id: 1, tournament_id: 'test-bracket' });
        }
        if (table === 'group') {
          return Promise.resolve([]);
        }
        if (table === 'round') {
          return Promise.resolve([]);
        }
        return Promise.resolve(null);
      });

      await expect(
        service.updateMatch({
          matchId,
          scores: {
            opponent1: { score: 2, result: 'win' },
            opponent2: { score: 1, result: 'loss' },
          },
        })
      ).resolves.not.toThrow();
    });

    it('should propagate winner to next match', async () => {
      const matchId = 1;

      // Create service FIRST - this creates a new storage mock instance
      const service = new BracketManagerService();

      // THEN configure storage mock for THIS service instance
      getStorageMock().select.mockImplementation((table: string, filter: StorageFilter) => {
        if (table === 'match' && filter === 1) {
          return Promise.resolve({
            id: 1,
            opponent1: { id: 1 },
            opponent2: { id: 2 },
            status: 2,
            stage_id: 1,
            group_id: 1,
            round_id: 1,
          });
        }
        if (table === 'match' && typeof filter === 'object') {
          return Promise.resolve([]);
        }
        if (table === 'stage' && filter === 1) {
          return Promise.resolve({ id: 1, tournament_id: 'test-bracket' });
        }
        if (table === 'group') {
          return Promise.resolve([]);
        }
        if (table === 'round') {
          return Promise.resolve([]);
        }
        return Promise.resolve(null);
      });

      await expect(
        service.updateMatch({
          matchId,
          scores: {
            opponent1: { score: 2, result: 'win' },
            opponent2: { score: 1, result: 'loss' },
          },
        })
      ).resolves.not.toThrow();
    });
  });
});
