import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/hooks/use-toast';
import { PairingResult } from '@/types/autoSchedule';
import * as compatibilityUtils from '@/utils/autoSchedule/compatibilityUtils';
import { mockDate, mockTeams, mockTimeBlockTeams } from '@/utils/test/autoSchedule/mockData';

import { usePairingGenerator } from '../scheduling/usePairingGenerator';

// Mock dependencies
vi.mock('@/utils/autoSchedule/compatibilityUtils');
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(),
}));

// Create properly typed mocks
const mockCompatibilityUtils = vi.mocked(compatibilityUtils);
const mockUseToast = vi.mocked(useToast);

describe('usePairingGenerator', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Create a simple mock that satisfies the toast interface
    const mockToast = {
      toast: vi.fn(),
      dismiss: vi.fn(),
      toasts: [],
    } as unknown as ReturnType<typeof useToast>;

    mockUseToast.mockReturnValue(mockToast);

    // Mock utility functions
    mockCompatibilityUtils.calculateTeamCompatibility.mockReturnValue(8.5);
    mockCompatibilityUtils.haveTeamsPlayed.mockResolvedValue(false);
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => usePairingGenerator());

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.generatedPairings).toEqual({});
    expect(Object.keys(result.current)).toContain('generateMatchPairings');
  });

  it('should generate pairings for valid time blocks', async () => {
    const { result } = renderHook(() => usePairingGenerator());

    let pairings: PairingResult | null = null;
    await act(async () => {
      pairings = await result.current.generateMatchPairings(mockDate, mockTimeBlockTeams);
    });

    expect(result.current.isGenerating).toBe(false);

    // Should have pairings result
    expect(pairings).not.toBeNull();
    expect(pairings).toHaveProperty('pairings');
    expect(pairings).toHaveProperty('unmatchedTeamIds');

    if (pairings) {
      // Should have pairings for each time block
      expect(pairings.pairings).toHaveProperty('6:30');
      expect(pairings.pairings).toHaveProperty('7:30');
      expect(pairings.pairings).toHaveProperty('8:30');

      // Time blocks with teams should have pairings
      expect(pairings.pairings['6:30']).toHaveLength(1);
      expect(pairings.pairings['7:30']).toHaveLength(1);
      expect(pairings.pairings['8:30']).toHaveLength(0);

      // Pairings should have the expected properties
      const firstPairing = pairings.pairings['6:30'][0];
      expect(firstPairing).toHaveProperty('team1');
      expect(firstPairing).toHaveProperty('team2');
      expect(firstPairing).toHaveProperty('compatibilityScore');
      expect(firstPairing).toHaveProperty('hasPlayedBefore');
    }
  });

  it('should handle odd number of teams in a block', async () => {
    // Mock data with odd number in a block
    const oddBlocksData = {
      ...mockTimeBlockTeams,
      '6:30': [mockTeams[0], mockTeams[1], mockTeams[2]], // 3 teams (odd)
    };

    const { result } = renderHook(() => usePairingGenerator());

    let pairings: PairingResult | null = null;
    await act(async () => {
      pairings = await result.current.generateMatchPairings(mockDate, oddBlocksData);
    });

    // Should still generate some pairings, but not all teams can be paired
    expect(pairings).not.toBeNull();
    if (pairings) {
      expect(pairings.pairings['6:30'].length).toBe(1); // Can only pair 2 of the 3 teams
      expect(pairings.pairings['7:30'].length).toBe(1); // Still pairs the 2 teams in this block
    }
  });

  it('should handle errors during pairing generation', async () => {
    // Mock error in compatibility function
    mockCompatibilityUtils.calculateTeamCompatibility.mockImplementation(() => {
      throw new Error('Calculation error');
    });

    const { result } = renderHook(() => usePairingGenerator());
    const mockToast = mockUseToast().toast;

    let pairings: PairingResult | null = null;
    await act(async () => {
      pairings = await result.current.generateMatchPairings(mockDate, mockTimeBlockTeams);
    });

    // Should show error toast
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to generate match pairings. Please try again.',
      variant: 'destructive',
    });

    // Should return null on error
    expect(pairings).toBeNull();
  });
});
