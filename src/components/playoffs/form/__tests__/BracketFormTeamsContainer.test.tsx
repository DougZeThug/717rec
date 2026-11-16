import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

import { BracketFormTeamsContainer } from '../bracket-teams/components/BracketFormTeamsContainer';
import type {
  BracketFormStateResult,
  ProcessedTeam,
  SeedValidationState,
} from '../bracket-teams/types';

type MockTeamSelectionFormProps = {
  teams: ProcessedTeam[];
  formState: BracketFormStateResult;
  maxTeams: number;
  minTeams: number;
  divisionId?: string;
  seedValidation?: SeedValidationState;
  onSeedChange?: (teamId: string, seed: number | null) => void;
};

// Mock individual hook files (component imports from individual files, not barrel)
const mockUseBracketFormData = vi.hoisted(() => vi.fn());
const mockUseTeamSelectionState = vi.hoisted(() => vi.fn());
const mockUseBracketFormValidation = vi.hoisted(() => vi.fn());

vi.mock('../bracket-teams/hooks/useBracketFormData', () => ({
  useBracketFormData: mockUseBracketFormData,
}));

vi.mock('../bracket-teams/hooks/useTeamSelectionState', () => ({
  useTeamSelectionState: mockUseTeamSelectionState,
}));

vi.mock('../bracket-teams/hooks/useBracketFormValidation', () => ({
  useBracketFormValidation: mockUseBracketFormValidation,
}));

// Mock individual child component files
vi.mock('../bracket-teams/components/TeamSelectionError', () => ({
  TeamSelectionError: ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <div data-testid="team-selection-error">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

vi.mock('../bracket-teams/components/TeamSelectionLoading', () => ({
  TeamSelectionLoading: () => <div data-testid="team-selection-loading">Loading teams...</div>,
}));

vi.mock('../bracket-teams/components/TeamSelectionEmpty', () => ({
  TeamSelectionEmpty: () => <div data-testid="team-selection-empty">No teams available</div>,
}));

vi.mock('../bracket-teams/components/TeamSelectionForm', () => ({
  TeamSelectionForm: ({ teams, formState, onSeedChange }: MockTeamSelectionFormProps) => (
    <div
      data-testid="team-selection-form"
      data-team-order={teams.map((team) => team.id).join(',')}
      data-team-seeds={teams.map((team) => team.seed).join(',')}
    >
      <span>Teams: {teams ? teams.length : 0}</span>
      <span>{formState?.statusMessage || 'Ready'}</span>
      <button onClick={() => formState?.handleTeamToggle?.('team-1')}>Toggle Team</button>
      <button onClick={() => onSeedChange?.('team-1', 3)}>Seed Team</button>
    </div>
  ),
}));

describe('BracketFormTeamsContainer', () => {
  const defaultProps = {
    divisionId: 'div-1',
    maxTeams: 16,
    onChange: vi.fn(),
    divisions: [{ id: 'div-1', name: 'Division A' }],
  };

  const mockProcessedTeams = [
    {
      id: 'team-1',
      name: 'Team Alpha',
      seed: 1,
      division_id: 'div-1',
      divisionName: 'Division A',
      wins: 8,
      losses: 2,
      game_wins: 24,
      game_losses: 6,
      imageUrl: null,
      logoUrl: null,
      players: [],
      power_score: 95.5,
      powerScore: 95.5,
      sos: 0.65,
      win_percentage: 0.8,
      game_win_percentage: 0.8,
      created_at: new Date().toISOString(),
      close_match_losses: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseBracketFormData.mockReturnValue({
      teams: mockProcessedTeams,
      isLoading: false,
      isError: false,
      errorMessage: null,
      isDataReady: true,
    });

    mockUseTeamSelectionState.mockReturnValue({
      selected: new Set(['team-1']),
      selectedArray: ['team-1'],
      count: 1,
      handleTeamToggle: vi.fn(),
      clearSelection: vi.fn(),
      statusMessage: 'Selected 1 of 16 maximum teams',
    });

    mockUseBracketFormValidation.mockReturnValue({
      isValid: true,
      message: null,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Error States', () => {
    it('renders error state when data failed to load', () => {
      mockUseBracketFormData.mockReturnValue({
        teams: [],
        isLoading: false,
        isError: true,
        errorMessage: 'Failed to load teams',
        isDataReady: false,
      });

      render(<BracketFormTeamsContainer {...defaultProps} />);

      expect(screen.getByTestId('team-selection-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load teams')).toBeInTheDocument();
    });
  });

  describe('Error recovery', () => {
    it('reloads the page when Retry is pressed', async () => {
      const reload = vi.fn();
      vi.stubGlobal('location', { ...window.location, reload });
      mockUseBracketFormData.mockReturnValue({
        teams: [],
        isLoading: false,
        isError: true,
        errorMessage: null,
        isDataReady: false,
      });

      render(<BracketFormTeamsContainer {...defaultProps} />);

      expect(screen.getByText('An error occurred loading teams')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(reload).toHaveBeenCalledTimes(1);
      vi.unstubAllGlobals();
    });
  });

  describe('Seed changes', () => {
    it('passes a seed change on to the parent', async () => {
      const onSeedChange = vi.fn();
      render(<BracketFormTeamsContainer {...defaultProps} onSeedChange={onSeedChange} />);

      await userEvent.click(screen.getByRole('button', { name: 'Seed Team' }));
      expect(onSeedChange).toHaveBeenCalledWith('team-1', 3);
    });

    it('ignores a seed change when no parent is listening', async () => {
      render(<BracketFormTeamsContainer {...defaultProps} />);

      await userEvent.click(screen.getByRole('button', { name: 'Seed Team' }));
      expect(screen.getByTestId('team-selection-form')).toBeInTheDocument();
    });
  });

  describe('Bad props', () => {
    it('falls back to no divisions when the divisions prop is not a list', () => {
      render(
        <BracketFormTeamsContainer
          {...defaultProps}
          divisions={'nope' as unknown as typeof defaultProps.divisions}
        />
      );

      expect(screen.getByTestId('team-selection-form')).toBeInTheDocument();
    });

    it('ignores a teams prop that is not a list', () => {
      render(
        <BracketFormTeamsContainer
          {...defaultProps}
          teams={
            'nope' as unknown as React.ComponentProps<typeof BracketFormTeamsContainer>['teams']
          }
        />
      );

      expect(screen.getByTestId('team-selection-form')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('renders loading state when data is loading', () => {
      mockUseBracketFormData.mockReturnValue({
        teams: [],
        isLoading: true,
        isError: false,
        errorMessage: null,
        isDataReady: false,
      });

      render(<BracketFormTeamsContainer {...defaultProps} />);

      expect(screen.getByTestId('team-selection-loading')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('renders empty state when no teams available', () => {
      mockUseBracketFormData.mockReturnValue({
        teams: [],
        isLoading: false,
        isError: false,
        errorMessage: null,
        isDataReady: true,
      });

      render(<BracketFormTeamsContainer {...defaultProps} />);

      expect(screen.getByTestId('team-selection-empty')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('renders team selection form when data is ready', () => {
      render(<BracketFormTeamsContainer {...defaultProps} />);

      expect(screen.getByTestId('team-selection-form')).toBeInTheDocument();
      expect(screen.getByText('Selected 1 of 16 maximum teams')).toBeInTheDocument();
      expect(screen.getByText('Teams: 1')).toBeInTheDocument();
    });

    it('handles team toggle interactions', async () => {
      const mockToggle = vi.fn();

      mockUseTeamSelectionState.mockReturnValue({
        selected: new Set(['team-1']),
        selectedArray: ['team-1'],
        count: 1,
        handleTeamToggle: mockToggle,
        clearSelection: vi.fn(),
        statusMessage: 'Selected 1 of 16 maximum teams',
      });

      render(<BracketFormTeamsContainer {...defaultProps} />);

      const toggleButton = screen.getByText('Toggle Team');
      await userEvent.click(toggleButton);

      expect(mockToggle).toHaveBeenCalledWith('team-1');
    });

    it('calls onChange exactly once when selection changes', () => {
      const mockOnChange = vi.fn();

      mockUseTeamSelectionState.mockReturnValue({
        selected: new Set(['team-1']),
        selectedArray: ['team-1'],
        count: 1,
        handleTeamToggle: vi.fn(),
        clearSelection: vi.fn(),
        statusMessage: 'Selected 1 of 16 maximum teams',
      });

      mockUseBracketFormValidation.mockReturnValue({
        isValid: true,
        message: null,
      });

      render(<BracketFormTeamsContainer {...defaultProps} onChange={mockOnChange} />);

      // Should call onChange once during render
      expect(mockOnChange).toHaveBeenCalledWith({
        ids: ['team-1'],
        isValid: true,
      });
    });
  });

  describe('Props and Configuration', () => {
    it('uses custom minTeams prop', () => {
      render(<BracketFormTeamsContainer {...defaultProps} minTeams={4} />);

      // Should pass minTeams to useTeamSelectionState (4th parameter)
      expect(mockUseTeamSelectionState).toHaveBeenCalledWith(16, new Set(), 1, 4);
    });

    it('defaults minTeams to 2 when not provided', () => {
      render(<BracketFormTeamsContainer {...defaultProps} />);

      expect(mockUseTeamSelectionState).toHaveBeenCalledWith(16, new Set(), 1, 2);
    });

    it('always calls useBracketFormData even with provided teams', () => {
      const teamsProp = [{ id: 'team-1', name: 'Team One' }];
      render(<BracketFormTeamsContainer {...defaultProps} teams={teamsProp} />);

      // Should still call useBracketFormData (not conditionally)
      expect(mockUseBracketFormData).toHaveBeenCalledWith(
        defaultProps.divisions,
        teamsProp,
        defaultProps.divisionId
      );
    });
  });

  // The list shows teams best first, in the order the saved bracket will seed them.
  // These run with the `teams` prop, the way the playoff page renders the form.
  describe('List order', () => {
    const entry = (id: string, overrides: Partial<Team> = {}): Team => ({
      id,
      name: id,
      divisionName: 'Intermediate',
      division_id: 'div-1',
      power_score: 50,
      win_percentage: 0.5,
      ...overrides,
    });

    const renderWithTeams = (teams: Team[]) =>
      render(<BracketFormTeamsContainer {...defaultProps} teams={teams} />);

    const listOrder = () =>
      screen.getByTestId('team-selection-form').getAttribute('data-team-order');
    const listSeeds = () =>
      screen.getByTestId('team-selection-form').getAttribute('data-team-seeds');

    it('lists the teams best first, not A to Z', () => {
      renderWithTeams([
        entry('Alpha', { power_score: 20 }),
        entry('Bravo', { power_score: 80 }),
        entry('Charlie', { power_score: 50 }),
      ]);

      // The hook mock returns 'team-1'. It is not in the list: the prop is what shows.
      expect(listOrder()).toBe('Bravo,Charlie,Alpha');
    });

    it('breaks a tie on the displayed score by division, then win %, then name', () => {
      renderWithTeams([
        entry('Zulu', { power_score: 41.6, divisionName: 'Recreational', win_percentage: 0.9 }),
        entry('Yankee', { power_score: 41.65, divisionName: 'Intermediate', win_percentage: 0.4 }),
        entry('X-ray', { power_score: 41.6, divisionName: 'Intermediate', win_percentage: 0.7 }),
        entry('Whiskey', { power_score: 41.6, divisionName: 'Competitive', win_percentage: 0.1 }),
        entry('Victor', { power_score: 41.6, divisionName: 'Intermediate', win_percentage: 0.4 }),
      ]);

      // 41.65 and 41.6 print the same. Competitive first, then Intermediate by
      // win % (X-ray 0.7), then the 0.4 pair by name (Victor, Yankee), then Recreational.
      expect(listOrder()).toBe('Whiskey,X-ray,Victor,Yankee,Zulu');
    });

    it('puts a team with no power score last', () => {
      renderWithTeams([
        entry('Alpha', { power_score: null, win_percentage: 0.9 }),
        entry('Bravo', { power_score: 10 }),
      ]);

      expect(listOrder()).toBe('Bravo,Alpha');
    });

    it('numbers the badges by the new order and keeps a stored seed', () => {
      renderWithTeams([
        entry('Alpha', { power_score: 20 }),
        entry('Bravo', { power_score: 80 }),
        entry('Charlie', { power_score: 50, seed: 9 }),
      ]);

      // The badge is `seed || position`. Bravo is 1st, Charlie keeps its stored 9,
      // and Alpha is 3rd.
      expect(listOrder()).toBe('Bravo,Charlie,Alpha');
      expect(listSeeds()).toBe('1,9,3');
    });

    it('does not reorder the list the parent passed in', () => {
      const teams = [entry('Alpha', { power_score: 20 }), entry('Bravo', { power_score: 80 })];
      renderWithTeams(teams);

      expect(teams.map((team) => team.id)).toEqual(['Alpha', 'Bravo']);
      expect(listOrder()).toBe('Bravo,Alpha');
    });

    it('lists the teams of a picked division best first too', () => {
      const divisions = [
        { id: 'comp', name: 'Competitive', display_division: 'Competitive' },
        { id: 'rec', name: 'Recreational', display_division: 'Recreational' },
      ];
      render(
        <BracketFormTeamsContainer
          {...defaultProps}
          divisions={divisions}
          divisionId="comp"
          teams={[
            entry('Alpha', { power_score: 20, division_id: 'comp' }),
            entry('Bravo', { power_score: 80, division_id: 'rec' }),
            entry('Charlie', { power_score: 60, division_id: 'comp' }),
          ]}
        />
      );

      expect(listOrder()).toBe('Charlie,Alpha');
    });

    it('also lists a list from the hook best first when there is no teams prop', () => {
      mockUseBracketFormData.mockReturnValue({
        teams: [entry('Alpha', { power_score: 20 }), entry('Bravo', { power_score: 80 })],
        isLoading: false,
        isError: false,
        errorMessage: null,
        isDataReady: true,
      });

      render(<BracketFormTeamsContainer {...defaultProps} />);

      expect(listOrder()).toBe('Bravo,Alpha');
    });
  });

  describe('Division filter', () => {
    const divisions = [
      { id: 'comp', name: 'Competitive', display_division: 'Competitive' },
      { id: 'comp-high', name: 'Competitive High', display_division: 'Competitive' },
      { id: 'rec', name: 'Recreational', display_division: 'Recreational' },
      { id: 'inter', name: 'Intermediate', display_division: 'Intermediate' },
    ];
    const teamIn = (id: string, divisionId: string) => ({
      ...mockProcessedTeams[0],
      id,
      name: id,
      division_id: divisionId,
    });
    const leagueTeams = [
      teamIn('c1', 'comp'),
      teamIn('c2', 'comp-high'),
      teamIn('r1', 'rec'),
      teamIn('r2', 'rec'),
    ];

    const selecting = (ids: string[]) =>
      mockUseTeamSelectionState.mockReturnValue({
        selected: new Set(ids),
        selectedArray: ids,
        count: ids.length,
        handleTeamToggle: vi.fn(),
        clearSelection: vi.fn(),
        statusMessage: `${ids.length} teams selected`,
      });

    const renderWith = (divisionId: string | null) =>
      render(
        <BracketFormTeamsContainer
          {...defaultProps}
          divisions={divisions}
          divisionId={divisionId}
        />
      );

    beforeEach(() => {
      mockUseBracketFormData.mockReturnValue({
        teams: leagueTeams,
        isLoading: false,
        isError: false,
        errorMessage: null,
        isDataReady: true,
      });
      selecting([]);
    });

    it('shows only the teams of the picked display division', () => {
      renderWith('comp');

      expect(screen.getByText('Teams: 2')).toBeInTheDocument();
      expect(screen.getByLabelText('Show teams from all divisions')).not.toBeChecked();
    });

    it('shows every team once "Show teams from all divisions" is ticked', async () => {
      renderWith('comp');

      await userEvent.click(screen.getByLabelText('Show teams from all divisions'));

      expect(screen.getByText('Teams: 4')).toBeInTheDocument();
    });

    it('keeps a selected team from another division in the list', () => {
      selecting(['r1']);
      renderWith('comp');

      expect(screen.getByText('Teams: 3')).toBeInTheDocument();
    });

    it('shows every team, with no checkbox, before a division is picked', () => {
      renderWith(null);

      expect(screen.getByText('Teams: 4')).toBeInTheDocument();
      expect(screen.queryByLabelText('Show teams from all divisions')).not.toBeInTheDocument();
    });

    it('says when the picked division has no teams, and still offers every team', async () => {
      renderWith('inter');

      expect(screen.getByText(/No Intermediate teams/)).toBeInTheDocument();
      expect(screen.queryByTestId('team-selection-empty')).not.toBeInTheDocument();
      await userEvent.click(screen.getByLabelText('Show teams from all divisions'));
      expect(screen.getByText('Teams: 4')).toBeInTheDocument();
    });
  });
});
