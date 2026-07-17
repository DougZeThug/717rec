import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '@/test/a11y';

const mockHandleSubmitAll = vi.fn();
const mockHandleMassScoreChange = vi.fn();
const mockHandleGameWinsChange = vi.fn();
const mockHandleMarkCompleted = vi.fn();

const defaultMassScoreState = {
  matches: [] as Array<{
    id: string;
    team1Id: string;
    team2Id: string;
    team1?: { id: string; name: string };
    team2?: { id: string; name: string };
    team1Score?: number | null;
    team2Score?: number | null;
    team1_game_wins?: number | null;
    team2_game_wins?: number | null;
    date?: string;
    iscompleted?: boolean;
    isEdited?: boolean;
    isValid?: boolean;
    isSubmitting?: boolean;
    submitError?: boolean;
  }>,
  loading: false,
  submitting: false,
  failedMatches: [] as string[],
  errorMessages: {} as Record<string, string>,
  brackets: [] as Array<{ id: string; title: string }>,
  filters: { date: undefined as Date | undefined, bracketId: undefined as string | undefined },
  handleScoreChange: mockHandleMassScoreChange,
  handleGameWinsChange: mockHandleGameWinsChange,
  handleMarkCompleted: mockHandleMarkCompleted,
  handleSubmitAll: mockHandleSubmitAll,
  clearErrors: vi.fn(),
  setFilterDate: vi.fn(),
  setBracketFilter: vi.fn(),
  clearFilters: vi.fn(),
  removeMatch: vi.fn(),
};

let massScoreState = { ...defaultMassScoreState };

vi.mock('@/components/admin/mass-score-entry/hooks/useScoreEntryData', () => ({
  useScoreEntryData: () => massScoreState,
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ theme: 'light' }),
  default: () => ({ isWinterTheme: false }),
}));
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({
      children,
      whileTap: _whileTap,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { whileTap?: unknown }) => (
      <button {...props}>{children}</button>
    ),
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    ),
  },
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));
vi.mock('@/hooks/matches/updates/utils/queryInvalidation', () => ({
  invalidateAllDataQueries: vi.fn(),
}));

import AdminMassScoreEntryTool from '../MassScoreEntryTool';

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const makeMassMatch = (overrides = {}) => ({
  id: 'match-1',
  team1Id: 'team-1',
  team2Id: 'team-2',
  team1: { id: 'team-1', name: 'Falcons' },
  team2: { id: 'team-2', name: 'Sharks' },
  team1Score: 0,
  team2Score: 0,
  team1_game_wins: 0,
  team2_game_wins: 0,
  date: '2026-01-10T18:00:00.000Z',
  iscompleted: false,
  isEdited: false,
  isValid: false,
  ...overrides,
});

describe('admin score tooling component states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    massScoreState = { ...defaultMassScoreState };
  });

  it('has no WCAG 2 A/AA axe violations in the mass score entry admin section', async () => {
    massScoreState = {
      ...defaultMassScoreState,
      matches: [makeMassMatch()],
      loading: false,
    };

    const { container } = renderWithClient(<AdminMassScoreEntryTool />);

    await expectNoAxeViolations(container);
  });

  it('shows loading and empty states in the mass score table', () => {
    massScoreState = { ...defaultMassScoreState, loading: true };
    const { rerender } = renderWithClient(<AdminMassScoreEntryTool />);
    expect(screen.getByRole('button', { name: /filter by date/i })).toBeInTheDocument();
    expect(screen.queryByText(/no matches found/i)).not.toBeInTheDocument();
    massScoreState = { ...defaultMassScoreState, loading: false, matches: [] };
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <AdminMassScoreEntryTool />
      </QueryClientProvider>
    );
    expect(screen.getByText(/no matches found/i)).toBeInTheDocument();
  });

  it('accepts a valid mass score edit and enables submit', async () => {
    massScoreState = {
      ...defaultMassScoreState,
      matches: [makeMassMatch({ isEdited: true, isValid: true, iscompleted: true })],
    };
    renderWithClient(<AdminMassScoreEntryTool />);
    await userEvent.click(screen.getByRole('button', { name: /2–0/iu }));
    expect(mockHandleMassScoreChange).toHaveBeenCalledWith(0, 1, 0);
    expect(mockHandleGameWinsChange).toHaveBeenCalledWith(0, 2, 0);
    expect(mockHandleMarkCompleted).toHaveBeenCalledWith(0, true);
    expect(screen.getByRole('button', { name: /submit \(1\) changes/i })).toBeEnabled();
  });

  it('keeps submit disabled for an invalid mass score', () => {
    massScoreState = {
      ...defaultMassScoreState,
      matches: [makeMassMatch({ isEdited: true, isValid: false, iscompleted: true })],
    };
    renderWithClient(<AdminMassScoreEntryTool />);
    expect(screen.getByRole('button', { name: /submit all changes/i })).toBeDisabled();
  });

  it('shows submit success and failure states for the admin mass score wrapper', async () => {
    massScoreState = {
      ...defaultMassScoreState,
      matches: [makeMassMatch({ isEdited: true, isValid: true, iscompleted: true })],
    };
    const { rerender } = renderWithClient(<AdminMassScoreEntryTool />);
    await userEvent.click(screen.getByRole('button', { name: /submit \(1\) changes/i }));
    expect(mockHandleSubmitAll).toHaveBeenCalledTimes(1);
    massScoreState = {
      ...defaultMassScoreState,
      matches: [
        makeMassMatch({ isEdited: true, isValid: true, iscompleted: true, submitError: true }),
      ],
      failedMatches: ['match-1'],
      errorMessages: { 'match-1': 'Database write failed' },
    };
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <AdminMassScoreEntryTool />
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText(/1 match failed to update/i)).toBeInTheDocument());
    expect(screen.getByText(/submission failed - please retry/i)).toBeInTheDocument();
  });
});
