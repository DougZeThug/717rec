
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { BracketCreationService } from '../src/services/brackets/services/BracketCreationService';
import { BracketMigrationService } from '../src/services/brackets/migration/BracketMigrationService';

// Mock the brackets-manager
vi.mock('../src/services/brackets/manager/BracketManager', () => ({
  bracketManager: {
    registerParticipants: vi.fn().mockResolvedValue(undefined),
    createStage: vi.fn().mockResolvedValue(undefined),
    deleteMatches: vi.fn().mockResolvedValue(undefined),
  }
}));

// Mock the supabase client
vi.mock('@/integrations/supabase/client', async () => {
  return { 
    supabase: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null, count: 1 }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      match: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
  };
});

describe('Bracket Creation and Migration Tests', () => {
  const divisionId = uuidv4();
  const teamIds = Array.from({ length: 4 }, () => uuidv4());
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('BracketCreationService', () => {
    it('should create a bracket with seedOrdering parameter', async () => {
      // Get the mocked reference
      const { bracketManager } = await import('../src/services/brackets/manager/BracketManager');
      
      // Call the method
      await BracketCreationService.createBracket(
        'Single Elimination',
        'Test Bracket',
        divisionId,
        teamIds
      );
      
      // Check that createStage was called with the correct parameters
      expect(bracketManager.createStage).toHaveBeenCalledTimes(1);
      
      // Check specifically for seedOrdering parameter
      expect(bracketManager.createStage).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            seedOrdering: ['natural']
          })
        })
      );
    });
  });

  describe('BracketMigrationService', () => {
    it('should migrate a bracket with seedOrdering parameter', async () => {
      // Mock implementation for getBracketsForMigration
      BracketMigrationService.getBracketsForMigration = vi.fn().mockResolvedValue([
        {
          id: 'test-bracket-id',
          name: 'Test Bracket',
          format: 'Single Elimination',
          divisionId: divisionId
        }
      ]);
      
      // Mock implementation for getMatchesForBracket
      BracketMigrationService.getMatchesForBracket = vi.fn().mockResolvedValue([]);
      
      // Mock implementation for getTeamsForBracket
      BracketMigrationService.getTeamsForBracket = vi.fn().mockResolvedValue(
        teamIds.map(id => ({ id, name: `Team ${id.substring(0, 5)}` }))
      );
      
      // Get the mocked reference
      const { bracketManager } = await import('../src/services/brackets/manager/BracketManager');
      
      // Call the method
      await BracketMigrationService.migrateBracket('test-bracket-id');
      
      // Check that createStage was called with the correct parameters
      expect(bracketManager.createStage).toHaveBeenCalledTimes(1);
      
      // Check specifically for seedOrdering parameter
      expect(bracketManager.createStage).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            seedOrdering: ['natural']
          })
        })
      );
    });
  });
});
