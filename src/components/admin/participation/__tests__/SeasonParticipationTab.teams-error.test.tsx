import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const fetchTeams = vi.fn();

vi.mock('@/hooks/useSeasons', () => ({
  useSeasons: () => ({
    data: [{ id: 's1', name: 'Fall', is_active: true }],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/useTeams', () => ({
  useTeams: () => ({
    teams: [],
    isLoading: false,
    error: new Error('network down'),
    fetchTeams,
  }),
}));

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));

vi.mock('@/hooks/useSeasonParticipation', () => ({
  useSeasonParticipations: () => ({ data: [], isLoading: false, isError: false }),
}));

import SeasonParticipationTab from '../SeasonParticipationTab';

describe('SeasonParticipationTab when teams do not load', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('shows an error with retry, not an empty league or an empty export', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SeasonParticipationTab />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load teams');
    expect(screen.queryByText('No teams found')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Teams')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Export CSV/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(fetchTeams).toHaveBeenCalledTimes(1);
  });
});
