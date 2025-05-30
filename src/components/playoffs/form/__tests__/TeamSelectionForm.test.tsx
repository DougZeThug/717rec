
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TeamSelectionForm } from '../bracket-teams/components/TeamSelectionForm';
import { Team } from '@/types';

// Mock the child components
vi.mock('@/components/playoffs/SimpleTeamSelectionList', () => ({
  default: ({ teams, selected, onToggle, maxTeams }: any) => (
    <div data-testid="team-selection-list">
      <span>Teams: {teams?.length || 0}</span>
      <span>Selected: {selected?.size || 0}</span>
      <span>Max: {maxTeams}</span>
      {teams?.map((team: any) => (
        <button
          key={team.id}
          data-testid={`team-${team.id}`}
          onClick={() => onToggle(team.id)}
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
      Count: {count}, Max: {max}, Min: {minTeams}
    </div>
  ),
}));

// Helper function to create complete mock team
const createMockTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 'team-1',
  name: 'Team Alpha',
  wins: 8,
  losses: 2,
  game_wins: 24,
  game_losses: 6,
  divisionName: 'Division A',
  division_id: 'div-1',
  imageUrl: null,
  logoUrl: null,
  players: [],
  seed: 1,
  power_score: 95.5,
  sos: 0.65,
  win_percentage: 0.8,
  game_win_percentage: 0.8,
  created_at: new Date().toISOString(),
  close_match_losses: 0,
  ...overrides
});

describe('TeamSelectionForm', () => {
  const mockTeams: Team[] = [createMockTeam()];

  const defaultProps = {
    minTeams: 2,
    maxTeams: 16,
    statusMessage: 'Select teams to continue',
    availableTeamsCount: 1,
    seededTeams: mockTeams,
    selected: new Set(['team-1']),
    count: 1,
    onTeamToggle: vi.fn()
  };

  it('renders form with correct label', () => {
    render(<TeamSelectionForm {...defaultProps} />);
    
    expect(screen.getByText('Select Teams (Min 2, Max 16)')).toBeInTheDocument();
  });

  it('displays status message and availability count', () => {
    render(<TeamSelectionForm {...defaultProps} />);
    
    expect(screen.getByText('Select teams to continue from 1 available')).toBeInTheDocument();
  });

  it('renders team selection list with correct props', () => {
    render(<TeamSelectionForm {...defaultProps} />);
    
    const teamList = screen.getByTestId('team-selection-list');
    expect(teamList).toBeInTheDocument();
    expect(screen.getByText('Teams: 1')).toBeInTheDocument();
    expect(screen.getByText('Selected: 1')).toBeInTheDocument();
    expect(screen.getByText('Max: 16')).toBeInTheDocument();
  });

  it('renders team selection summary', () => {
    render(<TeamSelectionForm {...defaultProps} />);
    
    const summary = screen.getByTestId('team-selection-summary');
    expect(summary).toBeInTheDocument();
    expect(screen.getByText('Count: 1, Max: 16, Min: 2')).toBeInTheDocument();
  });

  it('calls onTeamToggle when team is clicked', async () => {
    const mockOnToggle = vi.fn();
    const props = { ...defaultProps, onTeamToggle: mockOnToggle };
    
    render(<TeamSelectionForm {...props} />);
    
    const teamButton = screen.getByTestId('team-team-1');
    await userEvent.click(teamButton);
    
    expect(mockOnToggle).toHaveBeenCalledWith('team-1');
  });

  it('handles empty teams gracefully', () => {
    const props = {
      ...defaultProps,
      seededTeams: [],
      availableTeamsCount: 0,
      selected: new Set<string>(),
      count: 0
    };
    
    render(<TeamSelectionForm {...props} />);
    
    expect(screen.getByText('Teams: 0')).toBeInTheDocument();
    expect(screen.getByText('Selected: 0')).toBeInTheDocument();
  });

  it('does not show availability count when zero', () => {
    const props = {
      ...defaultProps,
      availableTeamsCount: 0
    };
    
    render(<TeamSelectionForm {...props} />);
    
    expect(screen.getByText('Select teams to continue')).toBeInTheDocument();
    expect(screen.queryByText(/from 0 available/)).not.toBeInTheDocument();
  });
});
