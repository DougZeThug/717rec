
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BracketForm from '../../BracketForm';
import { Team } from '@/types';

// Mock the useBracketForm hook
jest.mock('../useBracketForm', () => ({
  useBracketForm: ({ teams, onSubmit }: any) => ({
    form: {
      control: {},
      handleSubmit: (cb: any) => (e: any) => {
        e.preventDefault();
        cb({ title: 'Test Tournament', divisionId: 'div1', format: 'Single Elimination', teams: ['team1', 'team2'] });
      },
      setValue: jest.fn(),
    },
    filteredTeams: teams.slice(0, 2),
    handleDivisionChange: jest.fn(),
    handleSubmit: (e: any) => {
      e.preventDefault();
      onSubmit({ title: 'Test Tournament', divisionId: 'div1', format: 'Single Elimination', teams: ['team1', 'team2'] });
    },
  }),
}));

// Mock the form components
jest.mock('../BracketFormTitle', () => ({
  BracketFormTitle: () => <div data-testid="bracket-form-title">Title Component</div>,
}));

jest.mock('../BracketFormDivision', () => ({
  BracketFormDivision: () => <div data-testid="bracket-form-division">Division Component</div>,
}));

jest.mock('../BracketFormFormat', () => ({
  BracketFormFormat: () => <div data-testid="bracket-form-format">Format Component</div>,
}));

jest.mock('../BracketFormChallonge', () => ({
  BracketFormChallonge: () => <div data-testid="bracket-form-challonge">Challonge Component</div>,
}));

jest.mock('../BracketFormTeams', () => ({
  BracketFormTeams: () => <div data-testid="bracket-form-teams">Teams Component</div>,
}));

jest.mock('../BracketFormActions', () => ({
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
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
