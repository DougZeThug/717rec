import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ shouldApplyWinter: false }),
}));
vi.mock('@/hooks/useTeamBadges', () => ({
  useAllTeamBadges: () => ({ data: undefined }),
}));

import TopTeams from '../TopTeams';

const renderTopTeams = (props: Partial<React.ComponentProps<typeof TopTeams>> = {}) =>
  render(
    <MemoryRouter>
      <TopTeams teams={[]} {...props} />
    </MemoryRouter>
  );

describe('TopTeams error state', () => {
  it('renders a retryable error state when error is set', () => {
    renderTopTeams({ error: new Error('boom'), onRetry: vi.fn() });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/couldn't load the top teams/i)).toBeInTheDocument();
    // Should not fall through to the "no teams ranked" empty state.
    expect(screen.queryByText('No Teams Ranked Yet')).not.toBeInTheDocument();
  });

  it('calls onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn();
    renderTopTeams({ error: new Error('boom'), onRetry });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state (not an error) when there is no error and no teams', () => {
    renderTopTeams();
    expect(screen.getByText('No Teams Ranked Yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
