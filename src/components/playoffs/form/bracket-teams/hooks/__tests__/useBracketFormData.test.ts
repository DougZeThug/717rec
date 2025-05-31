
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBracketFormData } from '../useBracketFormData';
import { Division } from '@/types';

// Mock the dependencies
vi.mock('@/hooks/useTeamRankings', () => ({
  useTeamRankings: vi.fn()
}));

import { useTeamRankings } from '@/hooks/useTeamRankings';

describe('useBracketFormData', () => {
  const mockUseTeamRankings = useTeamRankings as any;

  const mockDivisions: Division[] = [
    { id: 'div-1', name: 'Division A' },
    { id: 'div-2', name: 'Division B' }
  ];

  const mockRankings = [
    {
      teamId: 'team-1',
      teamName: 'Team Alpha',
      powerScore: 1200,
      wins: 10,
      losses: 2,
      winPercentage: 0.83,
      gamesWon: 25,
      gamesLost: 8,
      gameWinPercentage: 0.76,
      sos: 0.65,
      divisionName: 'Division A'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state when rankings are loading', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: null,
      isLoading: true
    });

    const { result } = renderHook(() => 
      useBracketFormData(mockDivisions)
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isDataReady).toBe(false);
    expect(result.current.teams).toEqual([]);
  });

  it('should return teams when data is successfully loaded', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: mockRankings,
      isLoading: false
    });

    const { result } = renderHook(() => 
      useBracketFormData(mockDivisions)
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isDataReady).toBe(true);
    expect(result.current.teams.length).toBe(1);
    expect(result.current.isError).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('should handle error state when rankings fail to load', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: null,
      isLoading: false
    });

    const { result } = renderHook(() => 
      useBracketFormData(mockDivisions)
    );

    expect(result.current.isError).toBe(true);
    expect(result.current.errorMessage).toBe('Failed to load teams. Please refresh and try again.');
    expect(result.current.teams).toEqual([]);
  });

  it('should handle empty rankings array', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: [],
      isLoading: false
    });

    const { result } = renderHook(() => 
      useBracketFormData(mockDivisions)
    );

    expect(result.current.isError).toBe(true);
    expect(result.current.errorMessage).toBe('Failed to load teams. Please refresh and try again.');
  });

  it('should handle undefined divisions parameter', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: mockRankings,
      isLoading: false
    });

    const { result } = renderHook(() => 
      useBracketFormData()
    );

    expect(result.current.isDataReady).toBe(false);
  });
});
