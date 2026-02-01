import { format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/integrations/supabase/client';

import { getTeamsByBackToBackPair } from '../teamLoaderUtils';

// Mock Supabase client (per-test implementations override in beforeEach)
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock BACK_TO_BACK_PAIRS
vi.mock('../constants', () => ({
  BACK_TO_BACK_PAIRS: {
    Early: { primary: '6:30 PM', secondary: '7:00 PM' },
    Mid: { primary: '7:30 PM', secondary: '8:00 PM' },
    Late: { primary: '8:30 PM', secondary: '9:00 PM' },
  },
  getPairConfig: vi.fn((pairName: string) => {
    const pairs: Record<string, { primary: string; secondary: string }> = {
      Early: { primary: '6:30 PM', secondary: '7:00 PM' },
      Mid: { primary: '7:30 PM', secondary: '8:00 PM' },
      Late: { primary: '8:30 PM', secondary: '9:00 PM' },
    };
    return pairs[pairName] || null;
  }),
  getBackToBackPairName: vi.fn(),
}));

describe('teamLoaderUtils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getTeamsByBackToBackPair', () => {
    it('should fetch teams for a given back-to-back pair', async () => {
      // Mock successful Supabase response with valid back-to-back data
      const mockTeamData = [
        {
          id: 'slot1',
          team_id: 'team1',
          timeslot: '6:30 PM',
          match_date: '2023-06-15',
          is_back_to_back: true,
          pair_slot: '7:00 PM',
          match_sequence: 1,
          teams: {
            id: 'team1',
            name: 'Tigers',
            logo_url: '/logos/tigers.png',
            image_url: null,
            division_id: 'division1',
            divisions: { name: 'Division A', display_division: 'Division A' },
            wins: 5,
            losses: 2,
            game_wins: 15,
            game_losses: 6,
          },
        },
        {
          id: 'slot2',
          team_id: 'team1',
          timeslot: '7:00 PM',
          match_date: '2023-06-15',
          is_back_to_back: true,
          pair_slot: '6:30 PM',
          match_sequence: 2,
          teams: {
            id: 'team1',
            name: 'Tigers',
            logo_url: '/logos/tigers.png',
            image_url: null,
            division_id: 'division1',
            divisions: { name: 'Division A', display_division: 'Division A' },
            wins: 5,
            losses: 2,
            game_wins: 15,
            game_losses: 6,
          },
        },
      ];

      const mockResponse = { data: mockTeamData, error: null };
      const mockEq3 = vi.fn().mockResolvedValue(mockResponse);
      const mockIn = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq2 = vi.fn().mockReturnValue({ in: mockIn });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const testDate = new Date('2023-06-15');
      const teams = await getTeamsByBackToBackPair(testDate, 'Early');

      // Should call Supabase with correct parameters
      expect(supabase.from).toHaveBeenCalledWith('team_timeslots');
      expect(mockSelect).toHaveBeenCalled();

      const formattedDate = format(testDate, 'yyyy-MM-dd');
      expect(mockEq2).toHaveBeenCalledWith('match_date', formattedDate);

      // Should return formatted team data (1 team with both back-to-back slots)
      expect(teams).toHaveLength(1);
      expect(teams[0].name).toBe('Tigers');
    });

    it('should handle empty results', async () => {
      // Mock empty Supabase response
      const mockResponse = { data: [], error: null };
      const mockEq3 = vi.fn().mockResolvedValue(mockResponse);
      const mockIn = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq2 = vi.fn().mockReturnValue({ in: mockIn });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const testDate = new Date('2023-06-15');
      const teams = await getTeamsByBackToBackPair(testDate, 'Early');

      // Should return empty array
      expect(teams).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Supabase error response
      const mockResponse = { data: null, error: new Error('Database error') };
      const mockEq3 = vi.fn().mockResolvedValue(mockResponse);
      const mockIn = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq2 = vi.fn().mockReturnValue({ in: mockIn });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const testDate = new Date('2023-06-15');

      // Should return empty array on error (graceful degradation)
      const teams = await getTeamsByBackToBackPair(testDate, 'Early');
      expect(teams).toHaveLength(0);
    });
  });
});
