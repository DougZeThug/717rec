
import React from 'react';
import { render, screen } from '@testing-library/react';
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
      <span>Teams: {teams.length}</span>
      <span>Selected: {selectedTeamIds.length}</span>
      <button onClick={() => onChange(['team1', 'team2'])}>Select Teams</button>
    </div>
  ),
}));

const mockTeams: Team[] = [
  { id: 'team1', name: 'Team 1', division_id: 'div1' },
  { id: 'team2', name: 'Team 2', division_id: 'div1' },
  { id: 'team3', name: 'Team 3', division_id: 'div2' },
];

const TestWrapper = () => {
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      teams: [],
    },
  });

  return (
    <Form {...form}>
      <form>
        <BracketFormTeams form={form} teams={mockTeams} />
      </form>
    </Form>
  );
};

describe('BracketFormTeams', () => {
  it('renders the teams selection section', () => {
    render(<TestWrapper />);
    
    const teamLabel = screen.getByLabelText(/select teams/i);
    expect(teamLabel).toBeInTheDocument();
  });

  it('passes teams to the TeamSelectionList component', () => {
    render(<TestWrapper />);
    
    const teamSelection = screen.getByTestId('team-selection-list');
    expect(teamSelection).toBeInTheDocument();
    expect(screen.getByText('Teams: 3')).toBeInTheDocument();
  });

  it('displays the maximum teams limit text', () => {
    render(<TestWrapper />);
    
    expect(screen.getByText(/max 16/i)).toBeInTheDocument();
  });
});
