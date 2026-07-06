import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/teams/TeamListSkeleton', () => ({
  TeamListSkeleton: ({ viewMode }: { viewMode: string }) => (
    <div data-testid="team-list-skeleton" data-view-mode={viewMode} />
  ),
}));

import LoadingStateContainer from '../LoadingStateContainer';

describe('LoadingStateContainer', () => {
  it('renders five standings row placeholders', () => {
    const { container } = render(<LoadingStateContainer />);
    // Each of the 5 row skeletons has the flex row with a bottom border
    const rows = container.querySelectorAll('.border-b');
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  it('renders the team list skeleton in list mode', () => {
    const { getByTestId } = render(<LoadingStateContainer />);
    expect(getByTestId('team-list-skeleton')).toHaveAttribute('data-view-mode', 'list');
  });

  it('renders four summary card placeholders', () => {
    const { container } = render(<LoadingStateContainer />);
    // The summary card grid renders a 2x4 grid with 4 skeleton cards
    const grid = container.querySelector('.grid.grid-cols-2');
    expect(grid).not.toBeNull();
    expect(grid?.children).toHaveLength(4);
  });
});
