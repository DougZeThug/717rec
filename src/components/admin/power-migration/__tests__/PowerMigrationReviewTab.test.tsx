import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PowerMigrationComparisonRow } from '@/hooks/admin/buildPowerMigrationComparison';

const mockStatus = vi.fn();
const mockComparison = vi.fn();
const mockRevert = vi.fn();
const mockReapply = vi.fn();

vi.mock('@/hooks/admin/usePowerMigrationReview', () => ({
  usePowerMigrationStatus: () => mockStatus(),
  usePowerMigrationComparison: () => mockComparison(),
  useRevertPowerMigration: () => mockRevert(),
  useReapplyPowerMigration: () => mockReapply(),
}));

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));
// The shared Table component reads the seasonal theme, which needs a Router
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ theme: 'light' }),
}));

import PowerMigrationReviewTab from '../PowerMigrationReviewTab';

const queryResult = (overrides: object = {}) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  ...overrides,
});

const mutationResult = (overrides: object = {}) => ({
  mutateAsync: vi.fn().mockResolvedValue('reverted'),
  isPending: false,
  ...overrides,
});

const appliedStatus = {
  status: 'applied' as const,
  backedUpAt: '2026-08-09T12:10:00Z',
  backupSeasonRows: 120,
  backupTeamRows: 30,
  liveSeasonRows: 124,
};

const comparisonRows: PowerMigrationComparisonRow[] = [
  {
    teamId: 'b',
    teamName: 'Bravo',
    divisionName: 'Competitive',
    beforeRank: 2,
    afterRank: 1,
    rankDelta: 1,
    beforeScore: 80,
    afterScore: 85,
    scoreDelta: 5,
    isNewSinceBackup: false,
    perSeason: [
      {
        seasonId: 's1',
        seasonName: 'Season 1',
        beforeWins: 8,
        beforeLosses: 2,
        beforePowerScore: 80,
        afterWins: 8,
        afterLosses: 2,
        afterPowerScore: 85,
      },
    ],
  },
  {
    teamId: 'c',
    teamName: 'Charlie',
    divisionName: 'Recreational',
    beforeRank: null,
    afterRank: 2,
    rankDelta: null,
    beforeScore: null,
    afterScore: 60,
    scoreDelta: null,
    isNewSinceBackup: true,
    perSeason: [],
  },
];

describe('PowerMigrationReviewTab', () => {
  beforeAll(() => {
    // Radix AlertDialog needs pointer-capture APIs jsdom doesn't implement
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockStatus.mockReturnValue(queryResult());
    mockComparison.mockReturnValue(queryResult());
    mockRevert.mockReturnValue(mutationResult());
    mockReapply.mockReturnValue(mutationResult());
  });

  it('shows the friendly not-applied card without an error state', () => {
    mockStatus.mockReturnValue(
      queryResult({
        data: {
          status: 'not_applied',
          backedUpAt: null,
          backupSeasonRows: 0,
          backupTeamRows: 0,
          liveSeasonRows: 0,
        },
      })
    );
    render(<PowerMigrationReviewTab />);
    expect(screen.getByText(/isn't on the live site yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/couldn't/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /revert/i })).not.toBeInTheDocument();
  });

  it('mentions the review tool itself when the controls migration is missing', () => {
    mockStatus.mockReturnValue(
      queryResult({
        data: {
          status: 'controls_missing',
          backedUpAt: null,
          backupSeasonRows: 0,
          backupTeamRows: 0,
          liveSeasonRows: 0,
        },
      })
    );
    render(<PowerMigrationReviewTab />);
    expect(screen.getByText(/including this review tool itself/i)).toBeInTheDocument();
  });

  it('renders the status banner and comparison table when applied', () => {
    mockStatus.mockReturnValue(queryResult({ data: appliedStatus }));
    mockComparison.mockReturnValue(
      queryResult({ data: { backedUpAt: appliedStatus.backedUpAt, rows: comparisonRows } })
    );
    render(<PowerMigrationReviewTab />);

    expect(screen.getByText(/new unified formula is live/i)).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText(/new since backup/i)).toBeInTheDocument();
    // Applied state offers Revert but not Re-apply
    expect(screen.getByRole('button', { name: /revert to old scores/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /re-apply new scores/i })).not.toBeInTheDocument();
  });

  it('runs revert through the confirm dialog', async () => {
    const revertMutation = mutationResult();
    mockStatus.mockReturnValue(queryResult({ data: appliedStatus }));
    mockComparison.mockReturnValue(
      queryResult({ data: { backedUpAt: appliedStatus.backedUpAt, rows: comparisonRows } })
    );
    mockRevert.mockReturnValue(revertMutation);
    render(<PowerMigrationReviewTab />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /revert to old scores/i }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/movers/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^revert$/i }));
    await waitFor(() => expect(revertMutation.mutateAsync).toHaveBeenCalledTimes(1));
  });

  it('offers re-apply when reverted, hiding the old-vs-old comparison', async () => {
    const reapplyMutation = mutationResult({
      mutateAsync: vi.fn().mockResolvedValue('applied'),
    });
    mockStatus.mockReturnValue(
      queryResult({ data: { ...appliedStatus, status: 'reverted' as const } })
    );
    mockReapply.mockReturnValue(reapplyMutation);
    render(<PowerMigrationReviewTab />);

    expect(screen.getByText(/old formula is currently active/i)).toBeInTheDocument();
    // While reverted the live numbers ARE the old formula, so no comparison
    // table — an explanation is shown instead.
    expect(screen.getByText(/nothing new to compare/i)).toBeInTheDocument();
    expect(screen.queryByText(/before vs\. after/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /revert to old scores/i })).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /re-apply new scores/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^re-apply$/i }));
    await waitFor(() => expect(reapplyMutation.mutateAsync).toHaveBeenCalledTimes(1));
  });

  it('disables revert and the comparison once the backup tables are dropped', () => {
    mockStatus.mockReturnValue(
      queryResult({
        data: {
          ...appliedStatus,
          backedUpAt: null,
          backupSeasonRows: 0,
          backupTeamRows: 0,
        },
      })
    );
    render(<PowerMigrationReviewTab />);

    expect(screen.getByText(/new unified formula is live/i)).toBeInTheDocument();
    expect(screen.getByText(/backup is no longer on the database/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /revert to old scores/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/before vs\. after/i)).not.toBeInTheDocument();
  });

  it('expands a team row to the per-season breakdown', async () => {
    mockStatus.mockReturnValue(queryResult({ data: appliedStatus }));
    mockComparison.mockReturnValue(
      queryResult({ data: { backedUpAt: appliedStatus.backedUpAt, rows: comparisonRows } })
    );
    render(<PowerMigrationReviewTab />);

    const user = userEvent.setup();
    expect(screen.queryByText('Season 1')).not.toBeInTheDocument();
    await user.click(screen.getByText('Bravo'));
    expect(await screen.findByText('Season 1')).toBeInTheDocument();
  });
});
