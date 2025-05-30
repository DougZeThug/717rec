
import { renderHook } from '@testing-library/react';
import { useBracketFormData } from '../useBracketFormData';
import { Division } from '@/types';

// Mock the dependencies
jest.mock('@/hooks/useTeamRankings', () => ({
  useTeamRankings: jest.fn()
}));

jest.mock('../useDivisionMapping', () => ({
  useDivisionMapping: jest.fn()
}));

jest.mock('../useTeamDataProcessor', () => ({
  useTeamDataProcessor: jest.fn()
}));

import { useTeamRankings } from '@/hooks/useTeamRankings';
import { useDivisionMapping } from '../useDivisionMapping';
import { useTeamDataProcessor } from '../useTeamDataProcessor';

describe('useBracketFormData', () => {
  const mockUseTeamRankings = useTeamRankings as jest.MockedFunction<typeof useTeamRankings>;
  const mockUseDivisionMapping = useDivisionMapping as jest.MockedFunction<typeof useDivisionMapping>;
  const mockUseTeamDataProcessor = useTeamDataProcessor as jest.MockedFunction<typeof useTeamDataProcessor>;

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

  const mockProcessedTeams = [
    {
      id: 'team-1',
      name: 'Team Alpha',
      seed: 1,
      powerScore: 1200,
      wins: 10,
      losses: 2,
      division_id: 'div-1',
      divisionName: 'Division A',
      logoUrl: null,
      imageUrl: null,
      players: [],
      created_at: '2024-01-01T00:00:00.000Z',
      game_wins: 25,
      game_losses: 8,
      sos: 0.65,
      power_score: 1200,
      win_percentage: 0.83,
      game_win_percentage: 0.76,
      close_match_losses: 0
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state when rankings are loading', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: null,
      isLoading: true
    });

    mockUseDivisionMapping.mockReturnValue({
      divisionMap: new Map(),
      mapDivisionName: jest.fn()
    });

    mockUseTeamDataProcessor.mockReturnValue({
      processedTeams: [],
      processingError: null
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

    mockUseDivisionMapping.mockReturnValue({
      divisionMap: new Map([['Division A', 'div-1']]),
      mapDivisionName: jest.fn()
    });

    mockUseTeamDataProcessor.mockReturnValue({
      processedTeams: mockProcessedTeams,
      processingError: null
    });

    const { result } = renderHook(() => 
      useBracketFormData(mockDivisions)
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isDataReady).toBe(true);
    expect(result.current.teams).toEqual(mockProcessedTeams);
    expect(result.current.isError).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('should handle error state when rankings fail to load', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: null,
      isLoading: false
    });

    mockUseDivisionMapping.mockReturnValue({
      divisionMap: new Map(),
      mapDivisionName: jest.fn()
    });

    mockUseTeamDataProcessor.mockReturnValue({
      processedTeams: [],
      processingError: null
    });

    const { result } = renderHook(() => 
      useBracketFormData(mockDivisions)
    );

    expect(result.current.isError).toBe(true);
    expect(result.current.errorMessage).toBe('Failed to load teams. Please refresh and try again.');
    expect(result.current.teams).toEqual([]);
  });

  it('should handle processing error', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: mockRankings,
      isLoading: false
    });

    mockUseDivisionMapping.mockReturnValue({
      divisionMap: new Map(),
      mapDivisionName: jest.fn()
    });

    mockUseTeamDataProcessor.mockReturnValue({
      processedTeams: [],
      processingError: 'Failed to process team data'
    });

    const { result } = renderHook(() => 
      useBracketFormData(mockDivisions)
    );

    expect(result.current.errorMessage).toBe('Failed to process team data');
    expect(result.current.teams).toEqual([]);
  });

  it('should handle empty rankings array', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: [],
      isLoading: false
    });

    mockUseDivisionMapping.mockReturnValue({
      divisionMap: new Map(),
      mapDivisionName: jest.fn()
    });

    mockUseTeamDataProcessor.mockReturnValue({
      processedTeams: [],
      processingError: null
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

    mockUseDivisionMapping.mockReturnValue({
      divisionMap: new Map(),
      mapDivisionName: jest.fn()
    });

    mockUseTeamDataProcessor.mockReturnValue({
      processedTeams: [],
      processingError: null
    });

    const { result } = renderHook(() => 
      useBracketFormData()
    );

    expect(result.current.isDataReady).toBe(false);
  });

  it('should determine data readiness correctly', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    mockUseTeamRankings.mockReturnValue({
      rankings: mockRankings,
      isLoading: false
    });

    mockUseDivisionMapping.mockReturnValue({
      divisionMap: new Map(),
      mapDivisionName: jest.fn()
    });

    mockUseTeamDataProcessor.mockReturnValue({
      processedTeams: mockProcessedTeams,
      processingError: null
    });

    renderHook(() => 
      useBracketFormData(mockDivisions)
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'useBracketFormData: Data readiness check',
      expect.objectContaining({
        rankingsLoading: false,
        hasRankings: true,
        rankingsLength: 1,
        hasDivisions: true,
        divisionsLength: 2,
        isDataReady: true
      })
    );

    consoleSpy.mockRestore();
  });
});
