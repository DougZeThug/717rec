import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import SeasonAccordionHeader from '../SeasonAccordionHeader';
import type { Season } from '../seasonAccordionTypes';

const season = (overrides: Partial<Season> = {}): Season =>
  ({ id: 's1', name: 'Summer 2 2026', is_active: false, ...overrides }) as Season;

const renderHeader = (props: Partial<React.ComponentProps<typeof SeasonAccordionHeader>> = {}) =>
  render(
    <SeasonAccordionHeader
      season={season()}
      dateRange="Jun – Sep"
      hasChampions={false}
      teamCount={26}
      matchCount={104}
      isLoading={false}
      isWinterTheme={false}
      {...props}
    />
  );

describe('SeasonAccordionHeader', () => {
  it('names the season and its dates', () => {
    renderHeader();

    expect(screen.getByRole('heading', { name: 'Summer 2 2026' })).toBeInTheDocument();
    expect(screen.getByText('Jun – Sep')).toBeInTheDocument();
  });

  it('marks a running season Active', () => {
    renderHeader({ season: season({ is_active: true }) });

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText(/Completed/)).not.toBeInTheDocument();
  });

  it('marks a finished season with a trophy once it has champions', () => {
    renderHeader({ hasChampions: true });

    expect(screen.getByText(/Completed/)).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  // A season that ended without champions recorded gets no pill at all.
  it('shows no pill for a finished season with no champions', () => {
    renderHeader();

    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText(/Completed/)).not.toBeInTheDocument();
  });

  it('reads the counts as one line', () => {
    renderHeader();

    expect(screen.getByText('26 teams · 104 matches')).toBeInTheDocument();
  });

  it('drops the half of the line it has no number for', () => {
    renderHeader({ matchCount: 0 });
    expect(screen.getByText('26 teams')).toBeInTheDocument();
  });

  it('says nothing about counts while they are still loading', () => {
    renderHeader({ isLoading: true });

    expect(screen.queryByText(/teams/)).not.toBeInTheDocument();
  });

  it('says nothing when there is nothing to count', () => {
    renderHeader({ teamCount: 0, matchCount: 0 });

    expect(screen.queryByText(/teams/)).not.toBeInTheDocument();
    expect(screen.queryByText(/matches/)).not.toBeInTheDocument();
  });
});
