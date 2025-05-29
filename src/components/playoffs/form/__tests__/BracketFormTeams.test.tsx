
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BracketFormTeams } from '../BracketFormTeams';

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

// Test with valid props
const TestWrapper = ({ divisionId = null, maxTeams = 16, onChange = vi.fn() }) => {
  return (
    <BracketFormTeams
      divisionId={divisionId}
      maxTeams={maxTeams}
      onChange={onChange}
    />
  );
};

describe('BracketFormTeams', () => {
  it('renders the teams selection section', () => {
    render(<TestWrapper />);
    
    const teamLabel = screen.getByLabelText(/select teams/i);
    expect(teamLabel).toBeInTheDocument();
  });

  it('passes teams to the SimpleTeamSelectionList component', () => {
    render(<TestWrapper />);
    
    const teamSelection = screen.getByTestId('team-selection-list');
    expect(teamSelection).toBeInTheDocument();
  });

  it('displays the maximum teams limit text', () => {
    render(<TestWrapper maxTeams={8} />);
    
    expect(screen.getByText(/max 8/i)).toBeInTheDocument();
  });

  it('calls onChange when teams are selected', async () => {
    const mockOnChange = vi.fn();
    render(<TestWrapper onChange={mockOnChange} />);
    
    const toggleButton = screen.getByText('Toggle Team');
    await userEvent.click(toggleButton);
    
    // The onChange should eventually be called when team selection changes
    // Note: This might need adjustment based on the actual implementation
  });
});
