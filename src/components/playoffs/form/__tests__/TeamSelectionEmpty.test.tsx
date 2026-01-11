import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { TeamSelectionEmpty } from '../bracket-teams/components/TeamSelectionEmpty';

describe('TeamSelectionEmpty', () => {
  it('renders empty state message', () => {
    render(<TeamSelectionEmpty />);

    expect(screen.getByText('No Teams Available')).toBeInTheDocument();
  });

  it('displays default description', () => {
    render(<TeamSelectionEmpty />);

    expect(
      screen.getByText(/No teams are currently available for bracket creation/)
    ).toBeInTheDocument();
  });

  it('shows users icon', () => {
    render(<TeamSelectionEmpty />);

    const usersIcon =
      screen.getByTestId('users-icon') || document.querySelector('[data-lucide="users"]');
    expect(usersIcon).toBeInTheDocument();
  });

  it('applies correct styling', () => {
    render(<TeamSelectionEmpty />);

    const card = screen.getByText('No Teams Available').closest('.card, [class*="card"]');
    expect(card).toBeInTheDocument();
  });
});
