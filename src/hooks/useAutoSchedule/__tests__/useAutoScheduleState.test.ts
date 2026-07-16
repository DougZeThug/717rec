import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoScheduleState } from '../useAutoScheduleState';

const mockLoadAutoScheduleState = vi.fn();
const mockSaveAutoScheduleState = vi.fn();
const mockDeserializeMatches = vi.fn((matches) => matches);

vi.mock('../storage', () => ({
  loadAutoScheduleState: () => mockLoadAutoScheduleState(),
  saveAutoScheduleState: (state: unknown) => mockSaveAutoScheduleState(state),
  deserializeMatches: (matches: unknown) => mockDeserializeMatches(matches),
}));

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useAutoScheduleState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('loads persisted values and saves updates after debounce', async () => {
    mockLoadAutoScheduleState.mockReturnValue({
      selectedDate: '2026-04-01T00:00:00.000Z',
      activeTab: 'schedule',
      avoidRematches: false,
      prioritizeQuality: true,
      dualMatchMode: false,
      generatedMatches: [],
      editableMatches: [],
      matchQualityMetrics: { totalMatches: 4 },
      isEditMode: true,
    });

    const { result } = renderHook(() => useAutoScheduleState(), { wrapper: createWrapper() });

    expect(result.current.activeTab).toBe('schedule');
    expect(result.current.avoidRematches).toBe(false);
    expect(result.current.isEditMode).toBe(true);

    await act(async () => {
      result.current.setActiveTab('review');
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    await waitFor(() =>
      expect(mockSaveAutoScheduleState).toHaveBeenCalledWith(
        expect.objectContaining({ activeTab: 'review', avoidRematches: false })
      )
    );
  });

  it('uses defaults and surfaces save payload from state changes', async () => {
    mockLoadAutoScheduleState.mockReturnValue(null);

    const { result } = renderHook(() => useAutoScheduleState(), { wrapper: createWrapper() });

    expect(result.current.activeTab).toBe('teams');
    expect(result.current.prioritizeQuality).toBe(false);

    await act(async () => {
      result.current.setPrioritizeQuality(true);
      result.current.setDualMatchMode(false);
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    await waitFor(() =>
      expect(mockSaveAutoScheduleState).toHaveBeenCalledWith(
        expect.objectContaining({ prioritizeQuality: true, dualMatchMode: false })
      )
    );
  });

  it('failure mode: falls back safely when persisted fields are missing', async () => {
    mockLoadAutoScheduleState.mockReturnValue({ selectedDate: null, activeTab: undefined });

    const { result } = renderHook(() => useAutoScheduleState(), { wrapper: createWrapper() });

    expect(result.current.selectedDate).toBeInstanceOf(Date);
    expect(result.current.activeTab).toBe('teams');

    await act(async () => {
      result.current.setIsEditMode(true);
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    await waitFor(() =>
      expect(mockSaveAutoScheduleState).toHaveBeenCalledWith(
        expect.objectContaining({ isEditMode: true })
      )
    );
  });
});
