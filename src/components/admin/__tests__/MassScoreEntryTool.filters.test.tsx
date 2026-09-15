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

/** The date the "pick date" button below asks for. */
const OTHER_NIGHT = new Date('2026-03-12T18:00:00.000Z');

type MockToolbarProps = {
  onDateChange: (date?: Date) => void;
  onBracketChange: (bracketId?: string) => void;
  onClearFilters: () => void;
};

vi.mock('@/components/admin/mass-score-entry/components/ScoreEntryToolbar', () => ({
  default: ({ onDateChange, onBracketChange, onClearFilters }: MockToolbarProps) => (
    <div>
      <button onClick={() => onDateChange(new Date('2026-03-12T18:00:00.000Z'))}>pick date</button>
      <button onClick={() => onBracketChange('bracket-1')}>pick bracket</button>
      <button onClick={() => onClearFilters()}>clear filters</button>
    </div>
  ),
}));

type MockMatchesTableProps = {
  onScoreChange: (index: number, team1Score: number, team2Score: number) => void;
};

vi.mock('@/components/admin/mass-score-entry/MatchesTable', () => ({
  default: ({ onScoreChange }: MockMatchesTableProps) => (
    <button onClick={() => onScoreChange(0, 1, 0)}>score</button>
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

import { clearUnsavedWork } from '@/utils/unsavedChanges';

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

/** Did anything ask the server for the night the "pick date" button names? */
const askedForOtherNight = () =>
  mockFetchMatches.mock.calls.some(
    ([filters]) => filters?.date?.getTime?.() === OTHER_NIGHT.getTime()
  );

/**
 * Changing the date or bracket rebuilds the table from the new night's rows, so
 * an edited row the new night does not hold is dropped and cannot be recovered.
 * The tool asks first. See UX audit A-07 and the sibling hook test
 * `useScoreEntryData.test.ts` → "drops an unsaved edit when the new filter
 * excludes its row".
 */
describe('MassScoreEntryTool filter changes', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    clearUnsavedWork();
    mockHandleSubmitScore.mockResolvedValue(true);
    mockFetchMatches.mockResolvedValue([makeMatch()]);
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    clearUnsavedWork();
  });

  const renderTool = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MassScoreEntryTool />
      </QueryClientProvider>
    );
  };

  const typeAScore = async () => {
    await userEvent.click(await screen.findByText('score'));
  };

  it('changes the date without asking while nothing is typed', async () => {
    renderTool();
    await screen.findByText('score');

    await userEvent.click(screen.getByText('pick date'));

    expect(confirmSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(askedForOtherNight()).toBe(true));
  });

  it('asks before a date change throws typed scores away', async () => {
    renderTool();
    await typeAScore();

    await userEvent.click(screen.getByText('pick date'));

    expect(confirmSpy).toHaveBeenCalledWith(
      'You have scores that are not submitted. Leave and lose them?'
    );
  });

  it('keeps the typed scores and the night when the admin says no', async () => {
    confirmSpy.mockReturnValue(false);
    renderTool();
    await typeAScore();

    await userEvent.click(screen.getByText('pick date'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(askedForOtherNight()).toBe(false);
    // Still on screen, still edited.
    expect(await screen.findByText('score')).toBeInTheDocument();
  });

  it('asks before a bracket change throws typed scores away, and obeys no', async () => {
    confirmSpy.mockReturnValue(false);
    renderTool();
    await typeAScore();

    await userEvent.click(screen.getByText('pick bracket'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(
      mockFetchMatches.mock.calls.some(([filters]) => filters?.bracketId === 'bracket-1')
    ).toBe(false);
  });

  it('never asks when the filters are cleared, because that widens the fetch', async () => {
    renderTool();
    await typeAScore();

    await userEvent.click(screen.getByText('clear filters'));

    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
