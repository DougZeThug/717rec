import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRankingsData } from '@/hooks/rankings/useRankingsData';
import { useTeamsQuery } from '@/hooks/teams';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { useTeamMembership } from '@/hooks/useTeamMembership';
import { useTeamRankings } from '@/hooks/useTeamRankings';
import Stats from '@/pages/Stats';
import type { Ranking, Team } from '@/types';

// --- Data layer + shell mocks -------------------------------------------------
vi.mock('@/hooks/useScrollRestoration', () => ({ default: vi.fn() }));
vi.mock('@/components/seo/SeoHead', () => ({ default: () => null }));
vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/winter/WinterSection', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/rankings/useRankingsData', () => ({ useRankingsData: vi.fn() }));
vi.mock('@/hooks/teams', () => ({ useTeamsQuery: vi.fn() }));
vi.mock('@/hooks/useTeamRankings', () => ({ useTeamRankings: vi.fn() }));
vi.mock('@/hooks/useTeamMembership', () => ({ useTeamMembership: vi.fn() }));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: vi.fn(() => ({ isWinterTheme: false })),
  useSeasonalThemeBase: vi.fn(() => ({ isWinterTheme: false })),
}));

// --- Heavy / leaf child stubs (ALLOWED) --------------------------------------
vi.mock('@/components/stats/containers/StatsPageHeader', () => ({
  default: () => <div data-testid="page-header" />,
}));
vi.mock('@/components/stats/containers/FullRankingsSection', () => ({
  default: ({ rankings, myTeamId }: { rankings: Ranking[]; myTeamId: string | null }) => (
    <div data-testid="full-rankings">
      <span>{`myTeamId:${myTeamId ?? 'none'}`}</span>
      <span>{`count:${rankings.length}`}</span>
    </div>
  ),
}));
vi.mock('@/components/stats/containers/StatsChartsSection', () => ({
  default: () => <div data-testid="charts" />,
}));
vi.mock('@/components/stats/career/AllTeamsCareerPowerScoreChart', () => ({
  AllTeamsCareerPowerScoreChart: () => <div />,
}));
vi.mock('@/components/stats/career/CareerRankingsSection', () => ({
  default: () => <div data-testid="career-rankings" />,
}));
vi.mock('@/components/stats/containers/LoadingStateContainer', () => ({
  default: () => <div>stats-loading</div>,
}));
vi.mock('@/components/stats/StatsErrorState', () => ({
  default: () => <div>stats-error</div>,
}));

// --- Factories ----------------------------------------------------------------
const makeTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 't1',
  name: 'Alpha',
  wins: 3,
  losses: 1,
  power_score: 12.5,
  ...overrides,
});

const makeRanking = (overrides: Partial<Ranking> = {}): Ranking => ({
  teamId: 't1',
  teamName: 'Alpha',
  wins: 3,
  losses: 1,
  winPercentage: 0.75,
  gamesWon: 6,
  gamesLost: 2,
  gameWinPercentage: 0.75,
  sos: 0.5,
  powerScore: 12.5,
  headToHead: {},
  closeMatchLosses: 0,
  ...overrides,
});

// --- Defaults -----------------------------------------------------------------
const setRankingsData = (over: Partial<ReturnType<typeof useRankingsData>> = {}) => {
  vi.mocked(useRankingsData).mockReturnValue({
    latestMatches: [],
    matchesLoading: false,
    matchesError: null,
    ...over,
  } as ReturnType<typeof useRankingsData>);
};

const setTeamsQuery = (over: Partial<ReturnType<typeof useTeamsQuery>> = {}) => {
  vi.mocked(useTeamsQuery).mockReturnValue({
    data: [makeTeam()],
    isLoading: false,
    error: null,
    ...over,
  } as ReturnType<typeof useTeamsQuery>);
};

const setTeamRankings = (rankings: Ranking[], isLoading = false) => {
  vi.mocked(useTeamRankings).mockReturnValue({ rankings, isLoading } as ReturnType<
    typeof useTeamRankings
  >);
};

const setMembership = (membership: unknown = null) => {
  vi.mocked(useTeamMembership).mockReturnValue({ membership } as ReturnType<
    typeof useTeamMembership
  >);
};

const renderStats = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Stats />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Stats page', () => {
  beforeEach(() => {
    setRankingsData();
    setTeamsQuery();
    setTeamRankings([makeRanking()]);
    setMembership(null);
    vi.mocked(useSeasonalTheme).mockReturnValue({ isWinterTheme: false } as ReturnType<
      typeof useSeasonalTheme
    >);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the loading state while matches are loading', () => {
    setRankingsData({ matchesLoading: true });
    renderStats();

    expect(screen.getByText('stats-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('full-rankings')).not.toBeInTheDocument();
  });

  it('shows the error state when teams query errors', () => {
    setTeamsQuery({ error: new Error('boom') });
    renderStats();

    expect(screen.getByText('stats-error')).toBeInTheDocument();
    expect(screen.queryByTestId('full-rankings')).not.toBeInTheDocument();
  });

  it('shows the error state when matchesError is set', () => {
    setRankingsData({ matchesError: new Error('matches failed') });
    renderStats();

    expect(screen.getByText('stats-error')).toBeInTheDocument();
  });

  it('renders full rankings and charts when rankings are present', () => {
    setTeamRankings([makeRanking({ teamId: 't1' }), makeRanking({ teamId: 't2' })]);
    renderStats();

    expect(screen.getByTestId('full-rankings')).toBeInTheDocument();
    expect(screen.getByText('count:2')).toBeInTheDocument();
    expect(screen.getByTestId('charts')).toBeInTheDocument();
    expect(screen.queryByText('No Teams Available')).not.toBeInTheDocument();
  });

  it('renders "No Teams Available" when rankings are empty', () => {
    setTeamRankings([]);
    renderStats();

    expect(screen.getByText('No Teams Available')).toBeInTheDocument();
    expect(screen.queryByTestId('full-rankings')).not.toBeInTheDocument();
  });

  it('passes myTeamId through when membership is approved', () => {
    setMembership({ is_approved: true, team_id: 't1' });
    renderStats();

    expect(screen.getByText('myTeamId:t1')).toBeInTheDocument();
  });

  it('passes myTeamId as none when membership is not approved', () => {
    setMembership({ is_approved: false, team_id: 't1' });
    renderStats();

    expect(screen.getByText('myTeamId:none')).toBeInTheDocument();
  });
});
