
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
      data: [],
      isLoading: false,
      isError: false,
      error: null
    });

    const { result } = renderHook(
      () => useBracketFormData(mockDivisions, mockTeams),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.teams).toEqual(mockTeams);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isDataReady).toBe(true);
    });
  });

  it('should fetch teams when teamsProp is not provided', async () => {
    mockUseTeams.mockReturnValue({
      data: mockTeams,
      isLoading: false,
      isError: false,
      error: null
    });

    const { result } = renderHook(
      () => useBracketFormData(mockDivisions, undefined),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.teams).toEqual(mockTeams);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isDataReady).toBe(true);
    });
  });

  it('should handle loading state', async () => {
    mockUseTeams.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null
    });

    const { result } = renderHook(
      () => useBracketFormData(mockDivisions, undefined),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isDataReady).toBe(false);
  });

  it('should handle error state', async () => {
    const mockError = new Error('Failed to fetch teams');
    mockUseTeams.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: mockError
    });

    const { result } = renderHook(
      () => useBracketFormData(mockDivisions, undefined),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.errorMessage).toBe('Failed to fetch teams');
      expect(result.current.isDataReady).toBe(false);
    });
  });

  it('should return empty array when no teams are available', async () => {
    mockUseTeams.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null
    });

    const { result } = renderHook(
      () => useBracketFormData(mockDivisions, undefined),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.teams).toEqual([]);
      expect(result.current.isDataReady).toBe(true);
    });
  });
});
