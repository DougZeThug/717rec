import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TeamSelectionForm } from '../bracket-teams/components/TeamSelectionForm';
import { BracketFormStateResult, ProcessedTeam } from '../bracket-teams/types';

// Helper function to create mock team
const createMockTeam = (overrides: Partial<ProcessedTeam> = {}): ProcessedTeam => ({
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
  powerScore: 95.5,
  sos: 0.65,
  win_percentage: 0.8,
  game_win_percentage: 0.8,
  created_at: new Date().toISOString(),
  close_match_losses: 0,
  ...overrides,
});

// Helper function to create mock form state
const createMockFormState = (
  overrides: Partial<BracketFormStateResult> = {}
): BracketFormStateResult => ({
  selected: new Set(['team-1']),
  selectedArray: ['team-1'],
  count: 1,
  handleTeamToggle: vi.fn(),
  clearSelection: vi.fn(),
  canSelectMore: true,
  isAtMaximum: false,
  hasSelection: true,
  isValid: false,
  isComplete: false,
  hasError: false,
  hasWarning: true,
  errorMessage: null,
  warningMessage: 'Need at least 2 teams',
  statusMessage: 'Select at least 1 more team',
  progress: {
    percentage: 50,
    selected: 1,
    required: 2,
    maximum: 16,
    available: 5,
  },
  cleanup: vi.fn(),
  ...overrides,
});

describe('TeamSelectionForm', () => {
  const mockTeams: ProcessedTeam[] = [createMockTeam()];
  const mockFormState = createMockFormState();

  const defaultProps = {
    teams: mockTeams,
    formState: mockFormState,
    maxTeams: 16,
    minTeams: 2,
  };

  it('renders form header with team count', () => {
    render(<TeamSelectionForm {...defaultProps} />);

    expect(screen.getByText('Select Teams')).toBeInTheDocument();
    expect(screen.getByText('1/16')).toBeInTheDocument();
  });

  it('displays progress bar', () => {
    render(<TeamSelectionForm {...defaultProps} />);

    const progressBar = document.querySelector('[role="progressbar"], [class*="progress"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows status message', () => {
    render(<TeamSelectionForm {...defaultProps} />);

    expect(screen.getByText('Select at least 1 more team')).toBeInTheDocument();
  });

  it('renders available teams section', () => {
    render(<TeamSelectionForm {...defaultProps} />);

    expect(screen.getByText('Available Teams (1)')).toBeInTheDocument();
  });

  it('displays team button with correct info', () => {
    render(<TeamSelectionForm {...defaultProps} />);

    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('96')).toBeInTheDocument(); // Rounded power score
  });

  it('calls handleTeamToggle when team is clicked', async () => {
    const mockToggle = vi.fn();
    const formState = createMockFormState({ handleTeamToggle: mockToggle });

    render(<TeamSelectionForm {...defaultProps} formState={formState} />);

    const teamButton = screen.getByText('Team Alpha').closest('button');
    if (teamButton) {
      await userEvent.click(teamButton);
      expect(mockToggle).toHaveBeenCalledWith('team-1');
    }
  });

  it('shows clear all button when has selection', () => {
    render(<TeamSelectionForm {...defaultProps} />);

    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('shows warning message when present', () => {
    render(<TeamSelectionForm {...defaultProps} />);

    expect(screen.getByText('Need at least 2 teams')).toBeInTheDocument();
  });
});
