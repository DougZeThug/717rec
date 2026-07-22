import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchMatches = vi.fn();
const mockRefetchBrackets = vi.fn();
const mockToast = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/matches/useMatchSubmission', () => ({
  useMatchSubmission: () => ({ handleSubmitScore: vi.fn() }),
}));

vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: vi.fn(),
}));

vi.mock('@/components/admin/mass-score-entry/hooks/fetching/useMatchesFetching', () => ({
  useMatchesFetching: () => ({
    fetchMatches: mockFetchMatches,
    fetchMatchesOrThrow: mockFetchMatches,
  }),
}));

vi.mock('@/components/admin/mass-score-entry/hooks/useMatchEventListeners', () => ({
  useMatchEventListeners: vi.fn(),
}));

// The bracket fetch failed: no options, but an error + refetch are exposed.
vi.mock('@/hooks/brackets/useBracketsQuery', () => ({
  useBracketsQuery: () => ({
    brackets: [],
    error: new Error('brackets down'),
    isLoading: false,
    refetch: mockRefetchBrackets,
  }),
}));

vi.mock('@/utils/logger', () => ({
  scoreLog: vi.fn(),
  errorLog: vi.fn(),
  filterLog: vi.fn(),
  debugLog: vi.fn(),
  validationLog: vi.fn(),
}));

vi.mock('@/components/admin/AdminSectionWrapper', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/admin/mass-score-entry/components/ScoreEntryToolbar', () => ({
  default: () => <div data-testid="toolbar" />,
}));

vi.mock('@/components/admin/mass-score-entry/MatchesTable', () => ({
  default: () => <div data-testid="matches-table" />,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  m: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

import MassScoreEntryTool from '../MassScoreEntryTool';

describe('MassScoreEntryTool - bracket load failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchMatches.mockResolvedValue([]);
  });

  it('shows a retryable error instead of a silently empty bracket dropdown', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MassScoreEntryTool />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Couldn't load brackets — retry.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(mockRefetchBrackets).toHaveBeenCalledTimes(1);
  });
});
