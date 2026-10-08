import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LeagueInsightsData } from '@/hooks/useLeagueInsights';

const mockUseLeagueInsights = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useLeagueInsights', () => ({
  useLeagueInsights: () => mockUseLeagueInsights(),
}));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
}));
// The cards have their own tests; here only the page layout matters.
vi.mock('../LeagueOverviewCards', () => ({ default: () => <div>overview cards</div> }));
vi.mock('../DivisionStrengthChart', () => ({
  default: ({ divisions }: { divisions: { division: string }[] }) => (
    <div>division chart: {divisions.map((d) => d.division).join(', ')}</div>
  ),
}));
vi.mock('../LeagueParityCard', () => ({
  default: ({ totalTeams }: { totalTeams: number }) => (
    <div>parity card for {totalTeams} teams</div>
  ),
}));
vi.mock('../DivisionMatchupsCard', () => ({ default: () => <div>division matchups</div> }));
vi.mock('../TopPerformersSection', () => ({ default: () => <div>top performers</div> }));

import LeagueInsightsContainer from '../LeagueInsightsContainer';

const data: LeagueInsightsData = {
  overview: {
    totalTeams: 12,
    totalMatches: 40,
    avgPowerScore: 50,
    avgWinPct: 50,
    medianPowerScore: 50,
  },
  divisionStrength: [
    { division: 'Gold', avgPowerScore: 55, teamCount: 6, avgWinPct: 52, avgSos: 0.5 },
  ],
  parity: {
    standardDeviation: 5,
    parityIndex: 80,
    topBottomGap: 20,
    competitiveTeams: 6,
  },
  topPerformers: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
};

describe('LeagueInsightsContainer content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lays out the heading, overview, charts row, matchups and top performers', async () => {
    mockUseLeagueInsights.mockReturnValue(data);
    render(<LeagueInsightsContainer />);

    expect(screen.getByRole('heading', { level: 1, name: 'League Insights' })).toBeInTheDocument();
    expect(screen.getByText('overview cards')).toBeInTheDocument();
    expect(await screen.findByText('division chart: Gold')).toBeInTheDocument();
    expect(screen.getByText('parity card for 12 teams')).toBeInTheDocument();
    expect(screen.getByText('division matchups')).toBeInTheDocument();
    expect(screen.getByText('top performers')).toBeInTheDocument();
  });

  it('leaves the parity card out when there are no parity numbers yet', async () => {
    mockUseLeagueInsights.mockReturnValue({ ...data, parity: null });
    render(<LeagueInsightsContainer />);

    expect(await screen.findByText('division chart: Gold')).toBeInTheDocument();
    expect(screen.queryByText(/parity card/)).not.toBeInTheDocument();
  });
});
