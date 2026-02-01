/**
 * Phase 0 Integration Tests for BracketManagerService
 *
 * Purpose: Safety net before refactoring to ensure all public methods work correctly
 * Coverage: All public methods with correct interfaces
 * Created: 2026-01-21
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/integrations/supabase/client';
import { BracketManagerService } from '@/services/brackets/manager/BracketManagerService';

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
      stage: vi.fn().mockResolvedValue(undefined),
    };
    update = {
      match: vi.fn().mockResolvedValue(undefined),
      seeding: vi.fn().mockResolvedValue(undefined),
    };
    get = {
      finalStandings: vi.fn().mockResolvedValue([
        { id: 1, name: 'Team 1', rank: 1 },
        { id: 2, name: 'Team 2', rank: 2 },
      ]),
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
    enqueue: vi.fn((fn) => fn()), // Execute immediately for testing
  },
}));

// Mock SupabaseSqlStorage
vi.mock('@/services/brackets/manager/SupabaseSqlStorage', () => {
  class MockSupabaseSqlStorage {
    select = vi.fn();
    insert = vi.fn();
    update = vi.fn();
    delete = vi.fn();
    loadParticipantsForTournament = vi.fn().mockResolvedValue(undefined);
    clearParticipantCache = vi.fn();
  }

  return {
    SupabaseSqlStorage: MockSupabaseSqlStorage,
  };
});

describe('BracketManagerService - Phase 0 Public API Tests', () => {
  let service: BracketManagerService;
  let mockSupabaseFrom: any;
  let createInsertMock: (data?: any[], error?: any) => any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Helper to create chainable insert mock
    createInsertMock = (data: any[] = [{ id: 1 }], error: any = null) => {
      return vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data, error }),
      });
    };

    // Setup mock Supabase client with chainable insert().select() pattern
    mockSupabaseFrom = {
      select: vi.fn().mockReturnThis(),
      insert: createInsertMock(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
    };
    (supabase.from as any).mockReturnValue(mockSupabaseFrom);

    service = new BracketManagerService();
  });

  describe('1. createBracket() - Public Method', () => {
    it('should create a single elimination bracket with correct interface', async () => {
      const options = {
        bracketId: 'test-bracket-1',
        format: 'single_elimination' as const,
        teams: [
          { id: 'team1', name: 'Team 1', seed: 1 },
          { id: 'team2', name: 'Team 2', seed: 2 },
          { id: 'team3', name: 'Team 3', seed: 3 },
          { id: 'team4', name: 'Team 4', seed: 4 },
        ],
      };

      // Mock successful participant insertion using chainable pattern
      mockSupabaseFrom.insert = createInsertMock([
        { id: 1, tournament_id: 'test-bracket-1', name: 'Team 1', position: 1 },
        { id: 2, tournament_id: 'test-bracket-1', name: 'Team 2', position: 2 },
        { id: 3, tournament_id: 'test-bracket-1', name: 'Team 3', position: 3 },
        { id: 4, tournament_id: 'test-bracket-1', name: 'Team 4', position: 4 },
      ]);

      // Mock select calls for storage operations
      mockSupabaseFrom.select.mockResolvedValue({ data: [], error: null });

      await expect(service.createBracket(options)).resolves.toBeUndefined();
    });

    it('should create a double elimination bracket with grandFinalType', async () => {
      const options = {
        bracketId: 'test-bracket-de',
        format: 'double_elimination' as const,
        teams: [
          { id: 'team1', name: 'Team 1', seed: 1 },
          { id: 'team2', name: 'Team 2', seed: 2 },
          { id: 'team3', name: 'Team 3', seed: 3 },
          { id: 'team4', name: 'Team 4', seed: 4 },
        ],
        grandFinalType: 'double' as const,
      };

      // Use chainable mock pattern
      mockSupabaseFrom.insert = createInsertMock([{ id: 1 }]);
      mockSupabaseFrom.select.mockResolvedValue({ data: [], error: null });

      await expect(service.createBracket(options)).resolves.toBeUndefined();
    });

    it('should throw error with proper message when participant insertion fails', async () => {
      const options = {
        bracketId: 'test-bracket-error',
        format: 'single_elimination' as const,
        teams: [{ id: 'team1', name: 'Team 1', seed: 1 }],
      };

      // Use chainable mock pattern with error
      mockSupabaseFrom.insert = createInsertMock(null as any, {
        message: 'Database connection failed',
        code: '500',
      });

      await expect(service.createBracket(options)).rejects.toThrow(
        'Failed to insert participants:'
      );
    });
  });

  describe('2. updateMatch() - Public Method', () => {
    it('should update match with correct interface', async () => {
      const options = {
        matchId: 1,
        scores: {
          opponent1: { score: 2, result: 'win' as const },
          opponent2: { score: 1, result: 'loss' as const },
        },
      };

      // Mock current match state
      mockSupabaseFrom.select.mockResolvedValue({
        data: {
          id: 1,
          opponent1: { id: 1 },
          opponent2: { id: 2 },
          status: 2, // Ready
          stage_id: 1,
          group_id: 1,
          round_id: 1,
        },
        error: null,
      });

      // Mock stage lookup
      mockSupabaseFrom.select.mockResolvedValueOnce({
        data: { id: 1, tournament_id: 'test-bracket' },
        error: null,
      });

      await expect(service.updateMatch(options)).resolves.toBeUndefined();
    });

    it('should handle BYE match unlock (status 0 or 1)', async () => {
      const options = {
        matchId: 1,
        scores: {
          opponent1: { score: undefined, result: undefined as any },
          opponent2: { score: undefined, result: undefined as any },
        },
      };

      // Mock BYE match (one opponent is null, status is Locked)
      mockSupabaseFrom.select.mockResolvedValue({
        data: {
          id: 1,
          opponent1: { id: 1 },
          opponent2: null, // BYE
          status: 0, // Locked
          stage_id: 1,
        },
        error: null,
      });

      // Mock status update
      mockSupabaseFrom.update.mockResolvedValue({ data: {}, error: null });

      await expect(service.updateMatch(options)).resolves.toBeUndefined();

      // Verify status was updated to Ready (2)
      expect(mockSupabaseFrom.update).toHaveBeenCalledWith({ status: 2 });
    });

    it('should throw error with proper message on failure', async () => {
      const options = {
        matchId: 999,
        scores: {
          opponent1: { score: 2, result: 'win' as const },
          opponent2: { score: 1, result: 'loss' as const },
        },
      };

      mockSupabaseFrom.select.mockRejectedValue(new Error('Match not found'));

      await expect(service.updateMatch(options)).rejects.toThrow('Match update failed:');
    });
  });

  describe('3. updateSeeding() - Public Method', () => {
    it('should update seeding with correct interface', async () => {
      const options = {
        bracketId: 'test-bracket',
        newSeeding: [
          { id: 'team1', name: 'Team 1', seed: 1 },
          { id: 'team2', name: 'Team 2', seed: 2 },
          { id: 'team3', name: 'Team 3', seed: 3 },
          { id: 'team4', name: 'Team 4', seed: 4 },
        ],
        keepSameSize: true,
      };

      // Mock stage lookup
      mockSupabaseFrom.select.mockResolvedValueOnce({
        data: [{ id: 1, tournament_id: 'test-bracket' }],
        error: null,
      });

      // Mock participants lookup
      mockSupabaseFrom.select.mockResolvedValueOnce({
        data: [
          { id: 1, name: 'Team 1', tournament_id: 'test-bracket' },
          { id: 2, name: 'Team 2', tournament_id: 'test-bracket' },
          { id: 3, name: 'Team 3', tournament_id: 'test-bracket' },
          { id: 4, name: 'Team 4', tournament_id: 'test-bracket' },
        ],
        error: null,
      });

      // Mock participant position updates
      mockSupabaseFrom.update.mockResolvedValue({ data: {}, error: null });

      await expect(service.updateSeeding(options)).resolves.toBeUndefined();
    });

    it('should throw error when no stage found', async () => {
      const options = {
        bracketId: 'non-existent',
        newSeeding: [{ id: 'team1', name: 'Team 1', seed: 1 }],
      };

      mockSupabaseFrom.select.mockResolvedValue({
        data: [],
        error: null,
      });

      await expect(service.updateSeeding(options)).rejects.toThrow(
        'No stage found for bracket:'
      );
    });

    it('should throw specific error for changes affecting existing results', async () => {
      const options = {
        bracketId: 'test-bracket',
        newSeeding: [{ id: 'team1', name: 'Team 1', seed: 1 }],
      };

      mockSupabaseFrom.select.mockResolvedValue({
        data: [{ id: 1 }],
        error: null,
      });

      // Mock brackets-manager throwing error about existing results
      const service = new BracketManagerService();
      (service as any).manager.update.seeding = vi
        .fn()
        .mockRejectedValue(new Error('Cannot impact existing results'));

      await expect(service.updateSeeding(options)).rejects.toThrow(
        'Cannot update seeding: Changes would affect existing match results'
      );
    });
  });

  describe('4. calculateFinalStandings() - Public Method', () => {
    it('should calculate final standings and upsert to playoff_team_records', async () => {
      const bracketId = 'test-bracket';

      // Mock stage lookup
      mockSupabaseFrom.select.mockResolvedValueOnce({
        data: [{ id: 1, tournament_id: bracketId }],
        error: null,
      });

      // Mock participants lookup
      mockSupabaseFrom.select.mockResolvedValueOnce({
        data: [
          { id: 1, team_id: 'team1', name: 'Team 1' },
          { id: 2, team_id: 'team2', name: 'Team 2' },
        ],
        error: null,
      });

      // Mock upsert
      mockSupabaseFrom.upsert.mockResolvedValue({ data: {}, error: null });

      await expect(service.calculateFinalStandings(bracketId)).resolves.toBeUndefined();

      // Verify upsert was called with correct data
      expect(mockSupabaseFrom.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            team_id: 'team1',
            bracket_id: bracketId,
            placement: 1,
          }),
          expect.objectContaining({
            team_id: 'team2',
            bracket_id: bracketId,
            placement: 2,
          }),
        ]),
        { onConflict: 'team_id,bracket_id' }
      );
    });

    it('should return early when no stages found', async () => {
      const bracketId = 'empty-bracket';

      mockSupabaseFrom.select.mockResolvedValue({
        data: [],
        error: null,
      });

      // Should not throw, just return early
      await expect(service.calculateFinalStandings(bracketId)).resolves.toBeUndefined();
    });

    it('should throw error when upsert fails', async () => {
      const bracketId = 'test-bracket';

      mockSupabaseFrom.select.mockResolvedValueOnce({
        data: [{ id: 1 }],
        error: null,
      });

      mockSupabaseFrom.select.mockResolvedValueOnce({
        data: [{ id: 1, team_id: 'team1' }],
        error: null,
      });

      mockSupabaseFrom.upsert.mockResolvedValue({
        data: null,
        error: { message: 'Upsert failed' },
      });

      await expect(service.calculateFinalStandings(bracketId)).rejects.toThrow(
        'Final standings calculation failed:'
      );
    });
  });

  describe('5. checkByeEligibility() - Public Method', () => {
    it('should return ok: true for eligible BYE match', async () => {
      const matchId = 1;

      // Mock match in Losers Bracket with one BYE
      mockSupabaseFrom.select
        .mockResolvedValueOnce({
          data: {
            id: matchId,
            opponent1: { id: 1 },
            opponent2: null, // BYE
            status: 1, // Waiting
            round_id: 1,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, group_id: 1 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, number: 2 }, // Losers Bracket (group 2)
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, name: 'Team 1' },
          error: null,
        });

      const result = await service.checkByeEligibility(matchId);

      expect(result.ok).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.meta?.isLosers).toBe(true);
      expect(result.meta?.exactlyOneReal).toBe(true);
    });

    it('should return ok: false for non-eligible match with reason', async () => {
      const matchId = 1;

      // Mock match in Winners Bracket (not eligible)
      mockSupabaseFrom.select
        .mockResolvedValueOnce({
          data: {
            id: matchId,
            opponent1: { id: 1 },
            opponent2: { id: 2 }, // Both real teams
            status: 2,
            round_id: 1,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, group_id: 1 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, number: 1 }, // Winners Bracket (group 1)
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, name: 'Team 1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 2, name: 'Team 2' },
          error: null,
        });

      const result = await service.checkByeEligibility(matchId);

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Not in Losers Bracket');
    });

    it('should return ok: false with error message on exception', async () => {
      const matchId = 999;

      mockSupabaseFrom.select.mockRejectedValue(new Error('Match not found'));

      const result = await service.checkByeEligibility(matchId);

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Error:');
    });
  });

  describe('6. adminToggleByeReady() - Public Method', () => {
    it('should set match to Ready when makeReady is true', async () => {
      const matchId = 1;

      // Mock eligible BYE match
      mockSupabaseFrom.select
        .mockResolvedValueOnce({
          data: {
            id: matchId,
            opponent1: { id: 1 },
            opponent2: null,
            status: 1, // Waiting
            round_id: 1,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, group_id: 1 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, number: 2 }, // Losers Bracket
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, name: 'Team 1' },
          error: null,
        });

      mockSupabaseFrom.update.mockResolvedValue({ data: {}, error: null });

      const result = await service.adminToggleByeReady(matchId, true);

      expect(result.status).toBe(2); // Ready
      expect(result.statusName).toBe('Ready');
      expect(result.message).toContain('unlocked to Ready');
    });

    it('should revert match to Waiting when makeReady is false', async () => {
      const matchId = 1;

      // Mock BYE match in Ready status
      mockSupabaseFrom.select
        .mockResolvedValueOnce({
          data: {
            id: matchId,
            opponent1: { id: 1 },
            opponent2: null,
            status: 2, // Ready
            round_id: 1,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, group_id: 1 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, number: 2 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, name: 'Team 1' },
          error: null,
        });

      mockSupabaseFrom.update.mockResolvedValue({ data: {}, error: null });

      const result = await service.adminToggleByeReady(matchId, false);

      expect(result.status).toBe(1); // Waiting
      expect(result.statusName).toBe('Waiting');
    });

    it('should reopen completed match with clearDownstream', async () => {
      const matchId = 1;

      // Mock completed BYE match
      mockSupabaseFrom.select
        .mockResolvedValueOnce({
          data: {
            id: matchId,
            opponent1: { id: 1, result: 'win' },
            opponent2: null,
            status: 4, // Completed
            round_id: 1,
            stage_id: 1,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, group_id: 1 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, number: 2 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, name: 'Team 1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: matchId,
            opponent1: { id: 1 },
            stage_id: 1,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            { id: 2, opponent1: { id: 1 }, opponent2: { id: 3 } }, // Downstream match
          ],
          error: null,
        });

      mockSupabaseFrom.update.mockResolvedValue({ data: {}, error: null });

      const result = await service.adminToggleByeReady(matchId, false, true);

      expect(result.status).toBe(2); // Ready
      expect(result.message).toContain('downstream matches cleared');
    });

    it('should throw error when trying to reopen completed match without clearDownstream', async () => {
      const matchId = 1;

      // Mock completed BYE match with downstream
      mockSupabaseFrom.select
        .mockResolvedValueOnce({
          data: {
            id: matchId,
            opponent1: { id: 1, result: 'win' },
            opponent2: null,
            status: 4,
            round_id: 1,
            stage_id: 1,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, group_id: 1 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, number: 2 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 1, name: 'Team 1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: matchId, opponent1: { id: 1 }, stage_id: 1 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ id: 2, opponent1: { id: 1 } }], // Has downstream
          error: null,
        });

      await expect(service.adminToggleByeReady(matchId, false, false)).rejects.toThrow(
        'downstream matches have been populated'
      );
    });
  });

  describe('7. getStorage() - Public Method', () => {
    it('should return SupabaseSqlStorage instance', () => {
      const storage = service.getStorage();

      expect(storage).toBeDefined();
      expect(storage.constructor.name).toBe('SupabaseSqlStorage');
    });
  });

  describe('8. normalizeLosersR1() - Public Method', () => {
    it('should fix duplicate participants in LB R1', async () => {
      const stageId = 1;

      // Mock LB group
      mockSupabaseFrom.select
        .mockResolvedValueOnce({
          data: [
            { id: 1, number: 1 }, // WB
            { id: 2, number: 2 }, // LB
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            { id: 1, number: 1, group_id: 2 }, // LB R1
            { id: 2, number: 2, group_id: 2 }, // LB R2
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              id: 1,
              opponent1: { id: 1 },
              opponent2: { id: 1 }, // DUPLICATE!
              status: 2,
            },
          ],
          error: null,
        });

      mockSupabaseFrom.update.mockResolvedValue({ data: {}, error: null });

      await expect(service.normalizeLosersR1(stageId)).resolves.toBeUndefined();

      // Verify duplicate was cleared
      expect(mockSupabaseFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          opponent2_id: null,
        })
      );
    });

    it('should shift opponent2 to opponent1 if opponent1 is empty', async () => {
      const stageId = 1;

      mockSupabaseFrom.select
        .mockResolvedValueOnce({
          data: [{ id: 2, number: 2 }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ id: 1, number: 1, group_id: 2 }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              id: 1,
              opponent1: null, // Empty
              opponent2: { id: 2 }, // Should shift
              status: 2,
            },
          ],
          error: null,
        });

      await expect(service.normalizeLosersR1(stageId)).resolves.toBeUndefined();
    });

    it('should return early if no LB group found', async () => {
      const stageId = 1;

      mockSupabaseFrom.select.mockResolvedValue({
        data: [{ id: 1, number: 1 }], // Only WB, no LB
        error: null,
      });

      // Should not throw, just return early
      await expect(service.normalizeLosersR1(stageId)).resolves.toBeUndefined();
    });
  });
});
