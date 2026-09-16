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

vi.mock('@/hooks/matches/useMatchSubmission', () => ({
  useMatchSubmission: () => ({ handleSubmitScore: vi.fn().mockResolvedValue(true) }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { fetchScoreSubmissions } from '@/services/matches/MatchReadService';
import { updateScoreSubmissionStatus } from '@/services/matches/MatchWriteService';

const buildSubmission = (id: string, createdAt: string) => ({
  id,
  match_id: `match-${id}`,
  submitter_name: 'Alice',
  submitter_team: 'Alpha',
  message: 'Score: 2-1',
  status: 'pending',
  created_at: createdAt,
  reviewed_by: null,
  reviewed_at: null,
  match: {
    id: `match-${id}`,
    date: '2026-04-01T00:00:00Z',
    location: 'Lane 1',
    team1_id: 'team-1',
    team2_id: 'team-2',
    team1: { id: 'team-1', name: 'Alpha' },
    team2: { id: 'team-2', name: 'Beta' },
  },
});

// Newest first, the order fetchScoreSubmissions returns (created_at desc).
const submissions = [
  buildSubmission('sub-a', '2026-04-01T12:00:00Z'),
  buildSubmission('sub-b', '2026-04-01T11:00:00Z'),
  buildSubmission('sub-c', '2026-04-01T10:00:00Z'),
  buildSubmission('sub-d', '2026-04-01T09:00:00Z'),
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

/**
 * Two moderations in flight at once, both failing. Restoring by the position a
 * row held when it left is wrong as soon as a second removal shifts everything
 * after it, so this is the case that separates a date-ordered restore from an
 * index-based one.
 */
describe('useScoreSubmissions — overlapping failed moderations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockToast.mockReset();
  });

  it('puts a failed row back in newest-first order while another is still in flight', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>).mockResolvedValue(submissions);

    // Reject B, then A. Hold both so we control which one fails first.
    let failB!: (err: Error) => void;
    let failA!: (err: Error) => void;
    (updateScoreSubmissionStatus as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(() => new Promise((_res, rej) => (failB = rej)))
      .mockImplementationOnce(() => new Promise((_res, rej) => (failA = rej)));

    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.submissions.map((s) => s.id)).toEqual([
      'sub-a',
      'sub-b',
      'sub-c',
      'sub-d',
    ]);

    // B leaves from position 1 of the full list.
    act(() => result.current.handleRejectSubmission('sub-b'));
    await waitFor(() =>
      expect(result.current.submissions.map((s) => s.id)).toEqual(['sub-a', 'sub-c', 'sub-d'])
    );

    // A leaves too. Every row behind it shifts, so B's remembered position no
    // longer points at the gap it left.
    act(() => result.current.handleRejectSubmission('sub-a'));
    await waitFor(() =>
      expect(result.current.submissions.map((s) => s.id)).toEqual(['sub-c', 'sub-d'])
    );

    // B fails while A is still in flight. This is the window the admin sees:
    // the hook suppresses the corrective refetch until the last moderation
    // settles, so whatever order lands here is what is on screen.
    await act(async () => {
      failB(new Error('network'));
      await Promise.resolve();
    });

    // Wait for B to come back, but assert the order while A is still out —
    // that is the state the admin is looking at and acting on.
    await waitFor(() => expect(result.current.submissions).toHaveLength(3));

    // B was created 11:00, so it belongs ahead of C (10:00) and D (09:00).
    // Restoring at its remembered index 1 put it between them instead.
    expect(result.current.submissions.map((s) => s.id)).toEqual(['sub-b', 'sub-c', 'sub-d']);

    // Once A settles too, the refetch brings the server's order back.
    await act(async () => {
      failA(new Error('network'));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(result.current.submissions.map((s) => s.id)).toEqual([
        'sub-a',
        'sub-b',
        'sub-c',
        'sub-d',
      ])
    );
  });

  it('restores a single failed row to its old position', async () => {
    (fetchScoreSubmissions as ReturnType<typeof vi.fn>).mockResolvedValue(submissions);
    (updateScoreSubmissionStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network')
    );

    const { result } = renderHook(() => useScoreSubmissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handleRejectSubmission('sub-b');
    });

    await waitFor(() =>
      expect(result.current.submissions.map((s) => s.id)).toEqual([
        'sub-a',
        'sub-b',
        'sub-c',
        'sub-d',
      ])
    );
  });
});
