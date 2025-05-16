
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayoffGamesRepository } from '../database/PlayoffGamesRepository';
import { supabase } from '@/integrations/supabase/client';
import { DatabaseOperationError } from '../database/types';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn()
    }
  };
});

describe('PlayoffGamesRepository', () => {
  let repository: PlayoffGamesRepository;
  
  beforeEach(() => {
    repository = new PlayoffGamesRepository();
    vi.clearAllMocks();
  });
  
  describe('saveGames', () => {
    it('should save games successfully', async () => {
      // Arrange
      const mockInsert = { error: null };
      vi.mocked(supabase.from).mockReturnValue({
        ...supabase,
        insert: vi.fn().mockReturnValue(mockInsert)
      } as any);
      
      const games = [
        { 
          id: '1', 
          matchId: 'match1', 
          gameNumber: 1,
          team1Score: 21,
          team2Score: 18,
          winnerId: 'team1'
        }
      ];
      
      // Act
      await repository.saveGames(games);
      
      // Assert
      expect(supabase.from).toHaveBeenCalledWith('playoff_games');
      expect(supabase.from().insert).toHaveBeenCalled();
    });
    
    it('should throw DatabaseOperationError on error', async () => {
      // Arrange
      const mockError = { message: 'DB error' };
      vi.mocked(supabase.from).mockReturnValue({
        ...supabase,
        insert: vi.fn().mockReturnValue({ error: mockError })
      } as any);
      
      const games = [
        { 
          id: '1', 
          matchId: 'match1', 
          gameNumber: 1,
          team1Score: 21,
          team2Score: 18,
          winnerId: 'team1'
        }
      ];
      
      // Act & Assert
      await expect(repository.saveGames(games))
        .rejects
        .toThrow(DatabaseOperationError);
    });
    
    it('should not make DB call when games array is empty', async () => {
      // Arrange
      const games: any[] = [];
      
      // Act
      await repository.saveGames(games);
      
      // Assert
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
  
  describe('getMatchGames', () => {
    it('should return games for a match', async () => {
      // Arrange
      const mockGames = [
        { 
          id: '1',
          match_id: 'match1',
          game_number: 1,
          team1_score: 21,
          team2_score: 18,
          winner_id: 'team1'
        }
      ];
      
      vi.mocked(supabase.from).mockReturnValue({
        ...supabase,
        select: vi.fn().mockReturnValue({
          ...supabase,
          eq: vi.fn().mockReturnValue({
            ...supabase,
            order: vi.fn().mockReturnValue({
              data: mockGames,
              error: null
            })
          })
        })
      } as any);
      
      // Act
      const result = await repository.getMatchGames('match1');
      
      // Assert
      expect(supabase.from).toHaveBeenCalledWith('playoff_games');
      expect(supabase.from().select).toHaveBeenCalledWith('*');
      expect(supabase.from().select().eq).toHaveBeenCalledWith('match_id', 'match1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].matchId).toBe('match1');
    });
    
    it('should throw DatabaseOperationError on error', async () => {
      // Arrange
      const mockError = { message: 'DB error' };
      vi.mocked(supabase.from).mockReturnValue({
        ...supabase,
        select: vi.fn().mockReturnValue({
          ...supabase,
          eq: vi.fn().mockReturnValue({
            ...supabase,
            order: vi.fn().mockReturnValue({
              data: null,
              error: mockError
            })
          })
        })
      } as any);
      
      // Act & Assert
      await expect(repository.getMatchGames('match1'))
        .rejects
        .toThrow(DatabaseOperationError);
    });
  });
});
