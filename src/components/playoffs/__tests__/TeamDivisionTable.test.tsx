import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { Team } from '@/types';

import TeamDivisionTable from '../TeamDivisionTable';

const competitive: Team = { id: 't1', name: 'Alpha', divisionName: 'Competitive' };
const recreational: Team = { id: 't2', name: 'Bravo', divisionName: 'Recreational' };

describe('TeamDivisionTable', () => {
  it('keeps the selected division tab when the divisions data reloads', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TeamDivisionTable
        divisions={['Competitive', 'Recreational']}
        teams={[competitive, recreational]}
        isLoading={false}
      />,
      { wrapper: MemoryRouter }
    );

    await user.click(screen.getByRole('tab', { name: /recreational/i }));
    expect(screen.getByRole('tab', { name: /recreational/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // A refetch hands down a brand-new array with identical contents. The tab
    // selection should survive instead of snapping back to "All Teams".
    rerender(
      <TeamDivisionTable
        divisions={['Competitive', 'Recreational']}
        teams={[competitive, recreational]}
        isLoading={false}
      />
    );

    expect(screen.getByRole('tab', { name: /recreational/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('falls back to the "All Teams" tab when the selected division disappears', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TeamDivisionTable
        divisions={['Competitive', 'Recreational']}
        teams={[competitive, recreational]}
        isLoading={false}
      />,
      { wrapper: MemoryRouter }
    );

    await user.click(screen.getByRole('tab', { name: /recreational/i }));
    expect(screen.getByRole('tab', { name: /recreational/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // The Recreational division (and its only team) is removed. With no matching
    // tab left, the table should show "All Teams" rather than a blank panel.
    rerender(
      <TeamDivisionTable divisions={['Competitive']} teams={[competitive]} isLoading={false} />
    );

    expect(screen.queryByRole('tab', { name: /recreational/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /all teams/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
