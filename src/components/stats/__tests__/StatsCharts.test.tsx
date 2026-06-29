import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockIsMobile = false;
let mockWeeklyData:
  | {
      hasData: boolean;
      trends: Array<{
        teamId: string;
        teamName: string;
        division: string;
        currentScore: number;
        delta: number;
        currentWeek?: number;
        previousWeek?: number;
        logoUrl?: string | null;
      }>;
    }
  | undefined;
let mockWeeklyLoading = false;
let mockSeasonalData:
  | Array<{
      teamId: string;
      teamName: string;
      division: string;
      currentScore: number;
      delta: number;
      logoUrl?: string | null;
    }>
  | undefined;
let mockSeasonalLoading = false;

vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

vi.mock('embla-carousel-react', () => ({
  default: () => [
    vi.fn(),
    { on: vi.fn(), off: vi.fn(), selectedScrollSnap: () => 0, scrollTo: vi.fn() },
  ],
}));

vi.mock('@/components/ui/animated-chart-wrapper', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../WinLossChart', () => ({
  default: ({
    data,
    chartLimit,
    isMobile,
  }: {
    data: Array<{ name: string; wins: number; losses: number }>;
    chartLimit: number;
    isMobile: boolean;
  }) => (
    <div data-testid="win-loss-chart" data-limit={chartLimit} data-mobile={String(isMobile)}>
      {data.map((item) => (
        <span key={item.name}>{`${item.name} ${item.wins}-${item.losses}`}</span>
      ))}
    </div>
  ),
}));

vi.mock('../PowerScoreChart', () => ({
  default: ({ data }: { data: Array<{ name: string; powerScore: number }> }) => (
    <div data-testid="power-score-chart">
      {data.map((item) => (
        <span key={item.name}>{`${item.name} ${item.powerScore}`}</span>
      ))}
    </div>
  ),
}));

vi.mock('@/hooks/useWeeklyPowerScoreTrends', () => ({
  useWeeklyPowerScoreTrends: vi.fn(() => ({ data: mockWeeklyData, isLoading: mockWeeklyLoading })),
}));

vi.mock('@/hooks/usePowerScoreTrends', () => ({
  usePowerScoreTrends: vi.fn(() => ({ data: mockSeasonalData, isLoading: mockSeasonalLoading })),
}));

import { usePowerScoreTrends } from '@/hooks/usePowerScoreTrends';
import { useWeeklyPowerScoreTrends } from '@/hooks/useWeeklyPowerScoreTrends';
import { Ranking } from '@/types';

import StatsCharts from '../StatsCharts';

const ranking = (overrides: Partial<Ranking>): Ranking => ({
  teamId: 'team',
  teamName: 'Team',
  wins: 0,
  losses: 0,
  winPercentage: 0,
  gamesWon: 0,
  gamesLost: 0,
  gameWinPercentage: 0,
  sos: 0,
  powerScore: 0,
  headToHead: {},
  closeMatchLosses: 0,
  ...overrides,
});

const rankings: Ranking[] = [
  ranking({
    teamId: 'alpha',
    teamName: 'Alpha Aces',
    wins: 8,
    losses: 1,
    winPercentage: 0.889,
    powerScore: 91.2,
  }),
  ranking({
    teamId: 'beta',
    teamName: 'Beta Bears',
    wins: 6,
    losses: 3,
    winPercentage: 0.667,
    powerScore: 77.4,
  }),
];

const openCharts = async () => {
  render(<StatsCharts rankings={rankings} chartLimit={mockIsMobile ? 5 : 8} />);
  await userEvent.click(screen.getByText('Performance Charts'));
};

describe('StatsCharts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = false;
    mockWeeklyLoading = false;
    mockSeasonalLoading = false;
    mockWeeklyData = {
      hasData: true,
      trends: [
        {
          teamId: 'alpha',
          teamName: 'Alpha Aces',
          division: 'Premier',
          currentScore: 91.2,
          delta: 4.5,
          currentWeek: 4,
          previousWeek: 3,
        },
      ],
    };
    mockSeasonalData = [
      {
        teamId: 'beta',
        teamName: 'Beta Bears',
        division: 'Classic',
        currentScore: 77.4,
        delta: -2.1,
      },
    ];
  });

  it('shows desktop chart cards with ranking-derived win/loss and power-score data', async () => {
    await openCharts();

    expect(screen.getByText('Visual breakdown of team performance metrics')).toBeInTheDocument();
    expect(screen.getByTestId('win-loss-chart')).toHaveAttribute('data-limit', '8');
    expect(screen.getByTestId('win-loss-chart')).toHaveAttribute('data-mobile', 'false');
    expect(screen.getByText('Alpha Aces 8-1')).toBeInTheDocument();
    expect(screen.getByText('Beta Bears 77.4')).toBeInTheDocument();
    expect(screen.getByText('Week 3 → Week 4 changes')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('+4.5'))).toBeInTheDocument();
  });

  it('uses mobile carousel rendering with dot labels and a smaller chart limit', async () => {
    mockIsMobile = true;
    await openCharts();

    expect(
      screen.queryByText('Visual breakdown of team performance metrics')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('win-loss-chart')).toHaveAttribute('data-limit', '5');
    expect(screen.getByTestId('win-loss-chart')).toHaveAttribute('data-mobile', 'true');
    expect(screen.getByRole('button', { name: 'Win-Loss' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Power Score' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trends' })).toBeInTheDocument();
  });

  it('shows loading and weekly empty states from mocked trend hooks', async () => {
    mockWeeklyLoading = true;
    await openCharts();

    expect(screen.getByText('Loading trends...')).toBeInTheDocument();
    expect(useWeeklyPowerScoreTrends).toHaveBeenCalledWith('up', 10);
    expect(usePowerScoreTrends).toHaveBeenCalledWith('up', 10);
  });

  it('shows the no-snapshots empty state when weekly trend data is absent', async () => {
    mockWeeklyData = { hasData: false, trends: [] };
    await openCharts();

    expect(screen.getByText('No weekly snapshots captured yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Snapshots are captured every Thursday at 11pm EST.')
    ).toBeInTheDocument();
  });

  it('switches direction and seasonal view using trend controls', async () => {
    await openCharts();

    await userEvent.click(screen.getByRole('button', { name: /seasonal/i }));
    expect(screen.getByText('Season-over-season performance changes')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('-2.1'))).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /trending down/i }));
    expect(usePowerScoreTrends).toHaveBeenLastCalledWith('down', 10);
    expect(useWeeklyPowerScoreTrends).toHaveBeenLastCalledWith('down', 10);
  });
});
