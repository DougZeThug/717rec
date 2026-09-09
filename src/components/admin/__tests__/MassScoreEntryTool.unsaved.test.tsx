import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MatchWithTeams } from '../mass-score-entry/types';

const mockHandleSubmitScore = vi.fn();
const mockFetchMatches = vi.fn();
const mockToast = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/matches/useMatchSubmission', () => ({
  useMatchSubmission: () => ({ handleSubmitScore: mockHandleSubmitScore }),
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

vi.mock('@/hooks/brackets/useBracketsQuery', () => ({
  useBracketsQuery: () => ({ brackets: [], error: null, isLoading: false, refetch: vi.fn() }),
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

type MockMatchesTableProps = {
  onScoreChange: (index: number, team1Score: number, team2Score: number) => void;
  onGameWinsChange: (index: number, team1GameWins: number, team2GameWins: number) => void;
  onMarkCompleted: (index: number, checked: boolean) => void;
};

vi.mock('@/components/admin/mass-score-entry/MatchesTable', () => ({
  default: ({ onScoreChange, onGameWinsChange, onMarkCompleted }: MockMatchesTableProps) => (
    <div>
      <button onClick={() => onScoreChange(0, 1, 0)}>score</button>
      <button onClick={() => onGameWinsChange(0, 2, 0)}>wins</button>
      <button onClick={() => onMarkCompleted(0, true)}>complete</button>
    </div>
  ),
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ theme: 'light' }),
  default: () => ({ isWinterTheme: false }),
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

import { clearUnsavedWork, findUnsavedWork } from '@/utils/unsavedChanges';

import MassScoreEntryTool from '../MassScoreEntryTool';

const makeMatch = (overrides: Partial<MatchWithTeams> = {}): MatchWithTeams => ({
  id: 'm1',
  team1Id: 't1',
  team2Id: 't2',
  team1Score: 0,
  team2Score: 0,
  team1_game_wins: 0,
  team2_game_wins: 0,
  isEdited: false,
  isValid: true,
  iscompleted: false,
  date: '2026-03-05T18:00:00.000Z',
  ...overrides,
});

describe('MassScoreEntryTool unsaved scores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearUnsavedWork();
    mockHandleSubmitScore.mockResolvedValue(true);
    mockFetchMatches.mockResolvedValue([makeMatch()]);
  });

  afterEach(() => clearUnsavedWork());

  const renderTool = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MassScoreEntryTool />
      </QueryClientProvider>
    );
  };

  it('reports nothing unsaved before a score is typed', async () => {
    renderTool();

    await screen.findByText('score');
    expect(findUnsavedWork()).toBeNull();
  });

  // UX audit A-07: switching section threw typed scores away with no warning.
  it('reports unsaved work once a score is entered', async () => {
    renderTool();

    await userEvent.click(await screen.findByText('score'));

    await waitFor(() => expect(findUnsavedWork()).not.toBeNull());
    expect(findUnsavedWork()?.message).toMatch(/not submitted/i);
  });

  it('stops reporting once the scores are submitted', async () => {
    renderTool();

    await userEvent.click(await screen.findByText('score'));
    await userEvent.click(await screen.findByText('wins'));
    await userEvent.click(await screen.findByText('complete'));
    await waitFor(() => expect(findUnsavedWork()).not.toBeNull());

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(findUnsavedWork()).toBeNull());
  });
});
