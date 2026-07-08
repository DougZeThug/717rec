import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockTeamsQuery = {
  data: [] as { id: string; name: string }[],
  isLoading: false,
  error: null as Error | null,
};
let mockRankingsResult = {
  rankings: [] as Array<{ teamId: string; teamName: string }>,
  isLoading: false,
  refetch: vi.fn(),
};
let mockMembership: { is_approved: boolean; team_id: string } | null = null;

vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: () => mockTeamsQuery,
}));

vi.mock('@/hooks/useTeamRankings', () => ({
  useTeamRankings: vi.fn(() => mockRankingsResult),
}));

vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => ({ membership: mockMembership }),
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

vi.mock('@/components/winter/WinterSection', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <section data-testid="winter-section">{children}</section>
  ),
}));

vi.mock('../FullRankings', () => ({
  default: ({
    rankings,
    myTeamId,
  }: {
    rankings: Array<{ teamId: string; teamName: string }>;
    myTeamId?: string | null;
  }) => (
    <div data-testid="full-rankings" data-count={rankings.length} data-my-team={myTeamId ?? ''}>
      {rankings.map((ranking) => (
        <span key={ranking.teamId}>{ranking.teamName}</span>
      ))}
    </div>
  ),
}));

vi.mock('../containers/StatsPageHeader', () => ({
  default: () => <h1>Stats</h1>,
}));

vi.mock('../StatsCharts', () => ({
  default: ({ rankings, chartLimit }: { rankings: unknown[]; chartLimit: number }) => (
    <div data-testid="stats-charts" data-count={rankings.length} data-chart-limit={chartLimit} />
  ),
}));

vi.mock('../career/AllTeamsCareerPowerScoreChart', () => ({
  AllTeamsCareerPowerScoreChart: () => <div data-testid="career-power-chart" />,
}));

vi.mock('../career/CareerRankingsSection', () => ({
  default: () => <div data-testid="career-rankings-section" />,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

import { useTeamRankings } from '@/hooks/useTeamRankings';

import StatsContainer from '../containers/StatsContainer';

const populatedRankings = [
  { teamId: 'alpha', teamName: 'Alpha Aces' },
  { teamId: 'beta', teamName: 'Beta Bears' },
];

describe('StatsContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsQuery = { data: [], isLoading: false, error: null };
    mockRankingsResult = { rankings: [], isLoading: false };
    mockMembership = null;
  });

  it('renders loading skeletons when teams, matches, or rankings are loading', () => {
    mockTeamsQuery = { data: [], isLoading: true, error: null };

    render(<StatsContainer matches={[]} isLoadingMatches={false} matchesError={null} />);

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(5);
    expect(screen.queryByTestId('full-rankings')).not.toBeInTheDocument();
  });

  it('renders team and match errors instead of stats content', () => {
    mockTeamsQuery = { data: [], isLoading: false, error: new Error('Teams unavailable') };

    render(
      <StatsContainer
        matches={[]}
        isLoadingMatches={false}
        matchesError={new Error('Matches unavailable')}
      />
    );

    expect(screen.getByText(/error loading the statistics data/i)).toBeInTheDocument();
    expect(screen.getByText('Teams unavailable')).toBeInTheDocument();
    expect(screen.getByText('Matches unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('full-rankings')).not.toBeInTheDocument();
  });

  it('renders an empty state when rankings are loaded but no teams are available', () => {
    render(<StatsContainer matches={[]} isLoadingMatches={false} matchesError={null} />);

    expect(screen.getByText('No Teams Available')).toBeInTheDocument();
    expect(screen.getByText(/Try selecting a different division/i)).toBeInTheDocument();
  });

  it('renders rankings, charts, and career sections for populated rankings', async () => {
    mockRankingsResult = { rankings: populatedRankings, isLoading: false };
    mockMembership = { is_approved: true, team_id: 'alpha' };

    render(<StatsContainer matches={[]} isLoadingMatches={false} matchesError={null} />);

    expect(screen.getByTestId('full-rankings')).toHaveAttribute('data-count', '2');
    expect(screen.getByTestId('full-rankings')).toHaveAttribute('data-my-team', 'alpha');
    expect(screen.getByTestId('stats-charts')).toHaveAttribute('data-count', '2');
    await waitFor(() => expect(screen.getByTestId('career-power-chart')).toBeInTheDocument());
    expect(screen.getByTestId('career-rankings-section')).toBeInTheDocument();
  });

  it('passes teams and matches into useTeamRankings and withholds unapproved membership team id', () => {
    const teams = [{ id: 'team-1', name: 'Team One' }];
    const matches = [{ id: 'match-1' }];
    mockTeamsQuery = { data: teams, isLoading: false, error: null };
    mockRankingsResult = { rankings: populatedRankings, isLoading: false };
    mockMembership = { is_approved: false, team_id: 'alpha' };

    render(
      <StatsContainer matches={matches as never} isLoadingMatches={false} matchesError={null} />
    );

    expect(useTeamRankings).toHaveBeenCalledWith(teams, matches);
    expect(screen.getByTestId('full-rankings')).toHaveAttribute('data-my-team', '');
  });
});
