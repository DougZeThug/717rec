
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useBracketFormData } from '../useBracketFormData';
import { Team, Division } from '@/types';

// Mock the teams hook
vi.mock('@/hooks/useTeams', () => ({
  useTeams: vi.fn()
}));

import { useTeams } from '@/hooks/useTeams';

// Create properly typed mock
const mockUseTeams = vi.mocked(useTeams);

describe('useBracketFormData', () => {
  let queryClient: QueryClient;

  const mockDivisions: Division[] = [
    { id: 'div1', name: 'Division A' },
    { id: 'div2', name: 'Division B' }
  ];

  const mockTeams: Team[] = [
    { id: 'team1', name: 'Team 1', division_id: 'div1' },
    { id: 'team2', name: 'Team 2', division_id: 'div1' },
    { id: 'team3', name: 'Team 3', division_id: 'div2' }
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  it('should return provided teams when teamsProp is given', async () => {
    mockUseTeams.mockReturnValue({
      teams: [],
      isLoading: false,
      fetchTeams: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn()
    });

    const { result } = renderHook(
      () => useBracketFormData(mockDivisions, mockTeams),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.teams).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'team1',
            name: 'Team 1',
            division_id: 'div1'
          }),
          expect.objectContaining({
            id: 'team2',
            name: 'Team 2',
            division_id: 'div1'
          }),
          expect.objectContaining({
            id: 'team3',
            name: 'Team 3',
            division_id: 'div2'
          })
        ])
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isDataReady).toBe(true);
    });
  });

  it('should fetch teams when teamsProp is not provided', async () => {
    mockUseTeams.mockReturnValue({
      teams: mockTeams,
      isLoading: false,
      fetchTeams: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn()
    });

    const { result } = renderHook(
      () => useBracketFormData(mockDivisions, undefined),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.teams).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'team1',
            name: 'Team 1'
          }),
          expect.objectContaining({
            id: 'team2',
            name: 'Team 2'
          }),
          expect.objectContaining({
            id: 'team3',
            name: 'Team 3'
          })
        ])
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isDataReady).toBe(true);
    });
  });

  it('should handle loading state', async () => {
    mockUseTeams.mockReturnValue({
      teams: [],
      isLoading: true,
      fetchTeams: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn()
    });

    const { result } = renderHook(
      () => useBracketFormData(mockDivisions, undefined),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isDataReady).toBe(false);
  });

  it('should handle error state when no teams are fetched', async () => {
    mockUseTeams.mockReturnValue({
      teams: [],
      isLoading: false,
      fetchTeams: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn()
    });

    const { result } = renderHook(
      () => useBracketFormData(mockDivisions, undefined),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.errorMessage).toBe('Failed to load teams. Please refresh and try again.');
      expect(result.current.isDataReady).toBe(false);
    });
  });

  it('should return empty teams array when no teams are available but maintain ready state', async () => {
    mockUseTeams.mockReturnValue({
      teams: [],
      isLoading: false,
      fetchTeams: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn()
    });

    const { result } = renderHook(
      () => useBracketFormData(mockDivisions, []), // Provide empty array as teams prop
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.teams).toEqual([]);
      expect(result.current.isDataReady).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should handle invalid team data gracefully', async () => {
    const invalidTeams = [
      { id: 'team1', name: 'Team 1', division_id: 'div1' },
      null, // Invalid team
      { name: 'Team without ID' }, // Missing required fields
      { id: 'team3', name: 'Team 3', division_id: 'div2' }
    ] as any[];

    const { result } = renderHook(
      () => useBracketFormData(mockDivisions, invalidTeams),
      { wrapper }
    );

    await waitFor(() => {
      // Should filter out invalid teams and process valid ones
      expect(result.current.teams).toHaveLength(2);
      expect(result.current.teams[0]).toEqual(
        expect.objectContaining({
          id: 'team1',
          name: 'Team 1'
        })
      );
      expect(result.current.teams[1]).toEqual(
        expect.objectContaining({
          id: 'team3',
          name: 'Team 3'
        })
      );
      expect(result.current.isDataReady).toBe(true);
    });
  });
});
