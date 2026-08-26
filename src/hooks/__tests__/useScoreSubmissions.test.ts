import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useScoreSubmissions } from '../useScoreSubmissions';

const mockToast = vi.fn();
const mockHandleSubmitScore = vi.fn();

vi.mock('@/services/matches/MatchReadService', () => ({
  fetchScoreSubmissions: vi.fn(),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  updateScoreSubmissionStatus: vi.fn(),
}));

vi.mock('@/hooks/matches/useMatchSubmission', () => ({
  useMatchSubmission: () => ({ handleSubmitScore: mockHandleSubmitScore }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { fetchScoreSubmissions } from '@/services/matches/MatchReadService';
import { updateScoreSubmissionStatus } from '@/services/matches/MatchWriteService';

const buildMatch = (id: string) => ({
  id,
  date: '2026-04-01T00:00:00Z',
  location: 'Lane 1',
  team1_id: 'team-1',
  team2_id: 'team-2',
  team1: { id: 'team-1', name: 'Alpha' },
  team2: { id: 'team-2', name: 'Beta' },
});

const mockSubmissions = [
  {
    id: 'sub-1',
    match_id: 'match-1',
    submitter_name: 'Alice',
    submitter_team: 'Alpha',
    message: 'Score: 2-1',
    status: 'pending',
    created_at: '2026-04-01T10:00:00Z',
    reviewed_by: null,
    reviewed_at: null,
    match: buildMatch('match-1'),
  },
  {
    id: 'sub-2',
    match_id: 'match-2',
    submitter_name: 'Bob',
    submitter_team: 'Beta',
    message: 'Score: 1-2',
    status: 'pending',
    created_at: '2026-04-01T11:00:00Z',
    reviewed_by: null,
    reviewed_at: null,
    match: buildMatch('match-2'),
  },
];

const approveInput = {
  submissionId: 'sub-1',
  matchId: 'match-1',
  winner: 1 as const,
  team1GameWins: 2,
  team2GameWins: 1,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useScoreSubmissions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockHandleSubmitScore.mockResolvedValue(true);
  });

  it('starts with isLoading=true and fetches on mount', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmissions);
    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.submissions).toEqual(mockSubmissions);
  });

  it('shows error toast when fetch fails', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    expect(result.current.submissions).toEqual([]);
  });

  it('records the match result before approving the submission', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockSubmissions)
      .mockResolvedValue([mockSubmissions[1]]);
    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.handleApproveSubmission(approveInput);
    });

    // Match scores are binary: 1 for the winning side, 0 for the losing side.
    await waitFor(() =>
      expect(mockHandleSubmitScore).toHaveBeenCalledWith(
        {
          matchId: 'match-1',
          team1Score: 1,
          team2Score: 0,
          team1GameWins: 2,
          team2GameWins: 1,
        },
        { suppressToast: true }
      )
    );
    await waitFor(() =>
      expect(updateScoreSubmissionStatus).toHaveBeenCalledWith('sub-1', 'approved')
    );
    expect(mockHandleSubmitScore.mock.invocationCallOrder[0]).toBeLessThan(
      (updateScoreSubmissionStatus as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]
    );
    await waitFor(() => expect(result.current.submissions).toHaveLength(1));
    expect(result.current.submissions[0].id).toBe('sub-2');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Result Recorded' }));
  });

  it('sends the winning side as team 2 when team 2 won', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmissions);
    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.handleApproveSubmission({ ...approveInput, winner: 2, team2GameWins: 3 });
    });

    await waitFor(() =>
      expect(mockHandleSubmitScore).toHaveBeenCalledWith(
        expect.objectContaining({ team1Score: 0, team2Score: 1, team2GameWins: 3 }),
        { suppressToast: true }
      )
    );
  });

  it('leaves the submission pending when the result cannot be recorded', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmissions);
    mockHandleSubmitScore.mockResolvedValue(false);
    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockToast.mockClear();

    await act(async () => {
      result.current.handleApproveSubmission(approveInput);
    });

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
    );
    // The submission must NOT be marked approved when the match was not written.
    expect(updateScoreSubmissionStatus).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.submissions).toHaveLength(2));
  });

  it('handleRejectSubmission calls service with rejected and removes from list', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockSubmissions)
      .mockResolvedValue([mockSubmissions[0]]);
    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.handleRejectSubmission('sub-2');
    });

    await waitFor(() =>
      expect(updateScoreSubmissionStatus).toHaveBeenCalledWith('sub-2', 'rejected')
    );
    // Rejecting must never touch the match itself.
    expect(mockHandleSubmitScore).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.submissions).toHaveLength(1));
    expect(result.current.submissions[0].id).toBe('sub-1');
  });

  it('shows error toast and keeps list unchanged when approve fails', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmissions);
    (updateScoreSubmissionStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Approve failed')
    );
    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockToast.mockClear();

    await act(async () => {
      result.current.handleApproveSubmission(approveInput);
    });

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
    );
    await waitFor(() => expect(result.current.submissions).toHaveLength(2));
  });

  it('refetch re-calls the service', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmissions);
    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callCount = (fetchScoreSubmissions as ReturnType<typeof vi.fn>).mock.calls.length;

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetchScoreSubmissions).toHaveBeenCalledTimes(callCount + 1);
  });

  it('refetches on remount even while the cached inbox is fresh', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 5 * 60 * 1000 },
        mutations: { retry: false },
      },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmissions);

    const firstRender = renderHook(() => useScoreSubmissions(), { wrapper });
    await waitFor(() => expect(firstRender.result.current.isLoading).toBe(false));
    firstRender.unmount();

    renderHook(() => useScoreSubmissions(), { wrapper });

    await waitFor(() => expect(fetchScoreSubmissions).toHaveBeenCalledTimes(2));
  });
});
