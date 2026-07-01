import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Team } from '@/types';

// The error/loading/empty branches never render these, so mock them to keep the
// test isolated to TeamList's own branching. ErrorDisplay is kept real so we
// exercise the shared retryable error component end to end.
vi.mock('@/components/teams/TeamCard', () => ({
  default: ({ team }: { team: Team }) => <div>{team.name}</div>,
}));
vi.mock('@/components/teams/TeamListSkeleton', () => ({
  TeamListSkeleton: () => <div>Loading skeleton</div>,
}));
vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

import { TeamList } from '../TeamList';

const renderList = (props: Partial<React.ComponentProps<typeof TeamList>> = {}) =>
  render(
    <TeamList
      teams={[]}
      isLoading={false}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      viewMode="grid"
      {...props}
    />
  );

describe('TeamList error state', () => {
  it('renders a retryable error state when error is set', () => {
    renderList({ error: new Error('boom'), onRetry: vi.fn() });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/couldn't load the teams/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn();
    renderList({ error: new Error('boom'), onRetry });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('prefers the loading skeleton over the error state', () => {
    renderList({ isLoading: true, error: new Error('boom') });
    expect(screen.getByText('Loading skeleton')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the empty state (not an error) when there is no error and no teams', () => {
    renderList();
    expect(screen.getByText('No Teams Found')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
