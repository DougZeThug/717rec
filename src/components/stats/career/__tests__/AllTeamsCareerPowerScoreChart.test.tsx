import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TeamCareerData } from '@/hooks/useAllTeamsCareerPowerScores';

import { AllTeamsCareerPowerScoreChart } from '../AllTeamsCareerPowerScoreChart';

let isDarkSurface = false;
let isMobile = false;
let isWinterTheme = false;
let resolvedTheme = 'light';
let query: { data: TeamCareerData[] | undefined; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};

vi.mock('@/hooks/useIsDarkSurface', () => ({ useIsDarkSurface: () => isDarkSurface }));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => isMobile }));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme }),
  useSeasonalTheme: () => ({ isWinterTheme }),
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme }) }));
vi.mock('@/hooks/useAllTeamsCareerPowerScores', () => ({
  useAllTeamsCareerPowerScores: () => query,
}));

/** jsdom has no layout, so the responsive box would collapse to nothing. */
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <actual.ResponsiveContainer width={800} height={400}>
        {children as React.ReactElement}
      </actual.ResponsiveContainer>
    ),
  };
});

/** Radix drives the collapsible and the team picker. */
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();

  // The picker's popover watches its trigger for size changes. jsdom has no
  // layout, so nothing ever resizes and a no-op observer is enough.
  globalThis.ResizeObserver ??= class ResizeObserver {
    /** Starts watching an element; no-op in jsdom tests. */
    observe() {}
    /** Stops watching an element; no-op in jsdom tests. */
    unobserve() {}
    /** Stops watching everything; no-op in jsdom tests. */
    disconnect() {}
  };
});

const teamCareer = (id: string, name: string, scores: Array<number | null>): TeamCareerData => ({
  teamId: id,
  teamName: name,
  divisionName: 'Competitive',
  seasonData: scores.map((powerScore, i) => ({
    seasonName: `Season ${i + 1}`,
    powerScore,
    seasonOrder: i + 1,
  })),
});

const renderChart = () =>
  render(
    <MemoryRouter>
      <AllTeamsCareerPowerScoreChart />
    </MemoryRouter>
  );

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByText('Career Power Score Trends'));
};

describe('AllTeamsCareerPowerScoreChart', () => {
  beforeEach(() => {
    isDarkSurface = false;
    isMobile = false;
    isWinterTheme = false;
    resolvedTheme = 'light';
    query = {
      data: [teamCareer('t1', 'Tigers', [70, 75]), teamCareer('t2', 'Lions', [60, 65])],
      isLoading: false,
    };
  });

  it('shows placeholders while the seasons load', () => {
    query = { data: undefined, isLoading: true };
    const { container } = renderChart();

    expect(container.querySelectorAll('.bg-muted.overflow-hidden').length).toBeGreaterThan(0);
    expect(screen.queryByText('Career Power Score Trends')).not.toBeInTheDocument();
  });

  it('renders nothing when no team has a career yet', () => {
    query = { data: [], isLoading: false };
    const { container } = renderChart();

    expect(container).toBeEmptyDOMElement();
  });

  it('starts collapsed, so the page is not dominated by a chart nobody asked for', () => {
    renderChart();

    expect(screen.getByText('Career Power Score Trends')).toBeInTheDocument();
    expect(
      screen.queryByText('Select teams above to highlight their trends')
    ).not.toBeInTheDocument();
  });

  it('opens to the chart and a prompt to pick teams', async () => {
    const user = userEvent.setup();
    renderChart();

    await open(user);

    expect(screen.getByText('Select teams above to highlight their trends')).toBeInTheDocument();
  });

  it('draws one line per team', async () => {
    const user = userEvent.setup();
    const { container } = renderChart();

    await open(user);

    expect(container.querySelectorAll('.recharts-line').length).toBe(2);
  });

  it('lists every team in the picker, in alphabetical order', async () => {
    const user = userEvent.setup();
    renderChart();

    await open(user);
    await user.click(screen.getByRole('combobox'));

    const options = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(options).toEqual(['Lions', 'Tigers']);
  });

  it('names the highlighted teams underneath, linking each to its page', async () => {
    const user = userEvent.setup();
    renderChart();

    await open(user);
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Tigers' }));

    const link = await screen.findByRole('link', { name: 'Tigers' });
    expect(link).toHaveAttribute('href', '/teams/tigers');
    expect(
      screen.queryByText('Select teams above to highlight their trends')
    ).not.toBeInTheDocument();
  });

  it('keeps its description on a wide screen and drops it on a phone', async () => {
    const wide = renderChart();
    expect(
      screen.getByText('Compare team performance across multiple seasons')
    ).toBeInTheDocument();
    wide.unmount();

    isMobile = true;
    renderChart();
    expect(
      screen.queryByText('Compare team performance across multiple seasons')
    ).not.toBeInTheDocument();
  });

  it('drops the light-theme wash under the winter theme', () => {
    const light = renderChart();
    const lightCard = light.container.querySelector('.border-t-2') as HTMLElement;
    expect(lightCard.className).toContain('border-blue-300');
    light.unmount();

    isWinterTheme = true;
    const winter = renderChart();
    const winterCard = winter.container.querySelector('.border-t-2') as HTMLElement;
    expect(winterCard.className).toContain('border-frost-border/50');
    expect(winterCard.className).not.toContain('border-blue-300');
  });
});
