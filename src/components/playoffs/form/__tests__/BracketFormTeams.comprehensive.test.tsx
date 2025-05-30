
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BracketFormTeams } from '../BracketFormTeams';

// Mock the new hooks
vi.mock('../bracket-teams/hooks', () => ({
  useBracketFormData: vi.fn()
}));

// Mock the existing hooks
vi.mock('@/hooks/playoffs', () => ({
  useFilteredTeams: vi.fn(),
  useTeamSelection: vi.fn(),
  useTeamSeeding: vi.fn()
}));

// Mock the child components
vi.mock('@/components/playoffs/SimpleTeamSelectionList', () => ({
  default: ({ teams, selected, onToggle, maxTeams }: any) => (
    <div data-testid="team-selection-list">
      <span data-testid="teams-count">Teams: {teams ? teams.length : 0}</span>
      <span data-testid="selected-count">Selected: {selected ? selected.size : 0}</span>
      <span data-testid="max-teams">Max: {maxTeams}</span>
      {teams && teams.map((team: any) => (
        <button
          key={team.id}
          data-testid={`team-${team.id}`}
          onClick={() => onToggle(team.id)}
          className={selected?.has(team.id) ? 'selected' : ''}
        >
          {team.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/playoffs/TeamSelectionSummary', () => ({
  default: ({ count, max, minTeams }: any) => (
    <div data-testid="team-selection-summary">
      <span data-testid="summary-count">{count}</span>
      <span data-testid="summary-max">{max}</span>
      <span data-testid="summary-min">{minTeams}</span>
    </div>
  ),
}));

// Mock imports
const mockUseBracketFormData = vi.hoisted(() => vi.fn());
const mockUseFilteredTeams = vi.hoisted(() => vi.fn());
const mockUseTeamSelection = vi.hoisted(() => vi.fn());
const mockUseTeamSeeding = vi.hoisted(() => vi.fn());

vi.mock('../bracket-teams/hooks', () => ({
  useBracketFormData: mockUseBracketFormData
}));

vi.mock('@/hooks/playoffs', () => ({
  useFilteredTeams: mockUseFilteredTeams,
  useTeamSelection: mockUseTeamSelection,
  useTeamSeeding: mockUseTeamSeeding
}));

describe('BracketFormTeams - Comprehensive Tests', () => {
  const defaultProps = {
    divisionId: 'div-1',
    maxTeams: 16,
    onChange: vi.fn(),
    divisions: [
      { id: 'div-1', name: 'Division A' },
      { id: 'div-2', name: 'Division B' }
    ]
  };

  const mockTeams = [
    {
      id: 'team-1',
      name: 'Team Alpha',
      seed: 1,
      division_id: 'div-1',
      divisionName: 'Division A',
      powerScore: 95.5,
      wins: 8,
      losses: 2
    },
    {
      id: 'team-2',
      name: 'Team Beta', 
      seed: 2,
      division_id: 'div-1',
      divisionName: 'Division A',
      powerScore: 88.2,
      wins: 7,
      losses: 3
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseBracketFormData.mockReturnValue({
      teams: mockTeams,
      isLoading: false,
      isError: false,
      errorMessage: null,
      isDataReady: true
    });
    
    mockUseFilteredTeams.mockReturnValue(mockTeams);
    mockUseTeamSeeding.mockReturnValue(mockTeams);
    
    mockUseTeamSelection.mockReturnValue({
      selected: new Set(['team-1']),
      toggle: vi.fn(),
      setSelected: vi.fn()
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Data Loading States', () => {
    it('shows loading state when data is loading', () => {
      mockUseBracketFormData.mockReturnValue({
        teams: [],
        isLoading: true,
        isError: false,
        errorMessage: null,
        isDataReady: false
      });

      render(<BracketFormTeams {...defaultProps} />);
      
      expect(screen.getByText('Loading teams...')).toBeInTheDocument();
      expect(screen.getByText(/Loading team rankings and division data/)).toBeInTheDocument();
    });

    it('shows loading state when data is not ready', () => {
      mockUseBracketFormData.mockReturnValue({
        teams: [],
        isLoading: false,
        isError: false,
        errorMessage: null,
        isDataReady: false
      });

      render(<BracketFormTeams {...defaultProps} />);
      
      expect(screen.getByText('Loading teams...')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('shows error state when data failed to load', () => {
      mockUseBracketFormData.mockReturnValue({
        teams: [],
        isLoading: false,
        isError: true,
        errorMessage: 'Failed to load teams. Please refresh and try again.',
        isDataReady: false
      });

      render(<BracketFormTeams {...defaultProps} />);
      
      expect(screen.getByText('Failed to load teams. Please refresh and try again.')).toBeInTheDocument();
      expect(screen.getByText(/Error loading team data/)).toBeInTheDocument();
    });

    it('shows custom error message when provided', () => {
      const customError = 'Custom error message';
      mockUseBracketFormData.mockReturnValue({
        teams: [],
        isLoading: false,
        isError: true,
        errorMessage: customError,
        isDataReady: false
      });

      render(<BracketFormTeams {...defaultProps} />);
      
      expect(screen.getByText(customError)).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no teams in selected division', () => {
      mockUseFilteredTeams.mockReturnValue([]);

      render(<BracketFormTeams {...defaultProps} />);
      
      expect(screen.getByText('No teams available in this division')).toBeInTheDocument();
      expect(screen.getByText(/No teams found for the selected division/)).toBeInTheDocument();
    });
  });

  describe('Data Integration', () => {
    it('passes divisions to useBracketFormData hook', () => {
      render(<BracketFormTeams {...defaultProps} />);
      
      expect(mockUseBracketFormData).toHaveBeenCalledWith(defaultProps.divisions);
    });

    it('passes processed teams to useFilteredTeams hook', () => {
      render(<BracketFormTeams {...defaultProps} />);
      
      expect(mockUseFilteredTeams).toHaveBeenCalledWith(mockTeams, 'div-1');
    });

    it('passes filtered teams to useTeamSeeding hook', () => {
      render(<BracketFormTeams {...defaultProps} />);
      
      expect(mockUseTeamSeeding).toHaveBeenCalledWith(mockTeams);
    });
  });

  describe('Team Selection Logic', () => {
    it('renders team selection list with correct props', () => {
      render(<BracketFormTeams {...defaultProps} />);
      
      const teamList = screen.getByTestId('team-selection-list');
      expect(teamList).toBeInTheDocument();
      
      expect(screen.getByTestId('teams-count')).toHaveTextContent('Teams: 2');
      expect(screen.getByTestId('max-teams')).toHaveTextContent('Max: 16');
    });

    it('calls onChange when team selection changes', async () => {
      const mockOnChange = vi.fn();
      const mockToggle = vi.fn();
      
      mockUseTeamSelection.mockReturnValue({
        selected: new Set(['team-1']),
        toggle: mockToggle,
        setSelected: vi.fn()
      });

      render(<BracketFormTeams {...defaultProps} onChange={mockOnChange} />);
      
      const teamButton = screen.getByTestId('team-team-1');
      await userEvent.click(teamButton);
      
      expect(mockToggle).toHaveBeenCalledWith('team-1', 16);
    });

    it('syncs selection with parent via onChange', () => {
      const mockOnChange = vi.fn();
      
      render(<BracketFormTeams {...defaultProps} onChange={mockOnChange} />);
      
      // onChange should be called with current selection
      expect(mockOnChange).toHaveBeenCalledWith(['team-1']);
    });
  });

  describe('UI Rendering', () => {
    it('displays correct team count information', () => {
      render(<BracketFormTeams {...defaultProps} />);
      
      expect(screen.getByText(/Selected 1 of 16 maximum teams/)).toBeInTheDocument();
      expect(screen.getByText(/from 2 available/)).toBeInTheDocument();
    });

    it('shows team selection summary', () => {
      render(<BracketFormTeams {...defaultProps} />);
      
      const summary = screen.getByTestId('team-selection-summary');
      expect(summary).toBeInTheDocument();
      
      expect(screen.getByTestId('summary-count')).toHaveTextContent('1');
      expect(screen.getByTestId('summary-max')).toHaveTextContent('16');
      expect(screen.getByTestId('summary-min')).toHaveTextContent('2');
    });

    it('displays form labels correctly', () => {
      render(<BracketFormTeams {...defaultProps} />);
      
      expect(screen.getByText('Select Teams (Min 2, Max 16)')).toBeInTheDocument();
    });
  });

  describe('Props Changes', () => {
    it('updates when divisionId changes', () => {
      const { rerender } = render(<BracketFormTeams {...defaultProps} />);
      
      expect(mockUseFilteredTeams).toHaveBeenCalledWith(expect.anything(), 'div-1');
      
      rerender(<BracketFormTeams {...defaultProps} divisionId="div-2" />);
      
      expect(mockUseFilteredTeams).toHaveBeenCalledWith(expect.anything(), 'div-2');
    });

    it('updates when maxTeams changes', () => {
      const { rerender } = render(<BracketFormTeams {...defaultProps} />);
      
      expect(screen.getByTestId('max-teams')).toHaveTextContent('Max: 16');
      
      rerender(<BracketFormTeams {...defaultProps} maxTeams={8} />);
      
      expect(screen.getByTestId('max-teams')).toHaveTextContent('Max: 8');
    });

    it('updates when divisions prop changes', () => {
      const { rerender } = render(<BracketFormTeams {...defaultProps} />);
      
      const newDivisions = [
        { id: 'div-3', name: 'Division C' }
      ];
      
      rerender(<BracketFormTeams {...defaultProps} divisions={newDivisions} />);
      
      expect(mockUseBracketFormData).toHaveBeenCalledWith(newDivisions);
    });
  });

  describe('Edge Cases', () => {
    it('handles null divisionId', () => {
      render(<BracketFormTeams {...defaultProps} divisionId={null} />);
      
      expect(mockUseFilteredTeams).toHaveBeenCalledWith(expect.anything(), null);
      expect(screen.getByTestId('team-selection-list')).toBeInTheDocument();
    });

    it('handles empty divisions array', () => {
      render(<BracketFormTeams {...defaultProps} divisions={[]} />);
      
      expect(mockUseBracketFormData).toHaveBeenCalledWith([]);
    });

    it('handles undefined divisions', () => {
      render(<BracketFormTeams {...defaultProps} divisions={undefined} />);
      
      expect(mockUseBracketFormData).toHaveBeenCalledWith([]);
    });
  });
});
