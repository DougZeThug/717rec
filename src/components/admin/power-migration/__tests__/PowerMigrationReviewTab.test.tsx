import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchStatus = vi.fn();
const fetchBackupSeasonStats = vi.fn();
const fetchBackupTeamPower = vi.fn();
const revert = vi.fn();
const reapply = vi.fn();
const fetchAllTeamsCareerData = vi.fn();
const useTeamsQuery = vi.fn();

vi.mock('@/services/admin/PowerMigrationService', async (importOriginal) => {
  // Keep the real exported types/interfaces; replace only the service methods.
  const original = await importOriginal<object>();
  return {
    ...original,
    PowerMigrationService: {
      fetchStatus: () => fetchStatus(),
      fetchBackupSeasonStats: () => fetchBackupSeasonStats(),
      fetchBackupTeamPower: () => fetchBackupTeamPower(),
      revert: () => revert(),
      reapply: () => reapply(),
    },
  };
});

vi.mock('@/services/career/CareerBulkFetchService', () => ({
  fetchAllTeamsCareerData: (ids: string[]) => fetchAllTeamsCareerData(ids),
}));

vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: (opts: unknown) => useTeamsQuery(opts),
}));

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));

import PowerMigrationReviewTab from '../PowerMigrationReviewTab';

const appliedStatus = {
  state: 'applied' as const,
  backedUpAt: '2026-08-10T12:00:00Z',
  backupSeasonRows: 2,
  backupPowerRows: 2,
  liveSeasonRows: 2,
};

const teams = [
  { id: 'a', name: 'Alpha', divisionName: 'Competitive', power_score: null, wins: 0, losses: 0 },
  { id: 'b', name: 'Bravo', divisionName: 'Competitive', power_score: null, wins: 0, losses: 0 },
];

const bulk = (powerScore: number) => ({
  teamData: { divisions: { division_weight: 1.0 } },
  seasonStats: [
    {
      match_wins: 6,
      match_losses: 4,
      game_wins: 12,
      game_losses: 8,
      champion: false,
      runner_up: false,
      playoff_rank: null,
      sos: 0.9,
      division_name: 'Competitive',
      power_score: powerScore,
      season_id: 's-1',
      seasons: { name: 'Season 1' },
    },
  ],
  currentMatches: [],
  archivedMatches: [],
  playoffMatches: [],
  teamDivisionMap: new Map(),
  bracketDivisionWeights: {},
  bracketDivisionDisplayNames: {},
  bracketSeasonMap: {},
  teamDivisionWeight: 1.0,
  currentSeasonId: null,
  seasonPowerScores: [
    { power_score: powerScore, match_wins: 6, match_losses: 4, season_id: 's-1' },
  ],
});

const backupSeasonRow = (teamId: string, powerScore: number) => ({
  team_id: teamId,
  season_id: 's-1',
  season_name: 'Season 1',
  match_wins: 5,
  match_losses: 5,
  game_wins: 11,
  game_losses: 9,
  sos: 0.9,
  power_score: powerScore,
  division_name: 'Competitive',
  champion: false,
  runner_up: false,
  playoff_rank: null,
  backed_up_at: '2026-08-10T12:00:00Z',
});

const setupAppliedState = () => {
  fetchStatus.mockResolvedValue(appliedStatus);
  useTeamsQuery.mockReturnValue({ data: teams, isLoading: false, error: null });
  fetchAllTeamsCareerData.mockResolvedValue(
    new Map([
      ['a', bulk(0.4)],
      ['b', bulk(0.6)],
    ])
  );
  fetchBackupSeasonStats.mockResolvedValue([backupSeasonRow('a', 0.8), backupSeasonRow('b', 0.5)]);
  fetchBackupTeamPower.mockResolvedValue([]);
};

const renderTab = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PowerMigrationReviewTab />
    </QueryClientProvider>
  );
};

describe('PowerMigrationReviewTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTeamsQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
  });

  it('shows the friendly not-applied state without an error', async () => {
    fetchStatus.mockResolvedValueOnce({
      state: 'controls_missing',
      backedUpAt: null,
      backupSeasonRows: 0,
      backupPowerRows: 0,
      liveSeasonRows: 0,
    });
    renderTab();
    expect(await screen.findByText(/migration not applied yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/before vs\. after/i)).not.toBeInTheDocument();
  });

  it('renders the comparison table with rank movement when applied', async () => {
    setupAppliedState();
    renderTab();

    expect(await screen.findByText(/new formula is live/i)).toBeInTheDocument();
    // Both teams appear once the (real) comparison builder finishes.
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    // Alpha: 80.0 before → 40.0 after under the fixture numbers.
    expect(screen.getByText('80.0')).toBeInTheDocument();
    expect(screen.getByText('-40.0')).toBeInTheDocument();
  });

  it('runs revert through the confirm dialog', async () => {
    setupAppliedState();
    revert.mockResolvedValueOnce('reverted');
    renderTab();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /revert to old formula/i }));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText(/recalculated with the old formula/i)).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: /^revert$/i }));
    await waitFor(() => expect(revert).toHaveBeenCalledTimes(1));
  });

  it('offers re-apply when the migration is reverted', async () => {
    setupAppliedState();
    fetchStatus.mockResolvedValue({ ...appliedStatus, state: 'reverted' });
    renderTab();
    expect(await screen.findByText(/old formula is live/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /re-apply new formula/i })).toBeInTheDocument();
  });
});
