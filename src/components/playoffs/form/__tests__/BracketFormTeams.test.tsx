
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BracketFormTeams } from '../BracketFormTeams';
import { bracketFormSchema, BracketFormValues } from '../BracketFormSchema';
import { Team } from '@/types';

// Mock the TeamSelectionList component since it has its own complex behavior
vi.mock('@/components/playoffs/TeamSelectionList', () => ({
  default: ({ teams, selectedTeamIds, onChange }: any) => (
    <div data-testid="team-selection-list">
      <span>Teams: {teams ? teams.length : 0}</span>
      <span>Selected: {selectedTeamIds ? selectedTeamIds.length : 0}</span>
      <button onClick={() => onChange(['team1', 'team2'])}>Select Teams</button>
    </div>
  ),
}));

const mockTeams: Team[] = [
  { id: 'team1', name: 'Team 1', division_id: 'div1' },
  { id: 'team2', name: 'Team 2', division_id: 'div1' },
  { id: 'team3', name: 'Team 3', division_id: 'div2' },
];

// Test with valid teams
const TestWrapper = ({ teams }: { teams?: Team[] }) => {
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      teams: [],
    },
  });

  return (
    <Form {...form}>
      <form>
        <BracketFormTeams form={form} teams={teams} />
      </form>
    </Form>
  );
};

describe('BracketFormTeams', () => {
  it('renders the teams selection section', () => {
    render(<TestWrapper teams={mockTeams} />);
    
    const teamLabel = screen.getByLabelText(/select teams/i);
    expect(teamLabel).toBeInTheDocument();
  });

  it('passes teams to the TeamSelectionList component', () => {
    render(<TestWrapper teams={mockTeams} />);
    
    const teamSelection = screen.getByTestId('team-selection-list');
    expect(teamSelection).toBeInTheDocument();
    expect(screen.getByText('Teams: 3')).toBeInTheDocument();
  });

  it('handles undefined teams gracefully', () => {
    render(<TestWrapper teams={undefined} />);
    
    const teamSelection = screen.getByTestId('team-selection-list');
    expect(teamSelection).toBeInTheDocument();
    expect(screen.getByText('Teams: 0')).toBeInTheDocument();
  });

  it('displays the maximum teams limit text', () => {
    render(<TestWrapper teams={mockTeams} />);
    
    expect(screen.getByText(/max 16/i)).toBeInTheDocument();
  });
});
