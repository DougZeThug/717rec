
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTeamsByTimeBlock } from '../teamLoaderUtils';
import { mockTeams } from '@/utils/test/autoSchedule/mockData';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }
}));

// Mock TIME_BLOCKS
vi.mock('../constants', () => ({
  TIME_BLOCKS: {
    '6:30': { main: '6:30 PM', secondary: '7:00 PM' },
    '7:30': { main: '7:30 PM', secondary: '8:00 PM' },
    '8:30': { main: '8:30 PM', secondary: '9:00 PM' }
  }
}));

describe('teamLoaderUtils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getTeamsByTimeBlock', () => {
    it('should fetch teams for a given time block', async () => {
      // Mock successful Supabase response
      const mockTeamData = [
        {
          team_id: 'team1',
          teams: {
            id: 'team1',
            name: 'Tigers',
            logo_url: '/logos/tigers.png',
            image_url: null,
            division_id: 'division1',
            divisionName: { name: 'Division A' },
            wins: 5,
            losses: 2,
            game_wins: 15,
            game_losses: 6,
            sos: 0.6,
            power_score: 75
          }
        },
        {
          team_id: 'team2',
          teams: {
            id: 'team2',
            name: 'Lions',
            logo_url: '/logos/lions.png',
            image_url: null,
            division_id: 'division1',
            divisionName: { name: 'Division A' },
            wins: 6,
            losses: 1,
            game_wins: 18,
            game_losses: 3,
            sos: 0.7,
            power_score: 85
          }
        }
      ];
      
      const mockResponse = { data: mockTeamData, error: null };
      const mockEq = vi.fn().mockResolvedValue(mockResponse);
      const mockEqFirst = vi.fn().mockReturnValue({ eq: mockEq });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqFirst });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const testDate = new Date('2023-06-15');
      const teams = await getTeamsByTimeBlock(testDate, '6:30');

      // Should call Supabase with correct parameters
      expect(supabase.from).toHaveBeenCalledWith('team_timeslots');
      expect(mockSelect).toHaveBeenCalled();
      
      const formattedDate = format(testDate, 'yyyy-MM-dd');
      expect(mockEqFirst).toHaveBeenCalledWith('match_date', formattedDate);
      
      // Should return formatted team data
      expect(teams).toHaveLength(2);
      expect(teams[0].name).toBe('Tigers');
      expect(teams[1].name).toBe('Lions');
    });

    it('should handle empty results', async () => {
      // Mock empty Supabase response
      const mockResponse = { data: [], error: null };
      const mockEq = vi.fn().mockResolvedValue(mockResponse);
      const mockEqFirst = vi.fn().mockReturnValue({ eq: mockEq });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqFirst });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const testDate = new Date('2023-06-15');
      const teams = await getTeamsByTimeBlock(testDate, '6:30');

      // Should return empty array
      expect(teams).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Mock Supabase error response
      const mockResponse = { data: null, error: new Error('Database error') };
      const mockEq = vi.fn().mockResolvedValue(mockResponse);
      const mockEqFirst = vi.fn().mockReturnValue({ eq: mockEq });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqFirst });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const testDate = new Date('2023-06-15');
      
      // Should throw the error
      await expect(getTeamsByTimeBlock(testDate, '6:30')).rejects.toThrow();
    });
  });
});
