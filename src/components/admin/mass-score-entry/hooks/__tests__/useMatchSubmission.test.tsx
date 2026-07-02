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

vi.mock('@/utils/logger', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/utils/logger');
  return Object.fromEntries(Object.keys(actual).map((name) => [name, vi.fn()]));
});

// This file exports a legacy variant of useScoreSubmission
import { useScoreSubmission } from '../useMatchSubmission';

const createClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const createWrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
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

describe('useScoreSubmission (useMatchSubmission variant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFailedMatches = [];
    mockValidateMatch.mockReturnValue({ isValid: true, correctedMatch: makeMatch() });
    mockUpdateMatch.mockResolvedValue(true);
  });

  it('shows an error toast when the matches argument is missing', async () => {
    const fetchMatches = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(
      () => useScoreSubmission(undefined as unknown as MatchWithTeams[], fetchMatches),
      { wrapper: createWrapper(createClient()) }
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

  it('shows a "No Changes" toast when nothing qualifies for submission', async () => {
    const fetchMatches = vi.fn().mockResolvedValue([]);
    const matches = [
      makeMatch({ isEdited: false }),
      makeMatch({ id: 'm2', isValid: false }),
      makeMatch({ id: 'm3', iscompleted: false }),
    ];
    const { result } = renderHook(() => useScoreSubmission(matches, fetchMatches), {
      wrapper: createWrapper(createClient()),
    });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'No Changes' }));
    expect(mockUpdateMatch).not.toHaveBeenCalled();
  });

  it('submits qualifying matches, invalidates caches, refreshes, and toasts success', async () => {
    const client = createClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const fetchMatches = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() => useScoreSubmission([makeMatch()], fetchMatches), {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockSetSubmitting).toHaveBeenNthCalledWith(1, true);
    expect(mockClearErrors).toHaveBeenCalledTimes(1);
    expect(mockUpdateMatch).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Success',
        description: expect.stringContaining('Updated 1 match results'),
      })
    );
    // All six data domains are invalidated
    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey?.[0]);
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining(['matches', 'teams', 'rankings', 'teamStats', 'team', 'team-matches'])
    );
    expect(fetchMatches).toHaveBeenCalledTimes(1);
    expect(mockSetSubmitting).toHaveBeenLastCalledWith(false);
  });

  it('skips matches that fail revalidation and does not refetch when nothing succeeded', async () => {
    mockValidateMatch.mockReturnValue({ isValid: false });
    const fetchMatches = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() => useScoreSubmission([makeMatch()], fetchMatches), {
      wrapper: createWrapper(createClient()),
    });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockUpdateMatch).not.toHaveBeenCalled();
    expect(fetchMatches).not.toHaveBeenCalled();
  });

  it('shows partial success when some matches failed but others succeeded', async () => {
    mockFailedMatches = ['m2'];
    const fetchMatches = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() => useScoreSubmission([makeMatch()], fetchMatches), {
      wrapper: createWrapper(createClient()),
    });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Partial Success' }));
  });

  it('shows a destructive error toast when every match failed', async () => {
    mockFailedMatches = ['m1'];
    mockUpdateMatch.mockResolvedValue(false);
    const fetchMatches = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() => useScoreSubmission([makeMatch()], fetchMatches), {
      wrapper: createWrapper(createClient()),
    });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Error', variant: 'destructive' })
    );
    expect(fetchMatches).not.toHaveBeenCalled();
  });

  it('surfaces a thrown update error and always resets submitting', async () => {
    mockUpdateMatch.mockRejectedValue(new Error('boom'));
    const fetchMatches = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() => useScoreSubmission([makeMatch()], fetchMatches), {
      wrapper: createWrapper(createClient()),
    });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: expect.stringContaining('boom'),
        variant: 'destructive',
      })
    );
    expect(mockSetSubmitting).toHaveBeenLastCalledWith(false);
  });

  it('logs but does not fail when the post-submit refresh rejects', async () => {
    const fetchMatches = vi.fn().mockRejectedValue(new Error('refresh failed'));

    const { result } = renderHook(() => useScoreSubmission([makeMatch()], fetchMatches), {
      wrapper: createWrapper(createClient()),
    });

    await act(async () => {
      await result.current.handleSubmitAll();
    });

    // Success toast still fired; the refresh failure did not trigger the catch branch
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Success' }));
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('refresh failed') })
    );
    expect(mockSetSubmitting).toHaveBeenLastCalledWith(false);
  });
});
