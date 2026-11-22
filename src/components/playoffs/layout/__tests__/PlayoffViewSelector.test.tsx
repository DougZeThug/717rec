import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { PlayoffPageData } from '../../hooks/usePlayoffPageData';
import type { ViewType } from '../../hooks/useViewSelection';
import { PlayoffViewSelector } from '../PlayoffViewSelector';

vi.mock('@/components/playoffs/views/AdminView', () => ({
  default: () => <div data-testid="admin-view" />,
}));

vi.mock('@/components/playoffs/views/PlayoffView', () => ({
  default: () => <div data-testid="public-view" />,
}));

const renderSelector = (view: ViewType) =>
  render(
    <PlayoffViewSelector
      view={view}
      bracketDialogOpen={false}
      setBracketDialogOpen={vi.fn()}
      onCreateBracket={vi.fn()}
      onDeleteBracket={vi.fn()}
      data={{} as PlayoffPageData}
    />
  );

describe('PlayoffViewSelector', () => {
  it('shows the loading view while the page loads', () => {
    renderSelector('loading');

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('public-view')).not.toBeInTheDocument();
  });

  it('shows the admin view to an admin', () => {
    renderSelector('admin');

    expect(screen.getByTestId('admin-view')).toBeInTheDocument();
    expect(screen.queryByTestId('public-view')).not.toBeInTheDocument();
  });

  it('shows the public view to everyone else', () => {
    renderSelector('public');

    expect(screen.getByTestId('public-view')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-view')).not.toBeInTheDocument();
  });

  it('falls back to the public view for an unknown view, so the Challonge brackets still show', () => {
    renderSelector('unknown' as unknown as ViewType);

    expect(screen.getByTestId('public-view')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-view')).not.toBeInTheDocument();
  });
});
