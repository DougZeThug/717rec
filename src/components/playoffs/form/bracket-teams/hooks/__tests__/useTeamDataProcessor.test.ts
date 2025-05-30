import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTeamDataProcessor } from '../useTeamDataProcessor';
import { Ranking, DivisionMappingResult } from '../types/index';

describe('useTeamDataProcessor', () => {
  const mockRankings: Ranking[] = [
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
      divisionName: 'Division A',
      closeMatchLosses: 1
    },
    {
      teamId: 'team-2',
      teamName: 'Team Beta',
      powerScore: 1100,
      wins: 8,
      losses: 4,
      winPercentage: 0.67,
      gamesWon: 20,
      gamesLost: 12,
      gameWinPercentage: 0.63,
      sos: 0.55,
      divisionName: 'Division B'
    }
  ];

  const mockDivisionMapping: DivisionMappingResult = {
    divisionMap: new Map([
      ['Division A', 'div-1'],
      ['Division B', 'div-2']
    ]),
    mapDivisionName: (name: string) => {
      const map = new Map([
        ['Division A', 'div-1'],
        ['Division B', 'div-2']
      ]);
      return map.get(name) || null;
    }
  };

  it('should process rankings into teams when data is ready', () => {
    const { result } = renderHook(() => 
      useTeamDataProcessor(mockRankings, mockDivisionMapping, true)
    );

    expect(result.current.processedTeams).toHaveLength(2);
    expect(result.current.processingError).toBeNull();
    
    const firstTeam = result.current.processedTeams[0];
    expect(firstTeam.id).toBe('team-1');
    expect(firstTeam.name).toBe('Team Alpha');
    expect(firstTeam.seed).toBe(1);
    expect(firstTeam.division_id).toBe('div-1');
    expect(firstTeam.powerScore).toBe(1200);
  });

  it('should return empty array when data is not ready', () => {
    const { result } = renderHook(() => 
      useTeamDataProcessor(mockRankings, mockDivisionMapping, false)
    );

    expect(result.current.processedTeams).toHaveLength(0);
    expect(result.current.processingError).toBeNull();
  });

  it('should return empty array when rankings is null', () => {
    const { result } = renderHook(() => 
      useTeamDataProcessor(null, mockDivisionMapping, true)
    );

    expect(result.current.processedTeams).toHaveLength(0);
    expect(result.current.processingError).toBe('Failed to load team rankings');
  });

  it('should assign correct seeds based on ranking order', () => {
    const { result } = renderHook(() => 
      useTeamDataProcessor(mockRankings, mockDivisionMapping, true)
    );

    expect(result.current.processedTeams[0].seed).toBe(1);
    expect(result.current.processedTeams[1].seed).toBe(2);
  });

  it('should map division names to proper UUIDs', () => {
    const { result } = renderHook(() => 
      useTeamDataProcessor(mockRankings, mockDivisionMapping, true)
    );

    expect(result.current.processedTeams[0].division_id).toBe('div-1');
    expect(result.current.processedTeams[1].division_id).toBe('div-2');
  });

  it('should handle teams without division names', () => {
    const rankingsWithoutDivision: Ranking[] = [{
      ...mockRankings[0],
      divisionName: undefined
    }];

    const { result } = renderHook(() => 
      useTeamDataProcessor(rankingsWithoutDivision, mockDivisionMapping, true)
    );

    expect(result.current.processedTeams[0].division_id).toBeNull();
    expect(result.current.processedTeams[0].divisionName).toBeUndefined();
  });

  it('should handle empty rankings array', () => {
    const { result } = renderHook(() => 
      useTeamDataProcessor([], mockDivisionMapping, true)
    );

    expect(result.current.processedTeams).toHaveLength(0);
    expect(result.current.processingError).toBe('No teams found in rankings');
  });

  it('should memoize processed teams correctly', () => {
    const { result, rerender } = renderHook(
      ({ rankings, mapping, isReady }) => useTeamDataProcessor(rankings, mapping, isReady),
      { initialProps: { rankings: mockRankings, mapping: mockDivisionMapping, isReady: true } }
    );

    const firstTeams = result.current.processedTeams;
    
    // Rerender with same props
    rerender({ rankings: mockRankings, mapping: mockDivisionMapping, isReady: true });
    
    expect(result.current.processedTeams).toBe(firstTeams);
  });
});
