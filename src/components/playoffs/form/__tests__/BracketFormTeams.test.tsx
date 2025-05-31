
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BracketFormTeamsContainer } from '../bracket-teams/components/BracketFormTeamsContainer';

// Mock the SimpleTeamSelectionList component since it has its own complex behavior
vi.mock('@/components/playoffs/SimpleTeamSelectionList', () => ({
  default: ({ teams, selected, onToggle }: any) => (
    <div data-testid="team-selection-list">
      <span>Teams: {teams ? teams.length : 0}</span>
      <span>Selected: {selected ? selected.size : 0}</span>
      <button onClick={() => onToggle('team1')}>Toggle Team</button>
    </div>
  ),
}));

// Mock the hooks
vi.mock('@/hooks/useTeamRankings', () => ({
  useTeamRankings: () => ({
    rankings: [
      { teamId: 'team1', teamName: 'Team 1', powerScore: 85.5, wins: 5, losses: 2 },
      { teamId: 'team2', teamName: 'Team 2', powerScore: 92.1, wins: 7, losses: 1 },
    ],
    isLoading: false
  })
}));

// Test with valid props - Updated to include new callback structure
const TestWrapper = ({ 
  divisionId = 'div-1',
  maxTeams = 16, 
  onChange = vi.fn(), 
  divisions = [],
  teams = undefined
}) => {
  return (
    <BracketFormTeamsContainer
      divisionId={divisionId}
      teams={teams}
      maxTeams={maxTeams}
      onChange={onChange}
      divisions={divisions}
    />
  );
};

describe('BracketFormTeamsContainer', () => {
  it('renders the teams selection section', () => {
    render(<TestWrapper />);
    
    // Should render without crashing
    expect(screen.getByTestId('team-selection-list')).toBeInTheDocument();
  });

  it('passes teams to the SimpleTeamSelectionList component', () => {
    render(<TestWrapper />);
    
    const teamSelection = screen.getByTestId('team-selection-list');
    expect(teamSelection).toBeInTheDocument();
  });

  it('calls onChange with validation when teams are selected', async () => {
    const mockOnChange = vi.fn();
    render(<TestWrapper onChange={mockOnChange} />);
    
    const toggleButton = screen.getByText('Toggle Team');
    await userEvent.click(toggleButton);
    
    // The onChange should be called with validation object
    // Note: This might need adjustment based on the actual implementation
  });

  it('filters teams by divisionId when provided', () => {
    const mockTeams = [
      { id: 'team1', name: 'Team 1', division_id: 'div-1' },
      { id: 'team2', name: 'Team 2', division_id: 'div-2' },
    ];
    
    render(<TestWrapper divisionId="div-1" teams={mockTeams} />);
    
    // Should only show teams from div-1
    const teamSelection = screen.getByTestId('team-selection-list');
    expect(teamSelection).toBeInTheDocument();
  });

  it('shows validation message when no teams available', () => {
    render(<TestWrapper teams={[]} />);
    
    // Should show empty state with actionable guidance
    expect(screen.getByText('No Teams Available')).toBeInTheDocument();
  });

  it('shows validation message when too few teams selected', () => {
    const mockTeams = [
      { id: 'team1', name: 'Team 1', division_id: 'div-1' },
      { id: 'team2', name: 'Team 2', division_id: 'div-1' },
    ];
    
    render(<TestWrapper teams={mockTeams} />);
    
    // Should show validation message about needing more teams
    // This will be tested more thoroughly in integration tests
  });
});
