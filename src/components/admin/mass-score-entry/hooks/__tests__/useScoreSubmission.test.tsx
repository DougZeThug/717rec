import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MatchWithTeams } from '../../types';

const mockToast = vi.fn();
const mockSetSubmitting = vi.fn();
const mockClearErrors = vi.fn();
const mockUpdateMatch = vi.fn();
const mockValidateMatch = vi.fn();
const mockInvalidateMatchRelatedQueries = vi.fn();

let mockFailedMatches: string[] = [];

vi.mock('../useSubmissionState', () => ({
  useSubmissionState: () => ({
    submitting: false,
    setSubmitting: mockSetSubmitting,
    failedMatches: mockFailedMatches,
    errorMessages: {},
    clearErrors: mockClearErrors,
    toast: mockToast,
  }),
}));

vi.mock('../submission/useMatchValidation', () => ({
  useMatchValidation: () => ({ validateMatch: mockValidateMatch }),
}));

vi.mock('../../services/matchUpdateService', () => ({
  useMatchUpdateService: () => ({ updateMatch: mockUpdateMatch }),
}));

vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: (...args: unknown[]) => mockInvalidateMatchRelatedQueries(...args),
}));

vi.mock('@/utils/logger', () => ({
  scoreLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { useScoreSubmission } from '../useScoreSubmission';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const makeMatch = (overrides: Partial<MatchWithTeams> = {}): MatchWithTeams => ({
  id: 'm1',
  team1Id: 't1',
  team2Id: 't2',
  team1Score: 1,
  team2Score: 0,
  team1_game_wins: 2,
  team2_game_wins: 0,
  iscompleted: true,
  isEdited: true,
  isValid: true,
  ...overrides,
});

describe('useScoreSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFailedMatches = [];
    mockValidateMatch.mockReturnValue({ isValid: true, correctedMatch: makeMatch() });
    mockUpdateMatch.mockResolvedValue(true);
    mockInvalidateMatchRelatedQueries.mockResolvedValue(undefined);
  });

  it('handles success branch and refreshes matches', async () => {
    const fetchMatches = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useScoreSubmission([makeMatch()], fetchMatches), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockUpdateMatch).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Success' }));
    expect(fetchMatches).toHaveBeenCalledTimes(1);
  });

  it('handles partial and full error branches', async () => {
    mockFailedMatches = ['m1'];
    mockUpdateMatch.mockResolvedValueOnce(true);
    const fetchMatches = vi.fn().mockResolvedValue([]);

    const { result, rerender } = renderHook(
      ({ matches }) => useScoreSubmission(matches, fetchMatches),
      {
        wrapper,
        initialProps: { matches: [makeMatch()] },
      }
    );

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Partial Success' }));

    mockUpdateMatch.mockResolvedValue(false);
    rerender({ matches: [makeMatch({ id: 'm2' })] });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error' }));
  });

  it('shows an error toast when the matches argument is missing', async () => {
    const fetchMatches = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(
      () => useScoreSubmission(undefined as unknown as MatchWithTeams[], fetchMatches),
      { wrapper }
    );

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'No match data available',
        variant: 'destructive',
      })
    );
    expect(mockUpdateMatch).not.toHaveBeenCalled();
    expect(mockSetSubmitting).not.toHaveBeenCalled();
  });

  it('shows a "No Changes" toast when no match qualifies for submission', async () => {
    const fetchMatches = vi.fn().mockResolvedValue([]);
    const matches = [
      makeMatch({ isEdited: false }),
      makeMatch({ id: 'm2', isValid: false }),
      makeMatch({ id: 'm3', iscompleted: false }),
    ];
    const { result } = renderHook(() => useScoreSubmission(matches, fetchMatches), { wrapper });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'No Changes' }));
    expect(mockUpdateMatch).not.toHaveBeenCalled();
  });

  it('logs but does not fail when the post-submit refresh rejects', async () => {
    const fetchMatches = vi.fn().mockRejectedValue(new Error('refresh failed'));
    const { result } = renderHook(() => useScoreSubmission([makeMatch()], fetchMatches), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    // Success toast still fired; the refresh failure never reached the catch branch
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Success' }));
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('refresh failed') })
    );
    expect(mockSetSubmitting).toHaveBeenLastCalledWith(false);
  });

  it('handles validation failure and thrown update error branch', async () => {
    const fetchMatches = vi.fn().mockResolvedValue([]);
    mockValidateMatch.mockReturnValueOnce({ isValid: false });

    const { result } = renderHook(() => useScoreSubmission([makeMatch()], fetchMatches), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockUpdateMatch).not.toHaveBeenCalled();

    mockValidateMatch.mockReturnValue({ isValid: true, correctedMatch: makeMatch({ id: 'm3' }) });
    mockUpdateMatch.mockRejectedValueOnce(new Error('boom'));

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: expect.stringContaining('boom'),
      })
    );
  });
});
