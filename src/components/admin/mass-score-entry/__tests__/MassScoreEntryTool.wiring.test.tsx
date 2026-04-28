import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MatchWithTeams } from '../types';

const mockHandleSubmitScore = vi.fn();
const mockFetchMatches = vi.fn();
const mockToast = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/matches/useMatchSubmission', () => ({
  useMatchSubmission: () => ({ handleSubmitScore: mockHandleSubmitScore }),
}));

vi.mock('@/hooks/matches/updates/utils/statReversalUtils', () => ({
  reverseTeamStats: vi.fn().mockResolvedValue(),
}));

vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: vi.fn().mockResolvedValue(),
}));

vi.mock('@/components/admin/mass-score-entry/hooks/fetching/useMatchesFetching', () => ({
  useMatchesFetching: () => ({
    fetchMatches: mockFetchMatches,
  }),
}));

vi.mock('@/components/admin/mass-score-entry/hooks/useMatchEventListeners', () => ({
  useMatchEventListeners: vi.fn(),
}));

vi.mock('@/hooks/brackets/useBracketsQuery', () => ({
  useBracketsQuery: () => ({ brackets: [] }),
}));

vi.mock('@/utils/logger', () => ({
  scoreLog: vi.fn(),
  errorLog: vi.fn(),
  filterLog: vi.fn(),
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
}));

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

describe('MassScoreEntryTool wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleSubmitScore.mockResolvedValue(true);
    mockFetchMatches.mockResolvedValue([makeMatch()]);
  });

  it('wires component -> hooks -> submission service', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MassScoreEntryTool />
      </QueryClientProvider>
    );

    await waitFor(() => expect(mockFetchMatches).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'score' }));
    await userEvent.click(screen.getByRole('button', { name: 'wins' }));
    await userEvent.click(screen.getByRole('button', { name: 'complete' }));
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockHandleSubmitScore).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: 'm1',
          team1Score: 1,
          team2Score: 0,
          team1GameWins: 2,
          team2GameWins: 0,
        })
      );
    });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: '✅ Matches Submitted' }));
  });
});
