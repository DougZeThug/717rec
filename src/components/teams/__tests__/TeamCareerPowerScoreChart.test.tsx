import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SeasonPowerScoreData } from '@/types/teamCareerPowerScore';

import TeamCareerPowerScoreChart from '../TeamCareerPowerScoreChart';

let isDarkSurface = false;
let isMobile = false;
let query: { data: SeasonPowerScoreData[] | undefined; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};

vi.mock('@/hooks/useIsDarkSurface', () => ({ useIsDarkSurface: () => isDarkSurface }));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => isMobile }));
vi.mock('@/hooks/useTeamCareerPowerScore', () => ({
  useTeamCareerPowerScore: () => query,
}));

/** jsdom has no layout, so the responsive box would collapse to nothing. */
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <actual.ResponsiveContainer width={600} height={300}>
        {children as React.ReactElement}
      </actual.ResponsiveContainer>
    ),
  };
});

const season = (overrides: Partial<SeasonPowerScoreData> = {}): SeasonPowerScoreData => ({
  seasonName: 'Summer 1 2026',
  powerScore: 72,
  playoffRank: null,
  divisionName: 'Competitive',
  isChampion: false,
  isRunnerUp: false,
  isTop3: false,
  ...overrides,
});

describe('TeamCareerPowerScoreChart', () => {
  beforeEach(() => {
    isDarkSurface = false;
    isMobile = false;
    query = { data: [season()], isLoading: false };
  });

  it('shows placeholders while the seasons are still loading', () => {
    query = { data: undefined, isLoading: true };
    const { container } = render(<TeamCareerPowerScoreChart teamId="t1" standalone />);

    // The shared Skeleton primitive, which shimmers rather than pulses.
    expect(container.querySelectorAll('.bg-muted.overflow-hidden').length).toBeGreaterThan(0);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('shows nothing at all for a team with no seasons, rather than an empty chart', () => {
    query = { data: [], isLoading: false };
    const { container } = render(<TeamCareerPowerScoreChart teamId="t1" standalone />);

    expect(container).toBeEmptyDOMElement();
  });

  it('names the three divisions in its key', () => {
    render(<TeamCareerPowerScoreChart teamId="t1" standalone />);

    expect(screen.getByText('Competitive')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Recreational')).toBeInTheDocument();
  });

  it('colours the key differently on a dark page', () => {
    const swatches = (c: HTMLElement) =>
      Array.from(c.querySelectorAll('.size-3.rounded-full')).map(
        (el) => (el as HTMLElement).style.backgroundColor
      );

    const light = render(<TeamCareerPowerScoreChart teamId="t1" standalone />);
    const lightColours = swatches(light.container);
    light.unmount();

    // The winter bug this guards: a dark page used to get the light palette.
    isDarkSurface = true;
    const dark = render(<TeamCareerPowerScoreChart teamId="t1" standalone />);

    expect(swatches(dark.container)).not.toEqual(lightColours);
  });

  it('plots a point for each season that has a score', () => {
    query = {
      data: [season(), season({ seasonName: 'Summer 2 2026', powerScore: 80 })],
      isLoading: false,
    };
    const { container } = render(<TeamCareerPowerScoreChart teamId="t1" standalone />);

    // Two seasons, so two dots on the line.
    expect(container.querySelectorAll('circle[stroke="white"]')).toHaveLength(2);
  });

  it('skips a season the team has no score for, leaving a gap in the line', () => {
    query = {
      data: [season(), season({ seasonName: 'Summer 2 2026', powerScore: null })],
      isLoading: false,
    };
    const { container } = render(<TeamCareerPowerScoreChart teamId="t1" standalone />);

    expect(container.querySelectorAll('circle[stroke="white"]')).toHaveLength(1);
  });

  it('folds itself into a collapsible section when it is not standalone', () => {
    // The section heading reads the route for its seasonal styling.
    render(
      <MemoryRouter>
        <TeamCareerPowerScoreChart teamId="t1" />
      </MemoryRouter>
    );
    expect(screen.getByText('Career Power Score Trend')).toBeInTheDocument();
  });
});
