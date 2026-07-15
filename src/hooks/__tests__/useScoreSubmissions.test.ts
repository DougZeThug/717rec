import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useScoreSubmissions } from '../useScoreSubmissions';

const mockToast = vi.fn();

vi.mock('@/services/matches/MatchReadService', () => ({
  fetchScoreSubmissions: vi.fn(),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  updateScoreSubmissionStatus: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { fetchScoreSubmissions } from '@/services/matches/MatchReadService';
import { updateScoreSubmissionStatus } from '@/services/matches/MatchWriteService';

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
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useScoreSubmissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with isLoading=true and fetches on mount', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubmissions);
    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.submissions).toEqual(mockSubmissions);
  });

  it('shows error toast when fetch fails', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    expect(result.current.submissions).toEqual([]);
  });

  it('handleApproveSubmission calls service with approved and removes from list', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockSubmissions)
      .mockResolvedValue([mockSubmissions[1]]);
    (updateScoreSubmissionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleApproveSubmission('sub-1');
    });

    expect(updateScoreSubmissionStatus).toHaveBeenCalledWith('sub-1', 'approved');
    await waitFor(() => expect(result.current.submissions).toHaveLength(1));
    expect(result.current.submissions[0].id).toBe('sub-2');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Success' }));
  });

  it('handleRejectSubmission calls service with rejected and removes from list', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockSubmissions)
      .mockResolvedValue([mockSubmissions[0]]);
    (updateScoreSubmissionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleRejectSubmission('sub-2');
    });

    expect(updateScoreSubmissionStatus).toHaveBeenCalledWith('sub-2', 'rejected');
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
      await result.current.handleApproveSubmission('sub-1');
    });

    expect(result.current.submissions).toHaveLength(2);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
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
