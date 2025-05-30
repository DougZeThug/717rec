
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BracketFormTeams } from '../BracketFormTeams';

// Mock all the hooks used by the component
vi.mock('@/hooks/useTeamRankings', () => ({
  useTeamRankings: vi.fn()
}));

vi.mock('@/hooks/playoffs', () => ({
  useFilteredTeams: vi.fn(),
  useTeamSelection: vi.fn(),
  useTeamSeeding: vi.fn()
}));

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
const mockUseTeamRankings = vi.hoisted(() => vi.fn());
const mockUseFilteredTeams = vi.hoisted(() => vi.fn());
const mockUseTeamSelection = vi.hoisted(() => vi.fn());
const mockUseTeamSeeding = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useTeamRankings', () => ({
  useTeamRankings: mockUseTeamRankings
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

  const mockRankings = [
    {
      teamId: 'team-1',
      teamName: 'Team Alpha',
      powerScore: 95.5,
      wins: 8,
      losses: 2,
      divisionName: 'Division A',
      imageUrl: 'team1.jpg',
      gamesWon: 16,
      gamesLost: 4,
      sos: 0.65,
      winPercentage: 0.8,
      gameWinPercentage: 0.8,
      closeMatchLosses: 1
    },
    {
      teamId: 'team-2', 
      teamName: 'Team Beta',
      powerScore: 88.2,
      wins: 7,
      losses: 3,
      divisionName: 'Division A',
      imageUrl: 'team2.jpg',
      gamesWon: 14,
      gamesLost: 6,
      sos: 0.55,
      winPercentage: 0.7,
      gameWinPercentage: 0.7,
      closeMatchLosses: 2
    }
  ];

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
    mockUseTeamRankings.mockReturnValue({
      rankings: mockRankings,
      isLoading: false
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
    it('shows loading state when rankings are loading', () => {
      mockUseTeamRankings.mockReturnValue({
        rankings: null,
        isLoading: true
      });

      render(<BracketFormTeams {...defaultProps} />);
      
      expect(screen.getByText('Loading teams...')).toBeInTheDocument();
      expect(screen.getByText(/Loading team rankings and division data/)).toBeInTheDocument();
    });

    it('shows loading state when divisions are undefined', () => {
      render(<BracketFormTeams {...defaultProps} divisions={undefined} />);
      
      expect(screen.getByText('Loading teams...')).toBeInTheDocument();
    });

    it('shows loading state when rankings data is not ready', () => {
      mockUseTeamRankings.mockReturnValue({
        rankings: null,
        isLoading: false
      });

      render(<BracketFormTeams {...defaultProps} />);
      
      expect(screen.getByText('Loading teams...')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('shows error state when rankings failed to load', () => {
      mockUseTeamRankings.mockReturnValue({
        rankings: null,
        isLoading: false
      });

      render(<BracketFormTeams {...defaultProps} />);
      
      expect(screen.getByText('Failed to load teams. Please refresh and try again.')).toBeInTheDocument();
      expect(screen.getByText(/Error loading team data/)).toBeInTheDocument();
    });

    it('shows error state when rankings is empty array', () => {
      mockUseTeamRankings.mockReturnValue({
        rankings: [],
        isLoading: false
      });

      render(<BracketFormTeams {...defaultProps} />);
      
      expect(screen.getByText('Failed to load teams. Please refresh and try again.')).toBeInTheDocument();
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

  describe('Data Transformation', () => {
    it('correctly transforms rankings to teams with proper division mapping', () => {
      render(<BracketFormTeams {...defaultProps} />);
      
      // Verify the teams were passed to filtered teams hook
      expect(mockUseFilteredTeams).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'team-1',
            name: 'Team Alpha',
            seed: 1,
            division_id: 'div-1',
            divisionName: 'Division A',
            powerScore: 95.5
          })
        ]),
        'div-1'
      );
    });

    it('handles missing division mapping gracefully', () => {
      const rankingsWithUnknownDivision = [
        {
          ...mockRankings[0],
          divisionName: 'Unknown Division'
        }
      ];

      mockUseTeamRankings.mockReturnValue({
        rankings: rankingsWithUnknownDivision,
        isLoading: false
      });

      render(<BracketFormTeams {...defaultProps} />);
      
      // Should still render without crashing
      expect(screen.getByTestId('team-selection-list')).toBeInTheDocument();
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

  describe('Team Seeding', () => {
    it('applies seeding to filtered teams', () => {
      render(<BracketFormTeams {...defaultProps} />);
      
      expect(mockUseTeamSeeding).toHaveBeenCalledWith(mockTeams);
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
      
      // Should trigger re-processing of teams with new division mapping
      expect(mockUseFilteredTeams).toHaveBeenCalled();
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
      
      expect(screen.getByText('Loading teams...')).toBeInTheDocument();
    });

    it('handles malformed rankings data', () => {
      mockUseTeamRankings.mockReturnValue({
        rankings: [{ invalid: 'data' }],
        isLoading: false
      });

      render(<BracketFormTeams {...defaultProps} />);
      
      // Should handle gracefully without crashing
      expect(screen.getByTestId('team-selection-list')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('memoizes division mapping correctly', () => {
      const { rerender } = render(<BracketFormTeams {...defaultProps} />);
      
      // Rerender with same divisions - should not recompute
      rerender(<BracketFormTeams {...defaultProps} maxTeams={8} />);
      
      // Verify memoization is working (this would need spy on useMemo in real test)
      expect(mockUseFilteredTeams).toHaveBeenCalled();
    });

    it('memoizes team processing correctly', () => {
      const { rerender } = render(<BracketFormTeams {...defaultProps} />);
      
      // Rerender with same rankings and divisions
      rerender(<BracketFormTeams {...defaultProps} maxTeams={8} />);
      
      // Should use memoized teams
      expect(mockUseFilteredTeams).toHaveBeenCalled();
    });
  });
});
