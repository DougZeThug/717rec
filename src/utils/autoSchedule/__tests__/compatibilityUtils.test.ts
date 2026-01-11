import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/integrations/supabase/client';
import { mockTeams } from '@/utils/test/autoSchedule/mockData';

import { calculateTeamCompatibility, haveTeamsPlayed } from '../compatibilityUtils';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

describe('compatibilityUtils', () => {
  describe('calculateTeamCompatibility', () => {
    it('should calculate higher compatibility for teams with similar stats', () => {
      const team1 = mockTeams[0]; // Tigers: 5-2, powerscore 75
      const team2 = mockTeams[1]; // Lions: 6-1, powerscore 85
      const team3 = mockTeams[3]; // Bears: 2-5, powerscore 45

      const score1 = calculateTeamCompatibility(team1, team2);
      const score2 = calculateTeamCompatibility(team1, team3);

      // Teams with similar stats should have higher compatibility
      expect(score1).toBeGreaterThan(score2);
    });

    it('should return a value between 0 and 10', () => {
      mockTeams.forEach((team1) => {
        mockTeams.forEach((team2) => {
          if (team1.id !== team2.id) {
            const score = calculateTeamCompatibility(team1, team2);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(10);
          }
        });
      });
    });

    it('should handle teams with missing stats gracefully', () => {
      const incompleteTeam = { ...mockTeams[0], sos: undefined, power_score: undefined };
      const score = calculateTeamCompatibility(incompleteTeam, mockTeams[1]);

      // Should still calculate a score without errors
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  describe('haveTeamsPlayed', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should return true if teams have played before', async () => {
      // Mock Supabase response for teams that have played
      const mockResponse = { data: [{ id: 'match1' }], error: null };
      const mockLimit = vi.fn().mockResolvedValue(mockResponse);
      const mockOr = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await haveTeamsPlayed('team1', 'team2');
      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('matches');
    });

    it('should return false if teams have not played before', async () => {
      // Mock Supabase response for teams that have not played
      const mockResponse = { data: [], error: null };
      const mockLimit = vi.fn().mockResolvedValue(mockResponse);
      const mockOr = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await haveTeamsPlayed('team1', 'team3');
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Supabase error response
      const mockResponse = { data: null, error: new Error('Database error') };
      const mockLimit = vi.fn().mockResolvedValue(mockResponse);
      const mockOr = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSelect = vi.fn().mockReturnValue({ or: mockOr });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await haveTeamsPlayed('team1', 'team4');
      // Should return false as a fallback on error
      expect(result).toBe(false);
    });
  });
});
