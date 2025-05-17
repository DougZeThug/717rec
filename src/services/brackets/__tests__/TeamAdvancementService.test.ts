
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
  let mockUpdateEq: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    service = new TeamAdvancementService();
    vi.clearAllMocks();
    
    // Setup the mock update.eq chain that's reused in tests
    mockUpdateEq = vi.fn().mockReturnValue({ error: null });
    vi.mocked(supabase.from).mockImplementation(() => {
      return {
        ...supabase,
        update: vi.fn().mockReturnValue({
          ...supabase,
          eq: mockUpdateEq
        })
      } as any;
    });
  });
  
  // Helper function to setup match data mocks
  const setupMatchDataMock = (teamData: { team1_id: string | null, team2_id: string | null }) => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      ...supabase,
      select: vi.fn().mockReturnValue({
        ...supabase,
        eq: vi.fn().mockReturnValue({
          ...supabase,
          single: vi.fn().mockReturnValue({
            data: teamData,
            error: null
          })
        })
      })
    } as any);
  };
  
  describe('advanceTeam', () => {
    it('should advance team to team1 slot when team1 is empty', async () => {
      // Arrange
      const matchId = 'next-match-1';
      const teamId = 'team-1';
      const isWinner = true;
      
      // Mock next match with empty team1_id
      setupMatchDataMock({ team1_id: null, team2_id: 'other-team' });
      
      // Act
      await service.advanceTeam(matchId, teamId, isWinner);
      
      // Assert
      expect(supabase.from).toHaveBeenCalledWith('playoff_matches');
      expect(vi.mocked(supabase.from)().update).toHaveBeenCalledWith({ team1_id: teamId });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', matchId);
    });
    
    it('should advance team to team2 slot when team1 is already filled', async () => {
      // Arrange
      const matchId = 'next-match-1';
      const teamId = 'team-1';
      const isWinner = true;
      
      // Mock next match with filled team1_id
      setupMatchDataMock({ team1_id: 'existing-team', team2_id: null });
      
      // Act
      await service.advanceTeam(matchId, teamId, isWinner);
      
      // Assert
      expect(supabase.from).toHaveBeenCalledWith('playoff_matches');
      expect(vi.mocked(supabase.from)().update).toHaveBeenCalledWith({ team2_id: teamId });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', matchId);
    });
    
    it('should throw DatabaseOperationError when match fetch fails', async () => {
      // Arrange
      const matchId = 'next-match-1';
      const teamId = 'team-1';
      const isWinner = true;
      const mockError = { message: 'DB Error' };
      
      // Mock fetch error
      vi.mocked(supabase.from).mockReturnValueOnce({
        ...supabase,
        select: vi.fn().mockReturnValue({
          ...supabase,
          eq: vi.fn().mockReturnValue({
            ...supabase,
            single: vi.fn().mockReturnValue({
              data: null,
              error: mockError
            })
          })
        })
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
      
      // Mock successful fetch but failed update
      setupMatchDataMock({ team1_id: null, team2_id: 'other-team' });
      
      // Override the update mock for this specific test
      mockUpdateEq.mockReturnValueOnce({ error: mockError });
      
      // Act & Assert
      await expect(service.advanceTeam(matchId, teamId, isWinner))
        .rejects
        .toThrow(DatabaseOperationError);
    });
  });
});
