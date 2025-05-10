
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { usePairingGenerator } from '../usePairingGenerator';
import { mockTeams, mockTimeBlockTeams, mockDate } from '@/utils/test/autoSchedule/mockData';
import * as compatibilityUtils from '@/utils/autoSchedule/compatibilityUtils';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/utils/autoSchedule/compatibilityUtils');
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn()
}));

describe('usePairingGenerator', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock toast
    vi.mocked(useToast).mockReturnValue({
      toast: vi.fn(),
    } as any);
    
    // Mock utility functions
    vi.mocked(compatibilityUtils.calculateTeamCompatibility).mockReturnValue(8.5);
    vi.mocked(compatibilityUtils.haveTeamsPlayed).mockResolvedValue(false);
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => usePairingGenerator());
    
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.generatedPairings).toEqual({});
    expect(Object.keys(result.current)).toContain('generateMatchPairings');
  });

  it('should generate pairings for valid time blocks', async () => {
    const { result } = renderHook(() => usePairingGenerator());
    
    let pairings;
    await act(async () => {
      pairings = await result.current.generateMatchPairings(mockDate, mockTimeBlockTeams);
    });
    
    expect(result.current.isGenerating).toBe(false);
    
    // Should have pairings for each time block
    expect(pairings).toHaveProperty('6:30');
    expect(pairings).toHaveProperty('7:30');
    expect(pairings).toHaveProperty('8:30');
    
    // Time blocks with teams should have pairings
    expect(pairings?.['6:30']).toHaveLength(1);
    expect(pairings?.['7:30']).toHaveLength(1);
    expect(pairings?.['8:30']).toHaveLength(0);
    
    // Pairings should have the expected properties
    const firstPairing = pairings?.['6:30'][0];
    expect(firstPairing).toHaveProperty('team1');
    expect(firstPairing).toHaveProperty('team2');
    expect(firstPairing).toHaveProperty('compatibilityScore');
    expect(firstPairing).toHaveProperty('hasPlayedBefore');
  });

  it('should handle odd number of teams in a block', async () => {
    // Mock data with odd number in a block
    const oddBlocksData = {
      ...mockTimeBlockTeams,
      '6:30': [mockTeams[0], mockTeams[1], mockTeams[2]] // 3 teams (odd)
    };
    
    const { result } = renderHook(() => usePairingGenerator());
    
    let pairings;
    await act(async () => {
      pairings = await result.current.generateMatchPairings(mockDate, oddBlocksData);
    });
    
    // Should still generate some pairings, but not all teams can be paired
    expect(pairings?.['6:30'].length).toBe(1); // Can only pair 2 of the 3 teams
    expect(pairings?.['7:30'].length).toBe(1); // Still pairs the 2 teams in this block
  });

  it('should handle errors during pairing generation', async () => {
    // Mock error in compatibility function
    vi.mocked(compatibilityUtils.calculateTeamCompatibility).mockImplementation(() => {
      throw new Error('Calculation error');
    });
    
    const { result } = renderHook(() => usePairingGenerator());
    const toast = vi.mocked(useToast()).toast;
    
    let pairings;
    await act(async () => {
      pairings = await result.current.generateMatchPairings(mockDate, mockTimeBlockTeams);
    });
    
    // Should show error toast
    expect(toast).toHaveBeenCalledWith({
      title: "Error",
      description: "Failed to generate match pairings. Please try again.",
      variant: "destructive"
    });
    
    // Should return null on error
    expect(pairings).toBeNull();
  });
});
