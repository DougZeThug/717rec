
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import BracketForm from '../../BracketForm';
import { Team } from '@/types';

// Mock the useBracketForm hook
vi.mock('../useBracketForm', () => ({
  useBracketForm: ({ teams, onSubmit }: any) => ({
    form: {
      control: {},
      handleSubmit: (cb: any) => (e: any) => {
        e.preventDefault();
        cb({ title: 'Test Tournament', divisionId: 'div1', format: 'Single Elimination', teams: ['team1', 'team2'] });
      },
      setValue: vi.fn(),
    },
    filteredTeams: teams.slice(0, 2),
    handleDivisionChange: vi.fn(),
    handleSubmit: (e: any) => {
      e.preventDefault();
      onSubmit({ title: 'Test Tournament', divisionId: 'div1', format: 'Single Elimination', teams: ['team1', 'team2'] });
    },
  }),
}));

// Mock the form components
vi.mock('../BracketFormTitle', () => ({
  BracketFormTitle: () => <div data-testid="bracket-form-title">Title Component</div>,
}));

vi.mock('../BracketFormDivision', () => ({
  BracketFormDivision: () => <div data-testid="bracket-form-division">Division Component</div>,
}));

vi.mock('../BracketFormFormat', () => ({
  BracketFormFormat: () => <div data-testid="bracket-form-format">Format Component</div>,
}));

vi.mock('../BracketFormChallonge', () => ({
  BracketFormChallonge: () => <div data-testid="bracket-form-challonge">Challonge Component</div>,
}));

// Updated to mock the new BracketFormTeamsContainer component
vi.mock('../bracket-teams/components/BracketFormTeamsContainer', () => ({
  BracketFormTeamsContainer: () => <div data-testid="bracket-form-teams">Teams Component</div>,
}));

vi.mock('../BracketFormActions', () => ({
  BracketFormActions: ({ onCancel }: any) => (
    <div data-testid="bracket-form-actions">
      <button onClick={onCancel}>Cancel</button>
      <button type="submit">Submit</button>
    </div>
  ),
}));

const mockDivisions = [
  { id: 'div1', name: 'Division 1' },
  { id: 'div2', name: 'Division 2' },
];

const mockTeams: Team[] = [
  { id: 'team1', name: 'Team 1', division_id: 'div1' },
  { id: 'team2', name: 'Team 2', division_id: 'div1' },
  { id: 'team3', name: 'Team 3', division_id: 'div2' },
];

describe('BracketForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form sections', () => {
    render(
      <BracketForm 
        divisions={mockDivisions} 
        teams={mockTeams}
        isSubmitting={false}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByTestId('bracket-form-title')).toBeInTheDocument();
    expect(screen.getByTestId('bracket-form-division')).toBeInTheDocument();
    expect(screen.getByTestId('bracket-form-format')).toBeInTheDocument();
    expect(screen.getByTestId('bracket-form-challonge')).toBeInTheDocument();
    expect(screen.getByTestId('bracket-form-teams')).toBeInTheDocument();
    expect(screen.getByTestId('bracket-form-actions')).toBeInTheDocument();
  });

  it('submits the form with correct data', async () => {
    render(
      <BracketForm 
        divisions={mockDivisions} 
        teams={mockTeams}
        isSubmitting={false}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    
    const user = userEvent.setup();
    const submitButton = screen.getByText('Submit');
    
    await user.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Test Tournament',
      divisionId: 'div1',
      format: 'Single Elimination',
      teams: ['team1', 'team2']
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    render(
      <BracketForm 
        divisions={mockDivisions} 
        teams={mockTeams}
        isSubmitting={false}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    
    const user = userEvent.setup();
    const cancelButton = screen.getByText('Cancel');
    
    await user.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
