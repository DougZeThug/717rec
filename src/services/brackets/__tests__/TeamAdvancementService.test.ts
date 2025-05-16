
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamAdvancementService } from '../database/TeamAdvancementService';
import { supabase } from '@/integrations/supabase/client';
import { DatabaseOperationError } from '../database/types';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    single: vi.fn()
  };
  
  return {
    supabase: mockSupabase
  };
});

describe('TeamAdvancementService', () => {
  let service: TeamAdvancementService;
  
  beforeEach(() => {
    service = new TeamAdvancementService();
    vi.clearAllMocks();
  });
  
  describe('advanceTeam', () => {
    it('should advance team to team1 slot when team1 is empty', async () => {
      // Arrange
      const matchId = 'next-match-1';
      const teamId = 'team-1';
      const isWinner = true;
      
      // Mock next match with empty team1_id
      vi.mocked(supabase.from).mockReturnValue({
        ...supabase,
        select: vi.fn(() => ({
          ...supabase,
          eq: vi.fn(() => ({
            ...supabase,
            single: vi.fn(() => ({
              data: { team1_id: null, team2_id: 'other-team' },
              error: null
            }))
          }))
        }))
      } as any);
      
      // Mock update
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...supabase,
        select: vi.fn(() => ({
          ...supabase,
          eq: vi.fn(() => ({
            ...supabase,
            single: vi.fn(() => ({
              data: { team1_id: null, team2_id: 'other-team' },
              error: null
            }))
          }))
        }))
      } as any).mockReturnValueOnce({
        ...supabase,
        update: vi.fn(() => ({
          ...supabase,
          eq: vi.fn(() => ({
            error: null
          }))
        }))
      } as any);
      
      // Act
      await service.advanceTeam(matchId, teamId, isWinner);
      
      // Assert
      expect(supabase.from).toHaveBeenCalledWith('playoff_matches');
      expect(supabase.from('playoff_matches').update).toHaveBeenCalledWith({ team1_id: teamId });
      expect(supabase.from('playoff_matches').update().eq).toHaveBeenCalledWith('id', matchId);
    });
    
    it('should advance team to team2 slot when team1 is already filled', async () => {
      // Arrange
      const matchId = 'next-match-1';
      const teamId = 'team-1';
      const isWinner = true;
      
      // Mock next match with filled team1_id
      vi.mocked(supabase.from).mockReturnValue({
        ...supabase,
        select: vi.fn(() => ({
          ...supabase,
          eq: vi.fn(() => ({
            ...supabase,
            single: vi.fn(() => ({
              data: { team1_id: 'existing-team', team2_id: null },
              error: null
            }))
          }))
        }))
      } as any);
      
      // Mock update
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...supabase,
        select: vi.fn(() => ({
          ...supabase,
          eq: vi.fn(() => ({
            ...supabase,
            single: vi.fn(() => ({
              data: { team1_id: 'existing-team', team2_id: null },
              error: null
            }))
          }))
        }))
      } as any).mockReturnValueOnce({
        ...supabase,
        update: vi.fn(() => ({
          ...supabase,
          eq: vi.fn(() => ({
            error: null
          }))
        }))
      } as any);
      
      // Act
      await service.advanceTeam(matchId, teamId, isWinner);
      
      // Assert
      expect(supabase.from).toHaveBeenCalledWith('playoff_matches');
      expect(supabase.from('playoff_matches').update).toHaveBeenCalledWith({ team2_id: teamId });
      expect(supabase.from('playoff_matches').update().eq).toHaveBeenCalledWith('id', matchId);
    });
    
    it('should throw DatabaseOperationError when match fetch fails', async () => {
      // Arrange
      const matchId = 'next-match-1';
      const teamId = 'team-1';
      const isWinner = true;
      const mockError = { message: 'DB Error' };
      
      vi.mocked(supabase.from).mockReturnValue({
        ...supabase,
        select: vi.fn(() => ({
          ...supabase,
          eq: vi.fn(() => ({
            ...supabase,
            single: vi.fn(() => ({
              data: null,
              error: mockError
            }))
          }))
        }))
      } as any);
      
      // Act & Assert
      await expect(service.advanceTeam(matchId, teamId, isWinner))
        .rejects
        .toThrow(DatabaseOperationError);
    });
    
    it('should throw DatabaseOperationError when update fails', async () => {
      // Arrange
      const matchId = 'next-match-1';
      const teamId = 'team-1';
      const isWinner = true;
      const mockError = { message: 'Update Error' };
      
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...supabase,
        select: vi.fn(() => ({
          ...supabase,
          eq: vi.fn(() => ({
            ...supabase,
            single: vi.fn(() => ({
              data: { team1_id: null, team2_id: 'other-team' },
              error: null
            }))
          }))
        }))
      } as any).mockReturnValueOnce({
        ...supabase,
        update: vi.fn(() => ({
          ...supabase,
          eq: vi.fn(() => ({
            error: mockError
          }))
        }))
      } as any);
      
      // Act & Assert
      await expect(service.advanceTeam(matchId, teamId, isWinner))
        .rejects
        .toThrow(DatabaseOperationError);
    });
  });
});
