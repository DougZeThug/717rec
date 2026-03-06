import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { TeamSelectionEmpty } from '../bracket-teams/components/TeamSelectionEmpty';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('TeamSelectionEmpty', () => {
  it('renders empty state message', () => {
    renderWithRouter(<TeamSelectionEmpty />);

    expect(screen.getByText('No Teams Available')).toBeInTheDocument();
  });

  it('displays default description', () => {
    renderWithRouter(<TeamSelectionEmpty />);

    expect(
      screen.getByText(/No teams are currently available for bracket creation/)
    ).toBeInTheDocument();
  });

  it('shows users icon', () => {
    renderWithRouter(<TeamSelectionEmpty />);

    const usersIcon =
      screen.queryByTestId('users-icon') ?? document.querySelector('[data-lucide="users"]') ?? document.querySelector('svg');
    expect(usersIcon).toBeInTheDocument();
  });

  it('applies correct styling', () => {
    renderWithRouter(<TeamSelectionEmpty />);

    const card = screen.getByText('No Teams Available').closest('[class*="border"]');
    expect(card).toBeInTheDocument();
  });
});
