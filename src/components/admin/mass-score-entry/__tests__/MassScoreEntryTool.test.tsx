import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockHandleSubmitAll = vi.fn();
const mockClearFilters = vi.fn();
const mockSetFilterDate = vi.fn();
const mockSetBracketFilter = vi.fn();
const mockClearErrors = vi.fn();
const mockHandleScoreChange = vi.fn();
const mockHandleGameWinsChange = vi.fn();
const mockHandleMarkCompleted = vi.fn();

// Defined before mockScoreEntryData so typeof can be used for the variable type
const _defaultScoreEntryState = {
  matches: [] as { id: string; isEdited: boolean; isValid: boolean }[],
  loading: false,
  submitting: false,
  failedMatches: [] as string[],
  errorMessages: {} as Record<string, string>,
  brackets: [] as { id: string; title: string }[],
  filters: { date: undefined as Date | undefined, bracketId: undefined as string | undefined },
  handleScoreChange: mockHandleScoreChange,
  handleGameWinsChange: mockHandleGameWinsChange,
  handleMarkCompleted: mockHandleMarkCompleted,
  handleSubmitAll: mockHandleSubmitAll,
  clearErrors: mockClearErrors,
  setFilterDate: mockSetFilterDate,
  setBracketFilter: mockSetBracketFilter,
  clearFilters: mockClearFilters,
};

let mockScoreEntryData: typeof _defaultScoreEntryState = { ..._defaultScoreEntryState };

vi.mock('@/components/admin/mass-score-entry/hooks/useScoreEntryData', () => ({
  useScoreEntryData: () => mockScoreEntryData,
}));

vi.mock('@/components/admin/mass-score-entry/MatchesTable', () => ({
  default: () => <div data-testid="matches-table" />,
}));

vi.mock('@/components/admin/AdminSectionWrapper', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-section-wrapper">{children}</div>
  ),
}));

vi.mock('@/components/admin/mass-score-entry/components/ScoreEntryToolbar', () => ({
  default: ({ onClearFilters }: { onClearFilters: () => void }) => (
    <div data-testid="score-entry-toolbar">
      <button data-testid="toolbar-clear" onClick={onClearFilters}>
        Clear
      </button>
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

// ─── Import after mocks ───────────────────────────────────────────────────────

import MassScoreEntryTool from '../MassScoreEntryTool';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MassScoreEntryTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScoreEntryData = { ..._defaultScoreEntryState };
  });

  describe('submit button state', () => {
    it('disables submit when there are no valid edited matches', () => {
      mockScoreEntryData = {
        ..._defaultScoreEntryState,
        matches: [{ id: 'm1', isEdited: false, isValid: true }],
      };

      render(<MassScoreEntryTool />);

      expect(screen.getByRole('button', { name: /submit all changes/i })).toBeDisabled();
    });

    it('disables submit when edited match is invalid', () => {
      mockScoreEntryData = {
        ..._defaultScoreEntryState,
        matches: [{ id: 'm1', isEdited: true, isValid: false }],
      };

      render(<MassScoreEntryTool />);

      expect(screen.getByRole('button', { name: /submit all changes/i })).toBeDisabled();
    });

    it('enables submit and shows count when there are valid edited matches', () => {
      mockScoreEntryData = {
        ..._defaultScoreEntryState,
        matches: [
          { id: 'm1', isEdited: true, isValid: true },
          { id: 'm2', isEdited: true, isValid: true },
        ],
      };

      render(<MassScoreEntryTool />);

      expect(screen.getByRole('button', { name: /submit \(2\) changes/i })).toBeEnabled();
    });

    it('disables submit when submitting is true', () => {
      mockScoreEntryData = {
        ..._defaultScoreEntryState,
        submitting: true,
        matches: [{ id: 'm1', isEdited: true, isValid: true }],
      };

      render(<MassScoreEntryTool />);

      // Button text changes to "Processing..." when submitting
      expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
    });

    it('calls handleSubmitAll when submit button is clicked', async () => {
      mockScoreEntryData = {
        ..._defaultScoreEntryState,
        matches: [{ id: 'm1', isEdited: true, isValid: true }],
      };

      render(<MassScoreEntryTool />);

      await userEvent.click(screen.getByRole('button', { name: /submit \(1\) changes/i }));

      expect(mockHandleSubmitAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('filter tags', () => {
    it('shows date filter tag when date filter is active', () => {
      const filterDate = new Date('2025-01-04');
      mockScoreEntryData = {
        ..._defaultScoreEntryState,
        filters: { date: filterDate, bracketId: undefined },
      };

      render(<MassScoreEntryTool />);

      expect(screen.getByText('Date:')).toBeInTheDocument();
      expect(screen.getByText(filterDate.toLocaleDateString())).toBeInTheDocument();
    });

    it('shows bracket filter tag when a bracket is selected', () => {
      mockScoreEntryData = {
        ..._defaultScoreEntryState,
        brackets: [{ id: 'bracket-1', title: 'Spring Playoffs' }],
        filters: { date: undefined, bracketId: 'bracket-1' },
      };

      render(<MassScoreEntryTool />);

      expect(screen.getByText('Bracket:')).toBeInTheDocument();
      expect(screen.getByText('Spring Playoffs')).toBeInTheDocument();
    });

    it('does not show filter tags when no filters are active', () => {
      render(<MassScoreEntryTool />);
      expect(screen.queryByText('Date:')).not.toBeInTheDocument();
    });

    it('calls clearFilters when toolbar clear button is clicked', async () => {
      render(<MassScoreEntryTool />);
      await userEvent.click(screen.getByTestId('toolbar-clear'));
      expect(mockClearFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('error alert', () => {
    it('renders ErrorAlert when there are failed matches', () => {
      mockScoreEntryData = {
        ..._defaultScoreEntryState,
        failedMatches: ['m1', 'm2'],
      };

      render(<MassScoreEntryTool />);

      // ErrorAlert shows "2 matches failed to update"
      expect(screen.getByText(/2 matches failed to update/i)).toBeInTheDocument();
    });

    it('does not render error alert when no failed matches', () => {
      render(<MassScoreEntryTool />);
      expect(screen.queryByText(/failed to update/i)).not.toBeInTheDocument();
    });
  });

  it('renders the MatchesTable component', () => {
    render(<MassScoreEntryTool />);
    expect(screen.getByTestId('matches-table')).toBeInTheDocument();
  });
});
