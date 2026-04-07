import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Team } from '@/types';

import BracketForm from '../../BracketForm';

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

// Updated to mock the new BracketFormTeamsContainer component
vi.mock('../bracket-teams/components/BracketFormTeamsContainer', () => ({
  BracketFormTeamsContainer: () => <div data-testid="bracket-form-teams">Teams Component</div>,
}));

vi.mock('../BracketFormGrandFinal', () => ({
  BracketFormGrandFinal: () => <div data-testid="bracket-form-grand-final">Grand Final</div>,
}));

// Polyfill ResizeObserver for jsdom (used by Radix UI internals)
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };

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
    expect(screen.getByTestId('bracket-form-teams')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows create bracket button in disabled state when no teams selected', () => {
    render(
      <BracketForm
        divisions={mockDivisions}
        teams={mockTeams}
        isSubmitting={false}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const createButton = screen.getByText('Create Bracket (0 teams)');
    expect(createButton).toBeInTheDocument();
    expect(createButton).toBeDisabled();
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
